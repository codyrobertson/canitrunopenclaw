#!/bin/bash
# ClawBench Runner
# Simulates target device constraints in Docker:
#   - CPU speed throttled relative to host (not just core count)
#   - I/O throttled to match storage type (microSD, eMMC, NVMe, etc.)
#   - Memory hard-limited
#
# Usage: ./clawbench/run.sh <device-slug> <fork-slug>

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
  echo "Simulates the target device's CPU speed, memory, and storage I/O"
  echo "inside a Docker container, then benchmarks the fork."
  echo ""
  echo "Examples:"
  echo "  $0 raspberry-pi-5-8gb nanobot"
  echo "  $0 esp32-s3 picoclaw"
  echo ""
  echo "Environment:"
  echo "  API_ENDPOINT  Where to POST results (optional)"
  echo "  API_KEY       API key for auth (optional)"
  exit 1
}

[ $# -lt 2 ] && usage

DEVICE_SLUG="$1"
FORK_SLUG="$2"

# Validate slugs
if [[ ! "$DEVICE_SLUG" =~ ^[a-z0-9-]+$ ]] || [[ ! "$FORK_SLUG" =~ ^[a-z0-9-]+$ ]]; then
  echo "ERROR: Slugs must be lowercase alphanumeric with hyphens only"
  exit 1
fi

# Check deps
for cmd in sqlite3 docker awk; do
  command -v "$cmd" &>/dev/null || { echo "ERROR: $cmd required"; exit 1; }
done
docker info &>/dev/null 2>&1 || { echo "ERROR: Docker daemon not running"; exit 1; }
[ -f "$DB_PATH" ] || { echo "ERROR: DB not found at $DB_PATH"; exit 1; }

# ============================================================
# Query device
# ============================================================
DEVICE_INFO=$(sqlite3 "$DB_PATH" "SELECT ram_gb, cpu, storage, name, category FROM devices WHERE slug = '$(printf '%s' "$DEVICE_SLUG" | sed "s/'/''/g")'")
[ -z "$DEVICE_INFO" ] && { echo "ERROR: Device not found: $DEVICE_SLUG"; exit 1; }

RAM_GB=$(echo "$DEVICE_INFO" | cut -d'|' -f1)
DEV_CPU=$(echo "$DEVICE_INFO" | cut -d'|' -f2)
DEV_STORAGE=$(echo "$DEVICE_INFO" | cut -d'|' -f3)
DEV_NAME=$(echo "$DEVICE_INFO" | cut -d'|' -f4)
DEV_CATEGORY=$(echo "$DEVICE_INFO" | cut -d'|' -f5)

# ============================================================
# Query fork
# ============================================================
FORK_INFO=$(sqlite3 "$DB_PATH" "SELECT github_url, language, name, min_ram_mb, min_cpu_cores FROM forks WHERE slug = '$(printf '%s' "$FORK_SLUG" | sed "s/'/''/g")'")
[ -z "$FORK_INFO" ] && { echo "ERROR: Fork not found: $FORK_SLUG"; exit 1; }

FORK_REPO=$(echo "$FORK_INFO" | cut -d'|' -f1)
FORK_LANG=$(echo "$FORK_INFO" | cut -d'|' -f2)
FORK_NAME=$(echo "$FORK_INFO" | cut -d'|' -f3)
FORK_MIN_RAM=$(echo "$FORK_INFO" | cut -d'|' -f4)
FORK_MIN_CORES=$(echo "$FORK_INFO" | cut -d'|' -f5)

[ -z "$FORK_REPO" ] && { echo "ERROR: Fork '$FORK_SLUG' has no repo URL"; exit 1; }

# Skip cloud/serverless forks on physical hardware
if [ "$FORK_MIN_RAM" = "0" ] && [ "$DEV_CATEGORY" != "Cloud" ]; then
  echo ""
  echo "  SKIP: $FORK_NAME is serverless (runs in cloud, not on local hardware)"
  echo "  Any device with internet access can use $FORK_NAME."
  echo ""
  echo '{"device_slug":"'"$DEVICE_SLUG"'","fork_slug":"'"$FORK_SLUG"'","result":"not_applicable","reason":"serverless_fork"}'
  exit 0
fi

# ============================================================
# CPU Performance Profile
# ============================================================
# Estimate single-thread perf relative to Apple M-series host (~3.5GHz A-class)
# This becomes the CPU quota multiplier.
# Reference: M3 single-core Geekbench ~3000, Pi 5 A76 ~700, Pi Zero A53 ~150

cpu_perf_factor() {
  local cpu="$1"
  local cores=1
  local factor=1.0

  # Extract core count
  case "$cpu" in
    *"dual-core"*|*"2-core"*|*"2x"*) cores=2 ;;
    *"Quad-core"*|*"quad-core"*|*"4-core"*|*"4x"*) cores=4 ;;
    *"6-core"*|*"6x"*) cores=6 ;;
    *"8-core"*|*"8x"*) cores=8 ;;
    *"12-core"*) cores=12 ;;
    *"14-core"*) cores=14 ;;
    *"16-core"*) cores=16 ;;
    *"single-core"*|*"1-core"*) cores=1 ;;
  esac

  # Single-thread performance factor (relative to M3 = 1.0)
  case "$cpu" in
    # Microcontrollers — unusable for most forks
    *"Cortex-M0"*|*"RP2040"*)     factor=0.01 ;;
    *"Cortex-M4"*|*"Cortex-M7"*)  factor=0.03 ;;
    *"Xtensa"*|*"ESP32"*)         factor=0.02 ;;

    # Low-end RISC-V
    *"RISC-V"*|*"SG2002"*|*"JH7110"*|*"C906"*) factor=0.05 ;;

    # ARM Cortex-A class (older)
    *"Cortex-A8"*)                factor=0.05 ;;
    *"Cortex-A53"*|*"A53"*)       factor=0.08 ;;
    *"Cortex-A55"*|*"A55"*)       factor=0.10 ;;
    *"Cortex-A72"*|*"A72"*)       factor=0.18 ;;
    *"Cortex-A73"*|*"A73"*)       factor=0.18 ;;
    *"Cortex-A76"*|*"A76"*)       factor=0.22 ;;
    *"Cortex-A78"*|*"A78"*)       factor=0.25 ;;

    # Mobile SoCs
    *"Helio G25"*)                factor=0.08 ;;
    *"Snapdragon 8 Gen 3"*)       factor=0.60 ;;
    *"A16"*|*"A17"*)              factor=0.65 ;;

    # x86 low-end
    *"Celeron"*|*"J4125"*)        factor=0.20 ;;
    *"Pentium"*)                  factor=0.22 ;;
    *"Atom"*)                     factor=0.15 ;;

    # x86 mid-range
    *"Core i5-8"*|*"i5-8"*)       factor=0.35 ;;
    *"Core i5-12"*|*"i5-12"*|*"Core i5-13"*|*"i5-13"*) factor=0.55 ;;
    *"Core i5"*)                  factor=0.45 ;;
    *"Core i7"*)                  factor=0.55 ;;
    *"Ryzen 5"*|*"5800H"*)        factor=0.50 ;;
    *"Ryzen 7"*|*"7840HS"*|*"7735HS"*) factor=0.55 ;;
    *"Ryzen 9"*)                  factor=0.60 ;;
    *"Xeon D"*|*"Xeon E"*)        factor=0.45 ;;
    *"Xeon Gold"*|*"Xeon Silver"*) factor=0.50 ;;

    # Apple Silicon
    *"M1"*)                       factor=0.80 ;;
    *"M2"*)                       factor=0.90 ;;
    *"M3"*)                       factor=1.00 ;;
    *"M4"*)                       factor=1.10 ;;

    # SBC SoCs (specific)
    *"RK3588"*)                   factor=0.22 ;;
    *"RK3399"*)                   factor=0.15 ;;
    *"RK3328"*)                   factor=0.08 ;;
    *"S922X"*|*"Amlogic S922"*)   factor=0.15 ;;
    *"S905X"*|*"Amlogic S905"*)   factor=0.08 ;;
    *"H616"*|*"Allwinner"*)       factor=0.08 ;;
    *"MT7981"*|*"MediaTek"*)      factor=0.10 ;;
    *"APQ8053"*|*"Qualcomm"*)     factor=0.10 ;;
    *"TDA4VM"*)                   factor=0.15 ;;

    # AMD APU
    *"Zen 2"*)                    factor=0.40 ;;
    *"Zen 3"*)                    factor=0.50 ;;

    # Fallback
    *)                            factor=0.30 ;;
  esac

  # Effective Docker CPUs = cores * factor
  # This gives you "equivalent M-series cores" worth of performance
  awk "BEGIN {printf \"%.2f\", $cores * $factor}"
}

# ============================================================
# Storage I/O Profile
# ============================================================
# Returns read speed in bytes/sec for Docker --device-read-bps

storage_read_bps() {
  local storage="$1"
  case "$storage" in
    *"Flash"*)         echo "5242880"   ;;  # 5 MB/s (flash chip)
    *"NAND"*)          echo "10485760"  ;;  # 10 MB/s
    *"microSD"*)       echo "26214400"  ;;  # 25 MB/s (typical UHS-I)
    *"eMMC"*|*"emmc"*) echo "104857600" ;;  # 100 MB/s
    *"SATA"*)          echo "209715200" ;;  # 200 MB/s
    *"SSD"*)           echo "524288000" ;;  # 500 MB/s
    *"NVMe"*|*"nvme"*) echo "0"        ;;  # No throttle (fast enough)
    *)                 echo "0"        ;;  # No throttle (unknown)
  esac
}

storage_write_bps() {
  local storage="$1"
  case "$storage" in
    *"Flash"*)         echo "2097152"   ;;  # 2 MB/s
    *"NAND"*)          echo "5242880"   ;;  # 5 MB/s
    *"microSD"*)       echo "10485760"  ;;  # 10 MB/s (typical write)
    *"eMMC"*|*"emmc"*) echo "52428800"  ;;  # 50 MB/s
    *"SATA"*)          echo "157286400" ;;  # 150 MB/s
    *"SSD"*)           echo "419430400" ;;  # 400 MB/s
    *"NVMe"*|*"nvme"*) echo "0"        ;;  # No throttle
    *)                 echo "0"        ;;  # No throttle
  esac
}

# ============================================================
# Compute Docker constraints
# ============================================================
RAM_MB=$(awk "BEGIN {printf \"%d\", $RAM_GB * 1024}")
[ "$RAM_MB" -lt 32 ] && RAM_MB=32

EFFECTIVE_CPUS=$(cpu_perf_factor "$DEV_CPU")
# Clamp to Docker's available range
HOST_CPUS=$(docker info --format '{{.NCPU}}' 2>/dev/null || echo 4)
EFFECTIVE_CPUS=$(awk "BEGIN {v=$EFFECTIVE_CPUS; if(v < 0.05) v=0.05; if(v > $HOST_CPUS) v=$HOST_CPUS; printf \"%.2f\", v}")

READ_BPS=$(storage_read_bps "$DEV_STORAGE")
WRITE_BPS=$(storage_write_bps "$DEV_STORAGE")

# Check if fork even fits
FORK_MIN_RAM_MB=${FORK_MIN_RAM:-0}
if [ "$FORK_MIN_RAM_MB" -gt "$RAM_MB" ] 2>/dev/null; then
  echo ""
  echo "  FAIL: $FORK_NAME requires ${FORK_MIN_RAM_MB}MB RAM"
  echo "        $DEV_NAME only has ${RAM_MB}MB"
  echo ""
  echo '{"device_slug":"'"$DEVICE_SLUG"'","fork_slug":"'"$FORK_SLUG"'","result":"insufficient_resources","reason":"ram","required_mb":'"$FORK_MIN_RAM_MB"',"available_mb":'"$RAM_MB"'}'
  exit 0
fi

echo ""
echo "=========================================="
echo "  ClawBench — Device Simulation"
echo "=========================================="
echo "  Device:    $DEV_NAME"
echo "  Fork:      $FORK_NAME ($FORK_LANG)"
echo "  Repo:      $FORK_REPO"
echo ""
echo "  Simulation:"
echo "    Memory:  ${RAM_MB}MB"
echo "    CPU:     ${EFFECTIVE_CPUS} effective cores (throttled to match device)"
echo "    Read:    $([ "$READ_BPS" = "0" ] && echo "unthrottled" || echo "$((READ_BPS / 1048576))MB/s")"
echo "    Write:   $([ "$WRITE_BPS" = "0" ] && echo "unthrottled" || echo "$((WRITE_BPS / 1048576))MB/s")"
echo "=========================================="
echo ""

# Build Docker image if needed
if ! docker image inspect "$DOCKER_IMAGE" &>/dev/null; then
  echo "[ClawBench] Building Docker image..."
  docker build -t "$DOCKER_IMAGE" "$SCRIPT_DIR"
fi

# Build Docker run args
DOCKER_ARGS=(
  --rm
  "--memory=${RAM_MB}m"
  "--cpus=${EFFECTIVE_CPUS}"
  -e "FORK_REPO=${FORK_REPO}"
  -e "FORK_LANG=${FORK_LANG}"
  -e "DEVICE_SLUG=${DEVICE_SLUG}"
  -e "FORK_SLUG=${FORK_SLUG}"
  -e "API_ENDPOINT=${API_ENDPOINT}"
  -e "API_KEY=${API_KEY}"
  -e "MEMORY_LIMIT=${RAM_MB}"
  -e "CPU_LIMIT=${EFFECTIVE_CPUS}"
  -e "DEVICE_NAME=${DEV_NAME}"
  -e "FORK_MIN_RAM=${FORK_MIN_RAM_MB}"
)

# I/O throttling — pass as env vars for in-container throttling
# Docker --device-read-bps doesn't work on macOS (VM-based Docker Desktop)
# Instead, we pass the speed limits and let bench.sh use them if possible
if [ "$READ_BPS" != "0" ]; then
  DOCKER_ARGS+=(-e "IO_READ_BPS=${READ_BPS}" -e "IO_WRITE_BPS=${WRITE_BPS}")
fi

echo "[ClawBench] Running benchmark..."
echo ""

# Use a named container so we can kill it if timeout fires
CONTAINER_NAME="clawbench-${DEVICE_SLUG}-${FORK_SLUG}"
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

# Rust/Go forks need more time for compilation on constrained CPUs
BENCH_TIMEOUT=300
case "$FORK_LANG" in
  Rust|rust) BENCH_TIMEOUT=600 ;;
  Go|go)     BENCH_TIMEOUT=450 ;;
esac

RESULT=$(timeout $BENCH_TIMEOUT docker run --name "$CONTAINER_NAME" "${DOCKER_ARGS[@]}" "$DOCKER_IMAGE" 2>&1) || true

# Clean up container if timeout killed the client but container kept running
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

# Extract JSON
JSON_RESULT=$(echo "$RESULT" | grep "^{" | tail -1)
LOGS=$(echo "$RESULT" | grep -v "^{" || true)

[ -n "$LOGS" ] && echo "$LOGS"

if [ -z "$JSON_RESULT" ]; then
  echo ""
  if echo "$RESULT" | grep -qi "killed\|oom\|out of memory"; then
    echo "RESULT: OOM — $FORK_NAME cannot run on $DEV_NAME (not enough RAM)"
    echo '{"device_slug":"'"$DEVICE_SLUG"'","fork_slug":"'"$FORK_SLUG"'","result":"oom","effective_cpus":'"$EFFECTIVE_CPUS"',"memory_mb":'"$RAM_MB"'}'
  else
    echo "RESULT: FAILED — benchmark did not produce output"
    echo "Container output:"
    echo "$RESULT" | tail -10
  fi
  exit 1
fi

# Save results
RESULTS_DIR="$SCRIPT_DIR/results"
mkdir -p "$RESULTS_DIR"
RESULTS_FILE="$RESULTS_DIR/${DEVICE_SLUG}_${FORK_SLUG}.json"
echo "$JSON_RESULT" | python3 -m json.tool > "$RESULTS_FILE" 2>/dev/null || echo "$JSON_RESULT" > "$RESULTS_FILE"

# Pretty-print
SCORE=$(python3 -c "import json; print(json.loads('''$JSON_RESULT''').get('overall_score','?'))" 2>/dev/null || echo "?")
COLD=$(python3 -c "import json; print(json.loads('''$JSON_RESULT''')['results']['latency'].get('cold_start_ms','?'))" 2>/dev/null || echo "?")
DISK=$(python3 -c "import json; print(json.loads('''$JSON_RESULT''')['results']['size'].get('disk_mb','?'))" 2>/dev/null || echo "?")
CAPS=$(python3 -c "import json; print(json.loads('''$JSON_RESULT''')['results']['capabilities'].get('passed','?'))" 2>/dev/null || echo "?")

echo ""
echo "=========================================="
echo "  Results"
echo "=========================================="
echo "  Score:        ${SCORE}/100"
echo "  Cold Start:   ${COLD}ms"
echo "  Disk:         ${DISK}MB"
echo "  Capabilities: ${CAPS}/8"
echo "  CPU sim:      ${EFFECTIVE_CPUS} effective cores"
echo "  Saved:        $RESULTS_FILE"
echo "=========================================="
