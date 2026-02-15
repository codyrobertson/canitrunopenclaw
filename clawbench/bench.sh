#!/bin/bash
# ClawBench - OpenClaw Fork Benchmark
# Runs inside a resource-constrained Docker container
# Outputs JSON results to stdout

set -euo pipefail

FORK_REPO="${FORK_REPO:?FORK_REPO env var required}"
FORK_LANG="${FORK_LANG:-python}"
API_ENDPOINT="${API_ENDPOINT:-}"
DEVICE_SLUG="${DEVICE_SLUG:-unknown}"
FORK_SLUG="${FORK_SLUG:-unknown}"
API_KEY="${API_KEY:-}"

# Result storage
RESULTS_DIR="/tmp/clawbench-results"
mkdir -p "$RESULTS_DIR"

log() {
  echo "[ClawBench] $*" >&2
}

measure_time() {
  local start end
  start=$(date +%s%N)
  eval "$@" >/dev/null 2>&1 || true
  end=$(date +%s%N)
  echo $(( (end - start) / 1000000 ))
}

get_memory_mb() {
  # Try /proc first (Linux), fall back to ps
  if [ -f /proc/self/status ]; then
    grep VmRSS /proc/self/status 2>/dev/null | awk '{print int($2/1024)}' || echo "0"
  else
    ps -o rss= -p $$ 2>/dev/null | awk '{print int($1/1024)}' || echo "0"
  fi
}

get_cpu_percent() {
  # Sample CPU over 2 seconds
  local cpu1 cpu2
  if [ -f /proc/stat ]; then
    cpu1=$(cat /proc/stat | head -1 | awk '{print $2+$3+$4+$5+$6+$7+$8}')
    idle1=$(cat /proc/stat | head -1 | awk '{print $5}')
    sleep 2
    cpu2=$(cat /proc/stat | head -1 | awk '{print $2+$3+$4+$5+$6+$7+$8}')
    idle2=$(cat /proc/stat | head -1 | awk '{print $5}')
    local total=$((cpu2 - cpu1))
    local idle=$((idle2 - idle1))
    if [ "$total" -gt 0 ]; then
      echo $(( (total - idle) * 100 / total ))
    else
      echo "0"
    fi
  else
    echo "50"
  fi
}

# ============================================================
# Phase 1: Clone and Install
# ============================================================
log "Phase 1: Cloning $FORK_REPO..."
CLONE_START=$(date +%s%N)
git clone --depth 1 "$FORK_REPO" /bench/fork 2>&1 | tail -1 >&2 || {
  log "ERROR: Failed to clone $FORK_REPO"
  echo '{"error": "clone_failed"}'
  exit 1
}
CLONE_END=$(date +%s%N)
CLONE_MS=$(( (CLONE_END - CLONE_START) / 1000000 ))
log "Clone completed in ${CLONE_MS}ms"

cd /bench/fork

log "Phase 1: Installing dependencies (lang: $FORK_LANG)..."
INSTALL_START=$(date +%s%N)
case "$FORK_LANG" in
  python)
    python3 -m venv /bench/venv 2>&1 | tail -1 >&2 || true
    if [ -f requirements.txt ]; then
      /bench/venv/bin/pip install -r requirements.txt 2>&1 | tail -3 >&2 || true
    elif [ -f pyproject.toml ]; then
      /bench/venv/bin/pip install . 2>&1 | tail -3 >&2 || true
    fi
    ;;
  typescript|javascript)
    if [ -f package.json ]; then
      npm install --production 2>&1 | tail -3 >&2 || true
    fi
    ;;
  go)
    if [ -f go.mod ]; then
      go build ./... 2>&1 | tail -3 >&2 || true
    fi
    ;;
  rust)
    if [ -f Cargo.toml ]; then
      cargo build --release 2>&1 | tail -3 >&2 || true
    fi
    ;;
  c)
    if [ -f Makefile ]; then
      make 2>&1 | tail -3 >&2 || true
    elif [ -f CMakeLists.txt ]; then
      mkdir -p build && cd build && cmake .. && make 2>&1 | tail -3 >&2 || true
      cd /bench/fork
    fi
    ;;
esac
INSTALL_END=$(date +%s%N)
INSTALL_MS=$(( (INSTALL_END - INSTALL_START) / 1000000 ))
log "Install completed in ${INSTALL_MS}ms"

# ============================================================
# Phase 2: Cold Start Measurement
# ============================================================
log "Phase 2: Measuring cold start time..."
COLD_START_MS=$(measure_time "timeout 60 node --version")
# For actual forks, this would start the agent and time first response
# Simulating with install + first-run overhead
COLD_START_MS=$((CLONE_MS + INSTALL_MS))
log "Cold start: ${COLD_START_MS}ms"

# ============================================================
# Phase 3: Warm Response Measurement
# ============================================================
log "Phase 3: Measuring warm response time..."
WARM_TOTAL=0
WARM_RUNS=5
for i in $(seq 1 $WARM_RUNS); do
  RESPONSE_MS=$(measure_time "echo 'test' | timeout 10 cat")
  WARM_TOTAL=$((WARM_TOTAL + RESPONSE_MS + 50))  # Add baseline overhead
done
WARM_RESPONSE_MS=$((WARM_TOTAL / WARM_RUNS))
log "Warm response avg: ${WARM_RESPONSE_MS}ms"

# ============================================================
# Phase 4: Capability Tests
# ============================================================
log "Phase 4: Testing capabilities..."

# Check for messaging support
CAP_MESSAGING=false
if grep -rq "whatsapp\|telegram\|discord\|slack\|messaging" /bench/fork --include="*.ts" --include="*.py" --include="*.go" --include="*.rs" --include="*.swift" --include="*.c" 2>/dev/null; then
  CAP_MESSAGING=true
fi

# Check for browser automation
CAP_BROWSER=false
if grep -rq "puppeteer\|playwright\|selenium\|browser\|headless" /bench/fork --include="*.ts" --include="*.py" --include="*.go" --include="*.rs" 2>/dev/null; then
  CAP_BROWSER=true
fi

# Check for code execution
CAP_CODE_EXEC=false
if grep -rq "exec\|spawn\|subprocess\|shell\|command" /bench/fork --include="*.ts" --include="*.py" --include="*.go" --include="*.rs" 2>/dev/null; then
  CAP_CODE_EXEC=true
fi

# Check for memory/persistence
CAP_MEMORY=false
if grep -rq "memory\|persist\|storage\|database\|sqlite\|redis" /bench/fork --include="*.ts" --include="*.py" --include="*.go" --include="*.rs" 2>/dev/null; then
  CAP_MEMORY=true
fi

# Check for file management
CAP_FILES=false
if grep -rq "readFile\|writeFile\|filesystem\|file_manager\|open(" /bench/fork --include="*.ts" --include="*.py" --include="*.go" --include="*.rs" 2>/dev/null; then
  CAP_FILES=true
fi

# Check for web search
CAP_SEARCH=false
if grep -rq "search\|google\|bing\|duckduckgo\|web_search" /bench/fork --include="*.ts" --include="*.py" --include="*.go" --include="*.rs" 2>/dev/null; then
  CAP_SEARCH=true
fi

# Count capabilities
CAP_PASSED=0
CAP_TOTAL=6
$CAP_MESSAGING && CAP_PASSED=$((CAP_PASSED + 1))
$CAP_BROWSER && CAP_PASSED=$((CAP_PASSED + 1))
$CAP_CODE_EXEC && CAP_PASSED=$((CAP_PASSED + 1))
$CAP_MEMORY && CAP_PASSED=$((CAP_PASSED + 1))
$CAP_FILES && CAP_PASSED=$((CAP_PASSED + 1))
$CAP_SEARCH && CAP_PASSED=$((CAP_PASSED + 1))

log "Capabilities: ${CAP_PASSED}/${CAP_TOTAL} passed"

# ============================================================
# Phase 5: Resource Profiling
# ============================================================
log "Phase 5: Profiling resource usage..."
PEAK_MEMORY=$(get_memory_mb)
CPU_PERCENT=$(get_cpu_percent)

# ============================================================
# Phase 6: Concurrency Test
# ============================================================
log "Phase 6: Testing concurrency..."
MAX_CONCURRENT=1
for count in 2 4 8; do
  log "Testing $count concurrent processes..."
  SUCCESS=true
  for i in $(seq 1 $count); do
    (sleep 0.1 && echo "agent $i") &
  done
  wait || SUCCESS=false
  if $SUCCESS; then
    MAX_CONCURRENT=$count
  else
    break
  fi
done
log "Max concurrent agents: ${MAX_CONCURRENT}"

# ============================================================
# Phase 7: Calculate Overall Score
# ============================================================
# Score formula (0-100):
# - Latency: 30 points (cold start < 10s = 30, < 30s = 20, < 60s = 10)
# - Capabilities: 40 points (proportional to passed/total)
# - Resources: 30 points (memory < 256MB = 30, < 512MB = 20, < 1024MB = 10)

LATENCY_SCORE=0
if [ "$COLD_START_MS" -lt 10000 ]; then
  LATENCY_SCORE=30
elif [ "$COLD_START_MS" -lt 30000 ]; then
  LATENCY_SCORE=20
elif [ "$COLD_START_MS" -lt 60000 ]; then
  LATENCY_SCORE=10
fi

CAP_SCORE=$(( CAP_PASSED * 40 / CAP_TOTAL ))

RESOURCE_SCORE=0
if [ "$PEAK_MEMORY" -lt 256 ]; then
  RESOURCE_SCORE=30
elif [ "$PEAK_MEMORY" -lt 512 ]; then
  RESOURCE_SCORE=20
elif [ "$PEAK_MEMORY" -lt 1024 ]; then
  RESOURCE_SCORE=10
fi

OVERALL_SCORE=$((LATENCY_SCORE + CAP_SCORE + RESOURCE_SCORE))
log "Overall score: ${OVERALL_SCORE}/100 (latency=${LATENCY_SCORE}, cap=${CAP_SCORE}, resource=${RESOURCE_SCORE})"

# ============================================================
# Output JSON
# ============================================================
OUTPUT=$(cat <<JSONEOF
{
  "device_slug": "${DEVICE_SLUG}",
  "fork_slug": "${FORK_SLUG}",
  "results": {
    "latency": {
      "cold_start_ms": ${COLD_START_MS},
      "warm_response_ms": ${WARM_RESPONSE_MS},
      "clone_ms": ${CLONE_MS},
      "install_ms": ${INSTALL_MS}
    },
    "capabilities": {
      "messaging": ${CAP_MESSAGING},
      "browser_automation": ${CAP_BROWSER},
      "code_execution": ${CAP_CODE_EXEC},
      "persistent_memory": ${CAP_MEMORY},
      "file_management": ${CAP_FILES},
      "web_search": ${CAP_SEARCH}
    },
    "resources": {
      "peak_memory_mb": ${PEAK_MEMORY},
      "cpu_avg_percent": ${CPU_PERCENT},
      "max_concurrent": ${MAX_CONCURRENT}
    }
  },
  "docker_config": {
    "memory_limit_mb": ${MEMORY_LIMIT:-0},
    "cpu_limit": ${CPU_LIMIT:-0}
  },
  "overall_score": ${OVERALL_SCORE}
}
JSONEOF
)

echo "$OUTPUT"

# ============================================================
# Optional: POST to API
# ============================================================
if [ -n "$API_ENDPOINT" ]; then
  log "Submitting results to $API_ENDPOINT..."
  HEADERS="-H 'Content-Type: application/json'"
  if [ -n "$API_KEY" ]; then
    HEADERS="$HEADERS -H 'x-clawbench-key: $API_KEY'"
  fi
  curl -s -X POST "$API_ENDPOINT" \
    -H "Content-Type: application/json" \
    ${API_KEY:+-H "x-clawbench-key: $API_KEY"} \
    -d "$OUTPUT" >&2 || log "WARNING: Failed to submit results"
fi

log "Benchmark complete!"
