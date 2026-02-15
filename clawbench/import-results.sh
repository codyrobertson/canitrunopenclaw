#!/bin/bash
# Import ClawBench JSON results into the SQLite database
# Reads all JSON files from clawbench/results/ and:
#   1. Creates benchmark_runs
#   2. Inserts benchmark_results (latency, capabilities, resources)
#   3. Updates compatibility_verdicts with benchmark-derived verdicts
#
# Usage: ./clawbench/import-results.sh [--dry-run]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DB_PATH="$PROJECT_DIR/data/openclaw.db"
RESULTS_DIR="$SCRIPT_DIR/results"
DRY_RUN=false

[ "${1:-}" = "--dry-run" ] && DRY_RUN=true

[ -f "$DB_PATH" ] || { echo "ERROR: DB not found at $DB_PATH"; exit 1; }
[ -d "$RESULTS_DIR" ] || { echo "ERROR: No results directory at $RESULTS_DIR"; exit 1; }
command -v python3 &>/dev/null || { echo "ERROR: python3 required"; exit 1; }
command -v sqlite3 &>/dev/null || { echo "ERROR: sqlite3 required"; exit 1; }

IMPORTED=0
SKIPPED=0
FAILED=0
UPDATED_VERDICTS=0

echo "=========================================="
echo "  ClawBench Import"
echo "=========================================="
echo "  Results dir: $RESULTS_DIR"
echo "  Database:    $DB_PATH"
echo "  Dry run:     $DRY_RUN"
echo "=========================================="
echo ""

for JSON_FILE in "$RESULTS_DIR"/*.json; do
  [ -f "$JSON_FILE" ] || continue
  FILENAME=$(basename "$JSON_FILE")

  # Parse the JSON
  PARSED=$(python3 -c "
import json, sys
try:
    d = json.load(open('$JSON_FILE'))
    # Skip non-benchmark results (oom, insufficient_resources, not_applicable)
    if 'result' in d and d['result'] != 'benchmark':
        print('SKIP')
        sys.exit(0)
    if 'overall_score' not in d:
        print('SKIP')
        sys.exit(0)

    r = d['results']
    lat = r.get('latency', {})
    caps = r.get('capabilities', {})
    size = r.get('size', {})
    res = r.get('resources', {})
    dc = d.get('docker_constraints', {})

    print(d['device_slug'])
    print(d['fork_slug'])
    print(lat.get('cold_start_ms', 0))
    print(lat.get('clone_ms', 0))
    print(lat.get('install_ms', 0))
    print(lat.get('startup_ms', 0))
    print(1 if lat.get('startup_ok', False) else 0)
    print(1 if caps.get('messaging', False) else 0)
    print(1 if caps.get('browser_automation', False) else 0)
    print(1 if caps.get('code_execution', False) else 0)
    print(1 if caps.get('persistent_memory', False) else 0)
    print(1 if caps.get('file_management', False) else 0)
    print(1 if caps.get('web_search', False) else 0)
    print(1 if caps.get('mcp', False) else 0)
    print(1 if caps.get('tool_use', False) else 0)
    print(caps.get('passed', 0))
    print(caps.get('total', 8))
    print(size.get('disk_mb', 0))
    print(size.get('source_lines', 0))
    print(res.get('peak_memory_mb', 0))
    print(dc.get('memory_limit_mb', 0))
    print(dc.get('cpu_limit', 0))
    print(d.get('overall_score', 0))
    print(d.get('entry_point', ''))
except Exception as e:
    print(f'ERROR:{e}')
    sys.exit(1)
" 2>/dev/null) || { echo "  [err]  $FILENAME  (parse failed)"; FAILED=$((FAILED + 1)); continue; }

  # Check for skip
  if [ "$PARSED" = "SKIP" ]; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Check for error
  if echo "$PARSED" | head -1 | grep -q "^ERROR:"; then
    echo "  [err]  $FILENAME  ($PARSED)"
    FAILED=$((FAILED + 1))
    continue
  fi

  # Read parsed values
  DEVICE_SLUG=$(echo "$PARSED" | sed -n '1p')
  FORK_SLUG=$(echo "$PARSED" | sed -n '2p')
  COLD_START_MS=$(echo "$PARSED" | sed -n '3p')
  CLONE_MS=$(echo "$PARSED" | sed -n '4p')
  INSTALL_MS=$(echo "$PARSED" | sed -n '5p')
  STARTUP_MS=$(echo "$PARSED" | sed -n '6p')
  STARTUP_OK=$(echo "$PARSED" | sed -n '7p')
  CAP_MESSAGING=$(echo "$PARSED" | sed -n '8p')
  CAP_BROWSER=$(echo "$PARSED" | sed -n '9p')
  CAP_CODE_EXEC=$(echo "$PARSED" | sed -n '10p')
  CAP_MEMORY=$(echo "$PARSED" | sed -n '11p')
  CAP_FILES=$(echo "$PARSED" | sed -n '12p')
  CAP_SEARCH=$(echo "$PARSED" | sed -n '13p')
  CAP_MCP=$(echo "$PARSED" | sed -n '14p')
  CAP_TOOLS=$(echo "$PARSED" | sed -n '15p')
  CAP_PASSED=$(echo "$PARSED" | sed -n '16p')
  CAP_TOTAL=$(echo "$PARSED" | sed -n '17p')
  DISK_MB=$(echo "$PARSED" | sed -n '18p')
  SOURCE_LINES=$(echo "$PARSED" | sed -n '19p')
  PEAK_MEMORY_MB=$(echo "$PARSED" | sed -n '20p')
  MEMORY_LIMIT_MB=$(echo "$PARSED" | sed -n '21p')
  CPU_LIMIT=$(echo "$PARSED" | sed -n '22p')
  OVERALL_SCORE=$(echo "$PARSED" | sed -n '23p')
  ENTRY_POINT=$(echo "$PARSED" | sed -n '24p')

  # Look up device and fork IDs
  DEVICE_ID=$(sqlite3 "$DB_PATH" "SELECT id FROM devices WHERE slug = '$DEVICE_SLUG'")
  FORK_ID=$(sqlite3 "$DB_PATH" "SELECT id FROM forks WHERE slug = '$FORK_SLUG'")

  if [ -z "$DEVICE_ID" ]; then
    echo "  [err]  $FILENAME  (device '$DEVICE_SLUG' not in DB)"
    FAILED=$((FAILED + 1))
    continue
  fi
  if [ -z "$FORK_ID" ]; then
    echo "  [err]  $FILENAME  (fork '$FORK_SLUG' not in DB)"
    FAILED=$((FAILED + 1))
    continue
  fi

  # Check if already imported (has a completed benchmark run for this combo)
  EXISTING=$(sqlite3 "$DB_PATH" "SELECT id FROM benchmark_runs WHERE device_id = $DEVICE_ID AND fork_id = $FORK_ID AND status = 'completed' LIMIT 1")
  if [ -n "$EXISTING" ]; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  if [ "$DRY_RUN" = "true" ]; then
    echo "  [dry]  $DEVICE_SLUG + $FORK_SLUG  score=$OVERALL_SCORE"
    IMPORTED=$((IMPORTED + 1))
    continue
  fi

  # Read raw JSON for storage
  RAW_JSON=$(cat "$JSON_FILE" | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)))" 2>/dev/null || cat "$JSON_FILE")
  # Escape single quotes for SQL
  RAW_JSON_ESC=$(echo "$RAW_JSON" | sed "s/'/''/g")

  # Insert benchmark run + results in a transaction
  sqlite3 "$DB_PATH" <<SQL
BEGIN TRANSACTION;

-- Create benchmark run
INSERT INTO benchmark_runs (device_id, fork_id, user_id, status, docker_image, memory_limit_mb, cpu_limit, completed_at, raw_json)
VALUES ($DEVICE_ID, $FORK_ID, NULL, 'completed', 'clawbench:latest', $MEMORY_LIMIT_MB, $CPU_LIMIT, datetime('now'), '$RAW_JSON_ESC');

-- Get the run ID
-- SQLite: last_insert_rowid() works within the same connection

-- Insert latency metrics
INSERT INTO benchmark_results (run_id, metric, value, unit, category) VALUES (last_insert_rowid(), 'cold_start', $COLD_START_MS, 'ms', 'latency');
INSERT INTO benchmark_results (run_id, metric, value, unit, category) VALUES ((SELECT MAX(id) FROM benchmark_runs), 'clone_time', $CLONE_MS, 'ms', 'latency');
INSERT INTO benchmark_results (run_id, metric, value, unit, category) VALUES ((SELECT MAX(id) FROM benchmark_runs), 'install_time', $INSTALL_MS, 'ms', 'latency');
INSERT INTO benchmark_results (run_id, metric, value, unit, category) VALUES ((SELECT MAX(id) FROM benchmark_runs), 'startup_time', $STARTUP_MS, 'ms', 'latency');

-- Insert capability metrics
INSERT INTO benchmark_results (run_id, metric, value, unit, category) VALUES ((SELECT MAX(id) FROM benchmark_runs), 'messaging', $CAP_MESSAGING, 'bool', 'capability');
INSERT INTO benchmark_results (run_id, metric, value, unit, category) VALUES ((SELECT MAX(id) FROM benchmark_runs), 'browser_automation', $CAP_BROWSER, 'bool', 'capability');
INSERT INTO benchmark_results (run_id, metric, value, unit, category) VALUES ((SELECT MAX(id) FROM benchmark_runs), 'code_execution', $CAP_CODE_EXEC, 'bool', 'capability');
INSERT INTO benchmark_results (run_id, metric, value, unit, category) VALUES ((SELECT MAX(id) FROM benchmark_runs), 'persistent_memory', $CAP_MEMORY, 'bool', 'capability');
INSERT INTO benchmark_results (run_id, metric, value, unit, category) VALUES ((SELECT MAX(id) FROM benchmark_runs), 'file_management', $CAP_FILES, 'bool', 'capability');
INSERT INTO benchmark_results (run_id, metric, value, unit, category) VALUES ((SELECT MAX(id) FROM benchmark_runs), 'web_search', $CAP_SEARCH, 'bool', 'capability');
INSERT INTO benchmark_results (run_id, metric, value, unit, category) VALUES ((SELECT MAX(id) FROM benchmark_runs), 'mcp', $CAP_MCP, 'bool', 'capability');
INSERT INTO benchmark_results (run_id, metric, value, unit, category) VALUES ((SELECT MAX(id) FROM benchmark_runs), 'tool_use', $CAP_TOOLS, 'bool', 'capability');

-- Insert resource metrics
INSERT INTO benchmark_results (run_id, metric, value, unit, category) VALUES ((SELECT MAX(id) FROM benchmark_runs), 'peak_memory', $PEAK_MEMORY_MB, 'MB', 'resource');
INSERT INTO benchmark_results (run_id, metric, value, unit, category) VALUES ((SELECT MAX(id) FROM benchmark_runs), 'disk_usage', $DISK_MB, 'MB', 'resource');
INSERT INTO benchmark_results (run_id, metric, value, unit, category) VALUES ((SELECT MAX(id) FROM benchmark_runs), 'source_lines', $SOURCE_LINES, 'lines', 'resource');
INSERT INTO benchmark_results (run_id, metric, value, unit, category) VALUES ((SELECT MAX(id) FROM benchmark_runs), 'overall_score', $OVERALL_SCORE, 'score', 'resource');

COMMIT;
SQL

  if [ $? -ne 0 ]; then
    echo "  [err]  $DEVICE_SLUG + $FORK_SLUG  (DB insert failed)"
    FAILED=$((FAILED + 1))
    continue
  fi

  # Update compatibility verdict based on score
  VERDICT="WONT_RUN"
  if [ "$OVERALL_SCORE" -ge 85 ]; then
    VERDICT="RUNS_GREAT"
  elif [ "$OVERALL_SCORE" -ge 60 ]; then
    VERDICT="RUNS_OK"
  elif [ "$OVERALL_SCORE" -ge 30 ]; then
    VERDICT="BARELY_RUNS"
  fi

  COLD_START_SEC=$(awk "BEGIN {printf \"%.1f\", $COLD_START_MS / 1000}")

  # Upsert the compatibility verdict
  sqlite3 "$DB_PATH" "
    INSERT INTO compatibility_verdicts (device_id, fork_id, verdict, notes, cold_start_sec)
    VALUES ($DEVICE_ID, $FORK_ID, '$VERDICT', 'ClawBench score: ${OVERALL_SCORE}/100 | Caps: ${CAP_PASSED}/${CAP_TOTAL} | Disk: ${DISK_MB}MB | Entry: $ENTRY_POINT', $COLD_START_SEC)
    ON CONFLICT(device_id, fork_id) DO UPDATE SET
      verdict = '$VERDICT',
      notes = 'ClawBench score: ${OVERALL_SCORE}/100 | Caps: ${CAP_PASSED}/${CAP_TOTAL} | Disk: ${DISK_MB}MB | Entry: $ENTRY_POINT',
      cold_start_sec = $COLD_START_SEC
  "

  UPDATED_VERDICTS=$((UPDATED_VERDICTS + 1))
  echo "  [done] $DEVICE_SLUG + $FORK_SLUG  score=$OVERALL_SCORE  verdict=$VERDICT"
  IMPORTED=$((IMPORTED + 1))
done

echo ""
echo "=========================================="
echo "  Import Complete"
echo "=========================================="
echo "  Imported:         $IMPORTED"
echo "  Skipped:          $SKIPPED (already in DB or non-benchmark)"
echo "  Failed:           $FAILED"
echo "  Verdicts updated: $UPDATED_VERDICTS"
echo "=========================================="
