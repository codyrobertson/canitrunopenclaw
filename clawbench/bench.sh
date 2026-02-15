#!/bin/bash
# ClawBench - OpenClaw Fork Benchmark
# Runs inside a resource-constrained Docker container.
# Measures real clone, install, disk, startup, memory, and capabilities.
# Outputs JSON results to stdout. All logs go to stderr.

set -euo pipefail

FORK_REPO="${FORK_REPO:?FORK_REPO env var required}"
FORK_LANG="${FORK_LANG:-unknown}"
DEVICE_SLUG="${DEVICE_SLUG:-unknown}"
FORK_SLUG="${FORK_SLUG:-unknown}"
API_ENDPOINT="${API_ENDPOINT:-}"
API_KEY="${API_KEY:-}"
MEMORY_LIMIT="${MEMORY_LIMIT:-0}"
CPU_LIMIT="${CPU_LIMIT:-0}"

log() { echo "[ClawBench] $*" >&2; }

now_ms() { date +%s%N | cut -b1-13; }

# ============================================================
# Phase 1: Clone
# ============================================================
log "Phase 1: Cloning $FORK_REPO..."
CLONE_START=$(now_ms)
if ! git clone --depth 1 "$FORK_REPO" /bench/fork 2>&1 | tail -3 >&2; then
  log "FATAL: Clone failed"
  cat <<JSONEOF
{"error":"clone_failed","device_slug":"${DEVICE_SLUG}","fork_slug":"${FORK_SLUG}"}
JSONEOF
  exit 1
fi
CLONE_MS=$(( $(now_ms) - CLONE_START ))
log "Clone: ${CLONE_MS}ms"

cd /bench/fork

# ============================================================
# Phase 2: Install dependencies
# ============================================================
log "Phase 2: Installing ($FORK_LANG)..."
INSTALL_START=$(now_ms)

case "$FORK_LANG" in
  python|Python)
    python3 -m venv /bench/venv 2>&1 | tail -1 >&2 || true
    if [ -f requirements.txt ]; then
      /bench/venv/bin/pip install -q -r requirements.txt 2>&1 | tail -5 >&2 || true
    elif [ -f pyproject.toml ]; then
      /bench/venv/bin/pip install -q . 2>&1 | tail -5 >&2 || true
    elif [ -f setup.py ]; then
      /bench/venv/bin/pip install -q . 2>&1 | tail -5 >&2 || true
    fi
    ;;
  typescript|TypeScript|javascript|JavaScript)
    if [ -f package.json ]; then
      npm install --production --ignore-scripts 2>&1 | tail -5 >&2 || true
    fi
    ;;
  go|Go)
    if command -v go &>/dev/null && [ -f go.mod ]; then
      go build ./... 2>&1 | tail -5 >&2 || true
    fi
    ;;
  *)
    log "No install strategy for language: $FORK_LANG"
    ;;
esac

INSTALL_MS=$(( $(now_ms) - INSTALL_START ))
log "Install: ${INSTALL_MS}ms"

# ============================================================
# Phase 3: Measure disk usage
# ============================================================
DISK_KB=$(du -sk /bench/fork 2>/dev/null | awk '{print $1}')
DISK_MB=$(( DISK_KB / 1024 ))
log "Disk usage: ${DISK_MB}MB"

# ============================================================
# Phase 4: Detect entry point and attempt startup
# ============================================================
log "Phase 4: Entry point detection..."
ENTRY_POINT=""
STARTUP_MS=0
STARTUP_OK=false

# Try common entry points (files)
for candidate in \
  "src/index.ts" "index.ts" "src/main.ts" "main.ts" \
  "src/index.js" "index.js" "src/main.js" "main.js" \
  "main.py" "app.py" "src/main.py" "bot.py" "run.py" \
  "cmd/main.go" "main.go" \
  "src/main.rs"; do
  if [ -f "$candidate" ]; then
    ENTRY_POINT="$candidate"
    break
  fi
done

# Check for Python package with __main__.py
if [ -z "$ENTRY_POINT" ]; then
  for pkg_dir in */; do
    if [ -f "${pkg_dir}__main__.py" ]; then
      ENTRY_POINT="pymod:${pkg_dir%/}"
      break
    fi
  done
fi

# Check for Dockerfile CMD/ENTRYPOINT
if [ -z "$ENTRY_POINT" ] && [ -f Dockerfile ]; then
  DOCKER_CMD=$(grep -E "^(CMD|ENTRYPOINT)" Dockerfile 2>/dev/null | tail -1 || true)
  if [ -n "$DOCKER_CMD" ]; then
    ENTRY_POINT="docker:Dockerfile"
  fi
fi

# Check package.json for "main" or "start" script
if [ -z "$ENTRY_POINT" ] && [ -f package.json ]; then
  ENTRY_POINT=$(python3 -c "
import json
with open('package.json') as f:
    p = json.load(f)
    m = p.get('main','')
    if m: print(m)
    elif 'start' in p.get('scripts',{}): print('npm:start')
" 2>/dev/null || true)
fi

if [ -n "$ENTRY_POINT" ]; then
  log "Found entry point: $ENTRY_POINT"

  STARTUP_START=$(now_ms)

  case "$ENTRY_POINT" in
    pymod:*)
      MODULE="${ENTRY_POINT#pymod:}"
      timeout 15 /bench/venv/bin/python -m "$MODULE" --help 2>&1 | head -3 >&2 && STARTUP_OK=true || true
      ;;
    docker:*)
      # Can't run Docker inside Docker, but entry point exists
      STARTUP_OK=true
      ;;
    *.py)
      timeout 15 /bench/venv/bin/python "$ENTRY_POINT" --help 2>&1 | head -3 >&2 && STARTUP_OK=true || true
      ;;
    *.ts)
      if command -v npx &>/dev/null; then
        timeout 15 npx tsx "$ENTRY_POINT" --help 2>&1 | head -3 >&2 && STARTUP_OK=true || true
      fi
      ;;
    *.js)
      timeout 15 node "$ENTRY_POINT" --help 2>&1 | head -3 >&2 && STARTUP_OK=true || true
      ;;
    npm:start)
      timeout 15 npm start 2>&1 | head -5 >&2 && STARTUP_OK=true || true
      ;;
    *.go)
      if command -v go &>/dev/null; then
        timeout 15 go run "$ENTRY_POINT" --help 2>&1 | head -3 >&2 && STARTUP_OK=true || true
      fi
      ;;
  esac

  STARTUP_MS=$(( $(now_ms) - STARTUP_START ))
  log "Startup attempt: ${STARTUP_MS}ms (ok=$STARTUP_OK)"
else
  log "No entry point found"
fi

# ============================================================
# Phase 5: Capability detection (static analysis)
# ============================================================
log "Phase 5: Scanning capabilities..."

SRC_GLOBS="--include=*.ts --include=*.js --include=*.py --include=*.go --include=*.rs --include=*.c --include=*.swift --include=*.ex --include=*.exs --include=*.cpp"

cap_check() {
  local name="$1"
  shift
  grep -rql "$@" $SRC_GLOBS /bench/fork 2>/dev/null && echo "true" || echo "false"
}

CAP_MESSAGING=$(cap_check messaging -E "whatsapp|telegram|discord|slack" -i)
CAP_BROWSER=$(cap_check browser -E "puppeteer|playwright|selenium|headless|browser" -i)
CAP_CODE_EXEC=$(cap_check code_exec -E "subprocess|child_process|exec\(|spawn\(|os\.system" -i)
CAP_MEMORY=$(cap_check memory -E "memory|persist|sqlite|redis|vectordb|chromadb" -i)
CAP_FILES=$(cap_check files -E "readFile|writeFile|open\(|os\.path|pathlib" -i)
CAP_SEARCH=$(cap_check search -E "web.search|google|duckduckgo|serp|tavily" -i)
CAP_MCP=$(cap_check mcp -E "mcp|model.context.protocol|McpServer" -i)
CAP_TOOLS=$(cap_check tools -E "tool_use|function_call|tools.*\[|@tool" -i)

CAP_PASSED=0
for c in $CAP_MESSAGING $CAP_BROWSER $CAP_CODE_EXEC $CAP_MEMORY $CAP_FILES $CAP_SEARCH $CAP_MCP $CAP_TOOLS; do
  [ "$c" = "true" ] && CAP_PASSED=$((CAP_PASSED + 1))
done
CAP_TOTAL=8
log "Capabilities: ${CAP_PASSED}/${CAP_TOTAL}"

# ============================================================
# Phase 6: Memory snapshot
# ============================================================
MEM_AVAILABLE_KB=0
MEM_LIMIT_KB=0
if [ -f /sys/fs/cgroup/memory.max ] 2>/dev/null; then
  # cgroup v2
  MEM_LIMIT_KB=$(( $(cat /sys/fs/cgroup/memory.max 2>/dev/null || echo 0) / 1024 ))
  MEM_USED_KB=$(( $(cat /sys/fs/cgroup/memory.current 2>/dev/null || echo 0) / 1024 ))
elif [ -f /sys/fs/cgroup/memory/memory.usage_in_bytes ] 2>/dev/null; then
  # cgroup v1
  MEM_LIMIT_KB=$(( $(cat /sys/fs/cgroup/memory/memory.limit_in_bytes 2>/dev/null || echo 0) / 1024 ))
  MEM_USED_KB=$(( $(cat /sys/fs/cgroup/memory/memory.usage_in_bytes 2>/dev/null || echo 0) / 1024 ))
else
  MEM_USED_KB=$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print $2}' || echo 0)
fi
PEAK_MEMORY_MB=$(( MEM_USED_KB / 1024 ))
log "Memory used: ${PEAK_MEMORY_MB}MB"

# ============================================================
# Phase 7: Line count
# ============================================================
LINES=$(find /bench/fork -type f \( -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.c" -o -name "*.swift" -o -name "*.ex" -o -name "*.cpp" \) \
  ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/vendor/*" ! -path "*/__pycache__/*" \
  -exec cat {} + 2>/dev/null | wc -l | tr -d ' ')
log "Source lines: $LINES"

# ============================================================
# Phase 8: Score
# ============================================================
# Cold start = clone + install + startup
COLD_START_MS=$((CLONE_MS + INSTALL_MS + STARTUP_MS))

# Latency: 30 pts
LATENCY_SCORE=0
if [ "$COLD_START_MS" -lt 10000 ]; then LATENCY_SCORE=30
elif [ "$COLD_START_MS" -lt 30000 ]; then LATENCY_SCORE=20
elif [ "$COLD_START_MS" -lt 60000 ]; then LATENCY_SCORE=10
fi

# Capabilities: 40 pts
CAP_SCORE=$(( CAP_PASSED * 40 / CAP_TOTAL ))

# Size: 30 pts (smaller = better for constrained devices)
SIZE_SCORE=0
if [ "$DISK_MB" -lt 50 ]; then SIZE_SCORE=30
elif [ "$DISK_MB" -lt 200 ]; then SIZE_SCORE=20
elif [ "$DISK_MB" -lt 500 ]; then SIZE_SCORE=10
fi

OVERALL_SCORE=$((LATENCY_SCORE + CAP_SCORE + SIZE_SCORE))
log "Score: ${OVERALL_SCORE}/100 (latency=${LATENCY_SCORE} cap=${CAP_SCORE} size=${SIZE_SCORE})"

# ============================================================
# Output JSON
# ============================================================
echo '{"device_slug":"'"${DEVICE_SLUG}"'","fork_slug":"'"${FORK_SLUG}"'","results":{"latency":{"cold_start_ms":'"${COLD_START_MS}"',"clone_ms":'"${CLONE_MS}"',"install_ms":'"${INSTALL_MS}"',"startup_ms":'"${STARTUP_MS}"',"startup_ok":'"${STARTUP_OK}"'},"capabilities":{"messaging":'"${CAP_MESSAGING}"',"browser_automation":'"${CAP_BROWSER}"',"code_execution":'"${CAP_CODE_EXEC}"',"persistent_memory":'"${CAP_MEMORY}"',"file_management":'"${CAP_FILES}"',"web_search":'"${CAP_SEARCH}"',"mcp":'"${CAP_MCP}"',"tool_use":'"${CAP_TOOLS}"',"passed":'"${CAP_PASSED}"',"total":'"${CAP_TOTAL}"'},"size":{"disk_mb":'"${DISK_MB}"',"source_lines":'"${LINES}"'},"resources":{"peak_memory_mb":'"${PEAK_MEMORY_MB}"'}},"entry_point":"'"${ENTRY_POINT}"'","docker_constraints":{"memory_limit_mb":'"${MEMORY_LIMIT}"',"cpu_limit":'"${CPU_LIMIT}"'},"overall_score":'"${OVERALL_SCORE}"'}'

# ============================================================
# Optional: POST to API
# ============================================================
if [ -n "$API_ENDPOINT" ]; then
  log "Submitting results to $API_ENDPOINT..."
  curl -sf -X POST "$API_ENDPOINT" \
    -H "Content-Type: application/json" \
    ${API_KEY:+-H "x-clawbench-key: $API_KEY"} \
    -d @- <<< "$(cat <<JSONEOF
{"device_slug":"${DEVICE_SLUG}","fork_slug":"${FORK_SLUG}","overall_score":${OVERALL_SCORE},"results":{"cold_start_ms":${COLD_START_MS},"disk_mb":${DISK_MB},"source_lines":${LINES},"capabilities_passed":${CAP_PASSED},"startup_ok":${STARTUP_OK}}}
JSONEOF
)" >&2 || log "WARNING: Failed to submit results"
fi

log "Done."
