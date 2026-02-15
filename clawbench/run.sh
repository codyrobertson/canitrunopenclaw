#!/bin/bash
# ClawBench Runner - Convenience wrapper for local benchmarking
# Usage: ./clawbench/run.sh <device-slug> <fork-slug>
#
# Looks up device specs from the local SQLite DB and runs Docker
# with matching resource constraints (--memory, --cpus).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DB_PATH="$PROJECT_DIR/data/openclaw.db"
API_ENDPOINT="${API_ENDPOINT:-http://host.docker.internal:3000/api/benchmarks}"
API_KEY="${API_KEY:-}"
DOCKER_IMAGE="clawbench:latest"

usage() {
  echo "Usage: $0 <device-slug> <fork-slug>"
  echo ""
  echo "Examples:"
  echo "  $0 raspberry-pi-5 nanobot"
  echo "  $0 mac-mini-m1 openclaw"
  echo ""
  echo "Environment variables:"
  echo "  API_ENDPOINT  - Where to POST results (default: http://host.docker.internal:3000/api/benchmarks)"
  echo "  API_KEY       - Optional API key for authentication"
  echo ""
  exit 1
}

if [ $# -lt 2 ]; then
  usage
fi

DEVICE_SLUG="$1"
FORK_SLUG="$2"

# Check for sqlite3
if ! command -v sqlite3 &>/dev/null; then
  echo "ERROR: sqlite3 is required but not found"
  exit 1
fi

# Check database exists
if [ ! -f "$DB_PATH" ]; then
  echo "ERROR: Database not found at $DB_PATH"
  echo "Start the dev server first: npm run dev"
  exit 1
fi

# Query device specs
echo "[ClawBench] Looking up device: $DEVICE_SLUG"
DEVICE_INFO=$(sqlite3 "$DB_PATH" "SELECT ram_gb, cpu, name FROM devices WHERE slug = '$DEVICE_SLUG'" 2>/dev/null || true)
if [ -z "$DEVICE_INFO" ]; then
  echo "ERROR: Device not found: $DEVICE_SLUG"
  echo "Available devices:"
  sqlite3 "$DB_PATH" "SELECT '  ' || slug || ' (' || name || ', ' || ram_gb || 'GB RAM)' FROM devices ORDER BY name"
  exit 1
fi

RAM_GB=$(echo "$DEVICE_INFO" | cut -d'|' -f1)
DEVICE_CPU=$(echo "$DEVICE_INFO" | cut -d'|' -f2)
DEVICE_NAME=$(echo "$DEVICE_INFO" | cut -d'|' -f3)

# Convert RAM to MB for Docker
RAM_MB=$(echo "$RAM_GB * 1024" | bc | cut -d'.' -f1)

# Determine CPU cores (estimate from CPU name if not stored directly)
CPU_CORES=1
case "$DEVICE_CPU" in
  *"M1"*|*"M2"*) CPU_CORES=4 ;;
  *"M3"*|*"M4"*) CPU_CORES=4 ;;
  *"Ryzen 7"*|*"Core i7"*) CPU_CORES=4 ;;
  *"Ryzen 5"*|*"Core i5"*) CPU_CORES=4 ;;
  *"Cortex-A76"*) CPU_CORES=4 ;;
  *"Cortex-A72"*) CPU_CORES=4 ;;
  *"Cortex-A55"*) CPU_CORES=2 ;;
  *"Cortex-A53"*) CPU_CORES=2 ;;
  *"Xtensa"*) CPU_CORES=1 ;;
  *"RISC-V"*) CPU_CORES=1 ;;
esac

# Query fork info
echo "[ClawBench] Looking up fork: $FORK_SLUG"
FORK_INFO=$(sqlite3 "$DB_PATH" "SELECT github_url, language, name FROM forks WHERE slug = '$FORK_SLUG'" 2>/dev/null || true)
if [ -z "$FORK_INFO" ]; then
  echo "ERROR: Fork not found: $FORK_SLUG"
  echo "Available forks:"
  sqlite3 "$DB_PATH" "SELECT '  ' || slug || ' (' || name || ', ' || language || ')' FROM forks ORDER BY name"
  exit 1
fi

FORK_REPO=$(echo "$FORK_INFO" | cut -d'|' -f1)
FORK_LANG=$(echo "$FORK_INFO" | cut -d'|' -f2 | tr '[:upper:]' '[:lower:]')
FORK_NAME=$(echo "$FORK_INFO" | cut -d'|' -f3)

echo ""
echo "=========================================="
echo "  ClawBench Benchmark Configuration"
echo "=========================================="
echo "  Device:  $DEVICE_NAME ($DEVICE_SLUG)"
echo "  Fork:    $FORK_NAME ($FORK_SLUG)"
echo "  RAM:     ${RAM_MB}MB (${RAM_GB}GB)"
echo "  CPUs:    ${CPU_CORES}"
echo "  Repo:    $FORK_REPO"
echo "  Lang:    $FORK_LANG"
echo "=========================================="
echo ""

# Build Docker image if needed
if ! docker image inspect "$DOCKER_IMAGE" &>/dev/null; then
  echo "[ClawBench] Building Docker image..."
  docker build -t "$DOCKER_IMAGE" "$SCRIPT_DIR"
fi

# Run benchmark with resource constraints
echo "[ClawBench] Starting benchmark container..."
echo "[ClawBench] Memory limit: ${RAM_MB}m, CPU limit: ${CPU_CORES}"
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

# Extract JSON from output (last line that starts with {)
JSON_RESULT=$(echo "$RESULT" | grep "^{" | tail -1)

if [ -z "$JSON_RESULT" ]; then
  echo ""
  echo "ERROR: No JSON output from benchmark"
  echo "Container output:"
  echo "$RESULT"
  exit 1
fi

# Save results
RESULTS_FILE="$PROJECT_DIR/clawbench/results/${DEVICE_SLUG}_${FORK_SLUG}_$(date +%Y%m%d_%H%M%S).json"
mkdir -p "$(dirname "$RESULTS_FILE")"
echo "$JSON_RESULT" | python3 -m json.tool > "$RESULTS_FILE" 2>/dev/null || echo "$JSON_RESULT" > "$RESULTS_FILE"

echo ""
echo "=========================================="
echo "  Benchmark Complete!"
echo "=========================================="
echo "  Results saved to: $RESULTS_FILE"
echo ""

# Pretty-print key metrics
SCORE=$(echo "$JSON_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('overall_score','?'))" 2>/dev/null || echo "?")
COLD=$(echo "$JSON_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['results']['latency'].get('cold_start_ms','?'))" 2>/dev/null || echo "?")
WARM=$(echo "$JSON_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['results']['latency'].get('warm_response_ms','?'))" 2>/dev/null || echo "?")
MEM=$(echo "$JSON_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['results']['resources'].get('peak_memory_mb','?'))" 2>/dev/null || echo "?")

echo "  Overall Score:   ${SCORE}/100"
echo "  Cold Start:      ${COLD}ms"
echo "  Warm Response:   ${WARM}ms"
echo "  Peak Memory:     ${MEM}MB"
echo "=========================================="
