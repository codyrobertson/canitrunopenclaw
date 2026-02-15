#!/bin/bash
# ClawBench Batch Runner
# Runs ./run.sh for each device x fork combo (non-cloud devices, local forks only).
# Skips already-completed benchmarks. Results in clawbench/results/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DB_PATH="$PROJECT_DIR/data/openclaw.db"
RESULTS_DIR="$SCRIPT_DIR/results"

mkdir -p "$RESULTS_DIR"

# Only local forks (min_ram > 0) with valid repos
FORKS=$(sqlite3 "$DB_PATH" "
  SELECT slug FROM forks
  WHERE min_ram_mb > 0
  AND github_url LIKE 'https://github.com/%'
  AND slug IN ('openclaw','nanoclaw','nanobot','picoclaw')
  ORDER BY min_ram_mb
")

# Non-cloud devices ordered by RAM
DEVICES=$(sqlite3 "$DB_PATH" "
  SELECT slug FROM devices
  WHERE category NOT IN ('Cloud')
  ORDER BY ram_gb
")

FORK_COUNT=$(echo "$FORKS" | wc -l | tr -d ' ')
DEVICE_COUNT=$(echo "$DEVICES" | wc -l | tr -d ' ')

echo "=========================================="
echo "  ClawBench Batch"
echo "=========================================="
echo "  Local forks: $FORK_COUNT"
echo "  Devices:     $DEVICE_COUNT"
echo "  Max combos:  $((FORK_COUNT * DEVICE_COUNT))"
echo "=========================================="
echo ""

COMPLETED=0
SKIPPED=0
FAILED=0

for FORK_SLUG in $FORKS; do
  echo ""
  echo "=== $FORK_SLUG ==="

  for DEV_SLUG in $DEVICES; do
    RESULT_FILE="$RESULTS_DIR/${DEV_SLUG}_${FORK_SLUG}.json"

    if [ -f "$RESULT_FILE" ]; then
      echo "  [skip] $DEV_SLUG"
      SKIPPED=$((SKIPPED + 1))
      continue
    fi

    # Run the full simulation via run.sh
    OUTPUT=$("$SCRIPT_DIR/run.sh" "$DEV_SLUG" "$FORK_SLUG" 2>&1) || true

    # Check outcome — run.sh saves JSON to results file, check that
    if [ -f "$RESULT_FILE" ]; then
      SCORE=$(python3 -c "import json; print(json.load(open('$RESULT_FILE')).get('overall_score','?'))" 2>/dev/null || echo "?")
      echo "  [done] $DEV_SLUG  score=$SCORE"
      COMPLETED=$((COMPLETED + 1))
    elif echo "$OUTPUT" | grep -q '"insufficient_resources"'; then
      echo "  [fail] $DEV_SLUG  insufficient RAM"
      FAILED=$((FAILED + 1))
    elif echo "$OUTPUT" | grep -qi 'oom\|killed\|out of memory'; then
      echo "  [oom]  $DEV_SLUG"
      FAILED=$((FAILED + 1))
    elif echo "$OUTPUT" | grep -q '"not_applicable"'; then
      echo "  [n/a]  $DEV_SLUG  (serverless fork)"
      SKIPPED=$((SKIPPED + 1))
    else
      echo "  [err]  $DEV_SLUG"
      echo "$OUTPUT" | tail -3
      FAILED=$((FAILED + 1))
    fi
  done
done

echo ""
echo "=========================================="
echo "  Done"
echo "=========================================="
echo "  Completed: $COMPLETED"
echo "  Skipped:   $SKIPPED"
echo "  Failed:    $FAILED"
echo "  Results:   $RESULTS_DIR/"
echo "=========================================="
