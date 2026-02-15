#!/bin/bash
# ClawBench Runner
# Usage: ./clawbench/run.sh <device-slug> <fork-slug>
#
# Looks up device specs from the local SQLite DB and runs Docker
# with matching resource constraints (--memory, --cpus).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DB_PATH="$PROJECT_DIR/data/openclaw.db"
API_ENDPOINT="${API_ENDPOINT:-}"
API_KEY="${API_KEY:-}"
DOCKER_IMAGE="clawbench:latest"

usage() {
  echo "Usage: $0 <device-slug> <fork-slug>"
  echo ""
  echo "Examples:"
  echo "  $0 raspberry-pi-5-8gb nanobot"
  echo "  $0 mac-mini-m3-16gb openclaw"
  echo ""
  echo "Environment:"
  echo "  API_ENDPOINT  Where to POST results (optional)"
  echo "  API_KEY       API key for auth (optional)"
  exit 1
}

[ $# -lt 2 ] && usage

DEVICE_SLUG="$1"
FORK_SLUG="$2"

# Validate slugs (alphanumeric + hyphens only)
if [[ ! "$DEVICE_SLUG" =~ ^[a-z0-9-]+$ ]] || [[ ! "$FORK_SLUG" =~ ^[a-z0-9-]+$ ]]; then
  echo "ERROR: Slugs must be lowercase alphanumeric with hyphens only"
  exit 1
fi

# Check deps
if ! command -v sqlite3 &>/dev/null; then
  echo "ERROR: sqlite3 required"; exit 1
fi
if ! command -v docker &>/dev/null; then
  echo "ERROR: docker required"; exit 1
fi
if ! docker info &>/dev/null 2>&1; then
  echo "ERROR: Docker daemon not running. Start Docker Desktop first."
  exit 1
fi
if [ ! -f "$DB_PATH" ]; then
  echo "ERROR: Database not found at $DB_PATH"
  echo "Run: npm run dev (seeds the database on first start)"
  exit 1
fi

# Query device (parameterized via printf %q)
DEVICE_INFO=$(sqlite3 "$DB_PATH" "SELECT ram_gb, cpu, name FROM devices WHERE slug = '$(printf '%s' "$DEVICE_SLUG" | sed "s/'/''/g")'")
if [ -z "$DEVICE_INFO" ]; then
  echo "ERROR: Device not found: $DEVICE_SLUG"
  echo "Available:"
  sqlite3 "$DB_PATH" "SELECT '  ' || slug FROM devices ORDER BY slug"
  exit 1
fi

RAM_GB=$(echo "$DEVICE_INFO" | cut -d'|' -f1)
DEVICE_CPU=$(echo "$DEVICE_INFO" | cut -d'|' -f2)
DEVICE_NAME=$(echo "$DEVICE_INFO" | cut -d'|' -f3)

# Convert RAM to MB using awk (no bc dependency)
RAM_MB=$(awk "BEGIN {printf \"%d\", $RAM_GB * 1024}")

# Clamp to minimum 32MB (Docker minimum is 6MB but below 32 is useless)
[ "$RAM_MB" -lt 32 ] && RAM_MB=32

# Determine CPU cores from CPU name
CPU_CORES=1
case "$DEVICE_CPU" in
  *"M1"*|*"M2"*|*"M3"*|*"M4"*) CPU_CORES=4 ;;
  *"Ryzen"*|*"Core i7"*|*"Core i5"*) CPU_CORES=4 ;;
  *"A76"*|*"A72"*) CPU_CORES=4 ;;
  *"A55"*|*"A53"*) CPU_CORES=2 ;;
  *"8-core"*|*"8 core"*) CPU_CORES=4 ;;
  *"4-core"*|*"4 core"*|*"Quad"*) CPU_CORES=2 ;;
esac

# Query fork
FORK_INFO=$(sqlite3 "$DB_PATH" "SELECT github_url, language, name FROM forks WHERE slug = '$(printf '%s' "$FORK_SLUG" | sed "s/'/''/g")'")
if [ -z "$FORK_INFO" ]; then
  echo "ERROR: Fork not found: $FORK_SLUG"
  echo "Available:"
  sqlite3 "$DB_PATH" "SELECT '  ' || slug FROM forks WHERE github_url != '' ORDER BY slug"
  exit 1
fi

FORK_REPO=$(echo "$FORK_INFO" | cut -d'|' -f1)
FORK_LANG=$(echo "$FORK_INFO" | cut -d'|' -f2)
FORK_NAME=$(echo "$FORK_INFO" | cut -d'|' -f3)

if [ -z "$FORK_REPO" ]; then
  echo "ERROR: Fork '$FORK_SLUG' has no GitHub URL configured"
  exit 1
fi

echo ""
echo "=========================================="
echo "  ClawBench"
echo "=========================================="
echo "  Device:  $DEVICE_NAME"
echo "  Fork:    $FORK_NAME ($FORK_LANG)"
echo "  Repo:    $FORK_REPO"
echo "  RAM:     ${RAM_MB}MB  CPUs: ${CPU_CORES}"
echo "=========================================="
echo ""

# Build Docker image if needed
if ! docker image inspect "$DOCKER_IMAGE" &>/dev/null; then
  echo "[ClawBench] Building Docker image..."
  docker build -t "$DOCKER_IMAGE" "$SCRIPT_DIR"
fi

# Run benchmark
echo "[ClawBench] Running benchmark..."
echo ""

RESULT=$(docker run --rm \
  --memory="${RAM_MB}m" \
  --cpus="${CPU_CORES}" \
  -e "FORK_REPO=${FORK_REPO}" \
  -e "FORK_LANG=${FORK_LANG}" \
  -e "DEVICE_SLUG=${DEVICE_SLUG}" \
  -e "FORK_SLUG=${FORK_SLUG}" \
  -e "API_ENDPOINT=${API_ENDPOINT}" \
  -e "API_KEY=${API_KEY}" \
  -e "MEMORY_LIMIT=${RAM_MB}" \
  -e "CPU_LIMIT=${CPU_CORES}" \
  "$DOCKER_IMAGE" 2>&1)

# Separate JSON (stdout) from logs (stderr gets mixed in docker run)
JSON_RESULT=$(echo "$RESULT" | grep "^{" | tail -1)
LOGS=$(echo "$RESULT" | grep -v "^{" || true)

# Show logs
[ -n "$LOGS" ] && echo "$LOGS"

if [ -z "$JSON_RESULT" ]; then
  echo ""
  echo "ERROR: No JSON output from benchmark"
  exit 1
fi

# Save results
RESULTS_DIR="$PROJECT_DIR/clawbench/results"
mkdir -p "$RESULTS_DIR"
RESULTS_FILE="$RESULTS_DIR/${DEVICE_SLUG}_${FORK_SLUG}_$(date +%Y%m%d_%H%M%S).json"
echo "$JSON_RESULT" | python3 -m json.tool > "$RESULTS_FILE" 2>/dev/null || echo "$JSON_RESULT" > "$RESULTS_FILE"

# Pretty-print results
SCORE=$(python3 -c "import sys,json; print(json.loads('''$JSON_RESULT''').get('overall_score','?'))" 2>/dev/null || echo "?")
COLD=$(python3 -c "import sys,json; print(json.loads('''$JSON_RESULT''')['results']['latency'].get('cold_start_ms','?'))" 2>/dev/null || echo "?")
DISK=$(python3 -c "import sys,json; print(json.loads('''$JSON_RESULT''')['results']['size'].get('disk_mb','?'))" 2>/dev/null || echo "?")
LINES=$(python3 -c "import sys,json; print(json.loads('''$JSON_RESULT''')['results']['size'].get('source_lines','?'))" 2>/dev/null || echo "?")
CAPS=$(python3 -c "import sys,json; print(json.loads('''$JSON_RESULT''')['results']['capabilities'].get('passed','?'))" 2>/dev/null || echo "?")

echo ""
echo "=========================================="
echo "  Results"
echo "=========================================="
echo "  Score:        ${SCORE}/100"
echo "  Cold Start:   ${COLD}ms"
echo "  Disk:         ${DISK}MB"
echo "  Source:        ${LINES} lines"
echo "  Capabilities: ${CAPS}/8"
echo "  Saved:        $RESULTS_FILE"
echo "=========================================="
