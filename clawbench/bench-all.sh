#!/bin/bash
# ClawBench Batch Runner
# Benches all working forks across all non-cloud devices.
# Results saved to clawbench/results/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DB_PATH="$PROJECT_DIR/data/openclaw.db"
RESULTS_DIR="$SCRIPT_DIR/results"
SUMMARY_FILE="$RESULTS_DIR/summary.json"
DOCKER_IMAGE="clawbench:latest"

mkdir -p "$RESULTS_DIR"

# Build Docker image
if ! docker image inspect "$DOCKER_IMAGE" &>/dev/null; then
  echo "[Batch] Building Docker image..."
  docker build -t "$DOCKER_IMAGE" "$SCRIPT_DIR"
fi

# Get all working forks (repos that exist)
FORKS=$(sqlite3 "$DB_PATH" "
  SELECT slug, github_url, language FROM forks
  WHERE github_url LIKE 'https://github.com/%'
  AND slug IN ('openclaw','nanoclaw','nanobot','picoclaw','moltworker')
  ORDER BY slug
")

# Get all non-cloud devices
DEVICES=$(sqlite3 "$DB_PATH" "
  SELECT slug, ram_gb, cpu, name FROM devices
  WHERE category NOT IN ('Cloud')
  ORDER BY ram_gb
")

FORK_COUNT=$(echo "$FORKS" | wc -l | tr -d ' ')
DEVICE_COUNT=$(echo "$DEVICES" | wc -l | tr -d ' ')
TOTAL=$((FORK_COUNT * DEVICE_COUNT))

echo "=========================================="
echo "  ClawBench Batch Run"
echo "=========================================="
echo "  Forks:   $FORK_COUNT"
echo "  Devices: $DEVICE_COUNT"
echo "  Total:   $TOTAL benchmarks"
echo "=========================================="
echo ""

COMPLETED=0
FAILED=0
SKIPPED=0

# For each fork, run against all devices
echo "$FORKS" | while IFS='|' read -r FORK_SLUG FORK_REPO FORK_LANG; do
  echo ""
  echo "=== Fork: $FORK_SLUG ($FORK_LANG) ==="
  echo ""

  echo "$DEVICES" | while IFS='|' read -r DEV_SLUG RAM_GB DEV_CPU DEV_NAME; do
    RESULT_FILE="$RESULTS_DIR/${DEV_SLUG}_${FORK_SLUG}.json"

    # Skip if already benchmarked
    if [ -f "$RESULT_FILE" ]; then
      SKIPPED=$((SKIPPED + 1))
      echo "  [SKIP] $DEV_SLUG (already done)"
      continue
    fi

    # Convert RAM to MB
    RAM_MB=$(awk "BEGIN {printf \"%d\", $RAM_GB * 1024}")
    [ "$RAM_MB" -lt 32 ] && RAM_MB=32

    # Determine CPU cores
    CPU_CORES=1
    case "$DEV_CPU" in
      *"M1"*|*"M2"*|*"M3"*|*"M4"*) CPU_CORES=4 ;;
      *"Ryzen"*|*"Core i7"*|*"Core i5"*|*"Xeon"*) CPU_CORES=4 ;;
      *"A76"*|*"A72"*) CPU_CORES=4 ;;
      *"A55"*|*"A53"*) CPU_CORES=2 ;;
      *"8-core"*|*"8 core"*) CPU_CORES=4 ;;
      *"4-core"*|*"4 core"*|*"Quad"*) CPU_CORES=2 ;;
      *"12-core"*|*"14-core"*|*"16-core"*) CPU_CORES=8 ;;
    esac

    echo -n "  [$DEV_SLUG] ${RAM_MB}MB/${CPU_CORES}cpu ... "

    # Run benchmark with timeout
    OUTPUT=$(timeout 180 docker run --rm \
      --memory="${RAM_MB}m" \
      --cpus="${CPU_CORES}" \
      -e "FORK_REPO=${FORK_REPO}" \
      -e "FORK_LANG=${FORK_LANG}" \
      -e "DEVICE_SLUG=${DEV_SLUG}" \
      -e "FORK_SLUG=${FORK_SLUG}" \
      -e "MEMORY_LIMIT=${RAM_MB}" \
      -e "CPU_LIMIT=${CPU_CORES}" \
      "$DOCKER_IMAGE" 2>&1) || true

    JSON=$(echo "$OUTPUT" | grep "^{" | tail -1)

    if [ -n "$JSON" ]; then
      echo "$JSON" | python3 -m json.tool > "$RESULT_FILE" 2>/dev/null || echo "$JSON" > "$RESULT_FILE"
      SCORE=$(python3 -c "import json; print(json.loads('$JSON').get('overall_score','?'))" 2>/dev/null || echo "?")
      echo "score=$SCORE"
      COMPLETED=$((COMPLETED + 1))
    else
      # Check if OOM or timeout
      if echo "$OUTPUT" | grep -qi "killed\|oom\|out of memory"; then
        echo '{"error":"oom","device_slug":"'"$DEV_SLUG"'","fork_slug":"'"$FORK_SLUG"'"}' > "$RESULT_FILE"
        echo "OOM"
      elif echo "$OUTPUT" | grep -qi "clone_failed"; then
        echo '{"error":"clone_failed","device_slug":"'"$DEV_SLUG"'","fork_slug":"'"$FORK_SLUG"'"}' > "$RESULT_FILE"
        echo "CLONE_FAILED"
      else
        echo '{"error":"unknown","device_slug":"'"$DEV_SLUG"'","fork_slug":"'"$FORK_SLUG"'"}' > "$RESULT_FILE"
        echo "FAILED"
      fi
      FAILED=$((FAILED + 1))
    fi
  done
done

echo ""
echo "=========================================="
echo "  Batch Complete"
echo "=========================================="
echo "  Results in: $RESULTS_DIR/"
echo "=========================================="
