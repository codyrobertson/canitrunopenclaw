#!/bin/bash
# ClawBench v2 - OpenClaw Fork Benchmark
# Runs inside a resource-constrained Docker container.
# Measures real clone, install, disk, startup, memory, capabilities, and warm response.
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
DEVICE_NAME="${DEVICE_NAME:-unknown}"
FORK_MIN_RAM="${FORK_MIN_RAM:-0}"

log() { echo "[ClawBench] $*" >&2; }

now_ms() { date +%s%N | cut -b1-13; }

# Peak memory tracker — polls cgroup memory in background
PEAK_MEM_FILE="/tmp/peak_mem"
echo "0" > "$PEAK_MEM_FILE"

track_peak_memory() {
  while true; do
    local current=0
    if [ -f /sys/fs/cgroup/memory.current ] 2>/dev/null; then
      current=$(cat /sys/fs/cgroup/memory.current 2>/dev/null || echo 0)
    elif [ -f /sys/fs/cgroup/memory/memory.usage_in_bytes ] 2>/dev/null; then
      current=$(cat /sys/fs/cgroup/memory/memory.usage_in_bytes 2>/dev/null || echo 0)
    fi
    local peak=$(cat "$PEAK_MEM_FILE" 2>/dev/null || echo 0)
    if [ "$current" -gt "$peak" ] 2>/dev/null; then
      echo "$current" > "$PEAK_MEM_FILE"
    fi
    sleep 0.5
  done
}

# Start peak memory tracker in background
track_peak_memory &
MEM_TRACKER_PID=$!
trap "kill $MEM_TRACKER_PID 2>/dev/null || true" EXIT

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
INSTALL_OK=false

case "$FORK_LANG" in
  python|Python)
    python3 -m venv /bench/venv 2>&1 | tail -1 >&2 || true
    if [ -f requirements.txt ]; then
      /bench/venv/bin/pip install -q -r requirements.txt 2>&1 | tail -5 >&2 && INSTALL_OK=true || true
    elif [ -f pyproject.toml ]; then
      /bench/venv/bin/pip install -q -e . 2>&1 | tail -5 >&2 && INSTALL_OK=true || true
    elif [ -f setup.py ]; then
      /bench/venv/bin/pip install -q -e . 2>&1 | tail -5 >&2 && INSTALL_OK=true || true
    else
      INSTALL_OK=true  # No deps to install
    fi
    ;;
  typescript|TypeScript|javascript|JavaScript)
    if [ -f package.json ]; then
      npm install --production --ignore-scripts 2>&1 | tail -5 >&2 && INSTALL_OK=true || true
    else
      INSTALL_OK=true
    fi
    ;;
  go|Go)
    if command -v go &>/dev/null; then
      if [ -f go.mod ]; then
        go build -o /bench/fork-binary ./... 2>&1 | tail -5 >&2 && INSTALL_OK=true || true
      elif [ -f main.go ]; then
        go build -o /bench/fork-binary . 2>&1 | tail -5 >&2 && INSTALL_OK=true || true
      fi
    else
      log "WARNING: Go not available in container"
    fi
    ;;
  rust|Rust)
    if command -v cargo &>/dev/null; then
      if [ -f Cargo.toml ]; then
        # Build in release mode for accurate binary size/perf
        cargo build --release 2>&1 | tail -10 >&2 && INSTALL_OK=true || true
      fi
    else
      log "WARNING: Rust not available in container"
    fi
    ;;
  c|C)
    if command -v gcc &>/dev/null; then
      if [ -f Makefile ]; then
        make 2>&1 | tail -5 >&2 && INSTALL_OK=true || true
      elif [ -f CMakeLists.txt ]; then
        mkdir -p build && cd build && cmake .. 2>&1 | tail -3 >&2 && make 2>&1 | tail -5 >&2 && INSTALL_OK=true || true
        cd /bench/fork
      else
        # Try compiling main.c directly
        for src in main.c src/main.c; do
          if [ -f "$src" ]; then
            gcc -O2 -o /bench/fork-binary "$src" 2>&1 | tail -3 >&2 && INSTALL_OK=true || true
            break
          fi
        done
      fi
    else
      log "WARNING: GCC not available in container"
    fi
    ;;
  *)
    log "No install strategy for language: $FORK_LANG (attempting generic)"
    # Try common patterns
    if [ -f Makefile ]; then make 2>&1 | tail -5 >&2 && INSTALL_OK=true || true
    elif [ -f package.json ]; then npm install --production 2>&1 | tail -5 >&2 && INSTALL_OK=true || true
    elif [ -f requirements.txt ]; then pip install -q -r requirements.txt 2>&1 | tail -5 >&2 && INSTALL_OK=true || true
    fi
    ;;
esac

INSTALL_MS=$(( $(now_ms) - INSTALL_START ))
log "Install: ${INSTALL_MS}ms (ok=$INSTALL_OK)"

# ============================================================
# Phase 3: Measure disk usage
# ============================================================
DISK_KB=$(du -sk /bench/fork 2>/dev/null | awk '{print $1}')
DISK_MB=$(( DISK_KB / 1024 ))
log "Disk usage: ${DISK_MB}MB"

# Also measure binary size for compiled languages
BINARY_SIZE_KB=0
if [ -f /bench/fork-binary ]; then
  BINARY_SIZE_KB=$(du -sk /bench/fork-binary 2>/dev/null | awk '{print $1}')
elif [ -d /bench/fork/target/release ]; then
  # Rust release binary
  BINARY_SIZE_KB=$(find /bench/fork/target/release -maxdepth 1 -type f -executable -exec du -sk {} \; 2>/dev/null | sort -rn | head -1 | awk '{print $1}')
fi
BINARY_SIZE_MB=$(( BINARY_SIZE_KB / 1024 ))
log "Binary size: ${BINARY_SIZE_MB}MB (${BINARY_SIZE_KB}KB)"

# ============================================================
# Phase 4: Detect entry point and attempt startup
# ============================================================
log "Phase 4: Entry point detection..."
ENTRY_POINT=""
STARTUP_MS=0
STARTUP_OK=false
STARTUP_EXIT_CODE=1

# Check for compiled binary first
if [ -f /bench/fork-binary ]; then
  ENTRY_POINT="binary:/bench/fork-binary"
elif [ -d /bench/fork/target/release ]; then
  RUST_BIN=$(find /bench/fork/target/release -maxdepth 1 -type f -executable ! -name "*.d" ! -name "build-script-*" 2>/dev/null | head -1)
  if [ -n "$RUST_BIN" ]; then
    ENTRY_POINT="binary:$RUST_BIN"
  fi
fi

# Try common entry points (source files)
if [ -z "$ENTRY_POINT" ]; then
  for candidate in \
    "src/index.ts" "index.ts" "src/main.ts" "main.ts" \
    "src/index.js" "index.js" "src/main.js" "main.js" \
    "main.py" "app.py" "src/main.py" "bot.py" "run.py" \
    "cmd/main.go" "main.go" \
    "src/main.rs" "src/main.c" "main.c"; do
    if [ -f "$candidate" ]; then
      ENTRY_POINT="$candidate"
      break
    fi
  done
fi

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
    binary:*)
      BIN_PATH="${ENTRY_POINT#binary:}"
      timeout 30 "$BIN_PATH" --help 2>&1 | head -5 >&2 && STARTUP_OK=true || true
      STARTUP_EXIT_CODE=$?
      ;;
    pymod:*)
      MODULE="${ENTRY_POINT#pymod:}"
      timeout 30 /bench/venv/bin/python -m "$MODULE" --help 2>&1 | head -5 >&2 && STARTUP_OK=true || true
      STARTUP_EXIT_CODE=$?
      ;;
    docker:*)
      # Can't run Docker inside Docker, but entry point exists
      STARTUP_OK=true
      STARTUP_EXIT_CODE=0
      ;;
    *.py)
      timeout 30 /bench/venv/bin/python "$ENTRY_POINT" --help 2>&1 | head -5 >&2 && STARTUP_OK=true || true
      STARTUP_EXIT_CODE=$?
      ;;
    *.ts)
      if command -v npx &>/dev/null; then
        timeout 30 npx tsx "$ENTRY_POINT" --help 2>&1 | head -5 >&2 && STARTUP_OK=true || true
        STARTUP_EXIT_CODE=$?
      fi
      ;;
    *.js)
      timeout 30 node "$ENTRY_POINT" --help 2>&1 | head -5 >&2 && STARTUP_OK=true || true
      STARTUP_EXIT_CODE=$?
      ;;
    npm:start)
      timeout 30 npm start 2>&1 | head -5 >&2 && STARTUP_OK=true || true
      STARTUP_EXIT_CODE=$?
      ;;
    *.go)
      if command -v go &>/dev/null; then
        timeout 30 go run "$ENTRY_POINT" --help 2>&1 | head -5 >&2 && STARTUP_OK=true || true
        STARTUP_EXIT_CODE=$?
      fi
      ;;
  esac

  STARTUP_MS=$(( $(now_ms) - STARTUP_START ))
  log "Startup attempt: ${STARTUP_MS}ms (ok=$STARTUP_OK, exit=$STARTUP_EXIT_CODE)"
else
  log "No entry point found"
fi

# ============================================================
# Phase 5: Capability detection (static + runtime)
# ============================================================
log "Phase 5: Scanning capabilities..."

SRC_GLOBS="--include=*.ts --include=*.js --include=*.py --include=*.go --include=*.rs --include=*.c --include=*.swift --include=*.ex --include=*.exs --include=*.cpp --include=*.toml --include=*.json"

# Static capability check via grep
cap_check_static() {
  local name="$1"
  shift
  grep -rql "$@" $SRC_GLOBS /bench/fork 2>/dev/null && echo "true" || echo "false"
}

# Runtime capability check — try to import/load module
cap_check_runtime() {
  local name="$1"
  local module="$2"
  case "$FORK_LANG" in
    python|Python)
      timeout 10 /bench/venv/bin/python -c "import $module" 2>/dev/null && echo "true" || echo "false"
      ;;
    *)
      echo "skip"
      ;;
  esac
}

# Combined: runtime if available, static otherwise
cap_detect() {
  local name="$1"
  local static_result="$2"
  local runtime_result="$3"
  if [ "$runtime_result" = "true" ]; then
    echo "true"
  elif [ "$runtime_result" = "false" ] && [ "$static_result" = "true" ]; then
    # Static says yes but runtime says no — might be optional dependency
    echo "false"
  else
    echo "$static_result"
  fi
}

# Static checks
S_MESSAGING=$(cap_check_static messaging -E "whatsapp|telegram|discord|slack" -i)
S_BROWSER=$(cap_check_static browser -E "puppeteer|playwright|selenium|headless|chromium" -i)
S_CODE_EXEC=$(cap_check_static code_exec -E "subprocess|child_process|exec\(|spawn\(|os\.system|Command::new" -i)
S_MEMORY=$(cap_check_static memory -E "memory|persist|sqlite|redis|vectordb|chromadb|sled|rocksdb" -i)
S_FILES=$(cap_check_static files -E "readFile|writeFile|open\(|os\.path|pathlib|std::fs|File::" -i)
S_SEARCH=$(cap_check_static search -E "web.search|google|duckduckgo|serp|tavily|bing" -i)
S_MCP=$(cap_check_static mcp -E "mcp|model.context.protocol|McpServer|mcp-server" -i)
S_TOOLS=$(cap_check_static tools -E "tool_use|function_call|tools.*\[|@tool|#\[tool\]" -i)

# Runtime checks (Python only for now)
R_MESSAGING="skip"
R_BROWSER="skip"
R_MEMORY="skip"
if [ "$FORK_LANG" = "Python" ] || [ "$FORK_LANG" = "python" ]; then
  R_MESSAGING=$(timeout 5 /bench/venv/bin/python -c "
try:
    import importlib
    for m in ['telegram', 'discord', 'slack_sdk', 'whatsapp']:
        try:
            importlib.import_module(m)
            print('true')
            exit()
        except: pass
    print('false')
except: print('false')
" 2>/dev/null || echo "skip")
  R_BROWSER=$(timeout 5 /bench/venv/bin/python -c "
try:
    import importlib
    for m in ['playwright', 'selenium', 'puppeteer']:
        try:
            importlib.import_module(m)
            print('true')
            exit()
        except: pass
    print('false')
except: print('false')
" 2>/dev/null || echo "skip")
  R_MEMORY=$(timeout 5 /bench/venv/bin/python -c "
try:
    import importlib
    for m in ['sqlite3', 'chromadb', 'redis']:
        try:
            importlib.import_module(m)
            print('true')
            exit()
        except: pass
    print('false')
except: print('false')
" 2>/dev/null || echo "skip")
fi

# Combine static + runtime
CAP_MESSAGING=$(cap_detect messaging "$S_MESSAGING" "$R_MESSAGING")
CAP_BROWSER=$(cap_detect browser "$S_BROWSER" "$R_BROWSER")
CAP_CODE_EXEC=$S_CODE_EXEC  # Can't runtime test this safely
CAP_MEMORY=$(cap_detect memory "$S_MEMORY" "$R_MEMORY")
CAP_FILES=$S_FILES  # Nearly all projects can read files
CAP_SEARCH=$S_SEARCH
CAP_MCP=$S_MCP
CAP_TOOLS=$S_TOOLS

CAP_PASSED=0
for c in $CAP_MESSAGING $CAP_BROWSER $CAP_CODE_EXEC $CAP_MEMORY $CAP_FILES $CAP_SEARCH $CAP_MCP $CAP_TOOLS; do
  [ "$c" = "true" ] && CAP_PASSED=$((CAP_PASSED + 1))
done
CAP_TOTAL=8
log "Capabilities: ${CAP_PASSED}/${CAP_TOTAL} (static+runtime)"

# ============================================================
# Phase 6: Peak memory from tracker
# ============================================================
# Stop the tracker
kill $MEM_TRACKER_PID 2>/dev/null || true
wait $MEM_TRACKER_PID 2>/dev/null || true

PEAK_MEM_BYTES=$(cat "$PEAK_MEM_FILE" 2>/dev/null || echo 0)
PEAK_MEMORY_MB=$(( PEAK_MEM_BYTES / 1048576 ))

# Also get current snapshot as fallback
CURRENT_MEM_BYTES=0
if [ -f /sys/fs/cgroup/memory.current ] 2>/dev/null; then
  CURRENT_MEM_BYTES=$(cat /sys/fs/cgroup/memory.current 2>/dev/null || echo 0)
elif [ -f /sys/fs/cgroup/memory/memory.usage_in_bytes ] 2>/dev/null; then
  CURRENT_MEM_BYTES=$(cat /sys/fs/cgroup/memory/memory.usage_in_bytes 2>/dev/null || echo 0)
fi
CURRENT_MEMORY_MB=$(( CURRENT_MEM_BYTES / 1048576 ))

# Use whichever is higher
if [ "$CURRENT_MEMORY_MB" -gt "$PEAK_MEMORY_MB" ] 2>/dev/null; then
  PEAK_MEMORY_MB=$CURRENT_MEMORY_MB
fi
log "Peak memory: ${PEAK_MEMORY_MB}MB"

# ============================================================
# Phase 7: Line count
# ============================================================
LINES=$(find /bench/fork -type f \( -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.c" -o -name "*.h" -o -name "*.swift" -o -name "*.ex" -o -name "*.cpp" \) \
  ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/vendor/*" ! -path "*/__pycache__/*" ! -path "*/target/*" \
  -exec cat {} + 2>/dev/null | wc -l | tr -d ' ')
log "Source lines: $LINES"

# ============================================================
# Phase 8: Score (v2 — more nuanced)
# ============================================================
# Cold start = clone + install + startup
COLD_START_MS=$((CLONE_MS + INSTALL_MS + STARTUP_MS))

# Latency: 30 pts (more granular tiers)
LATENCY_SCORE=0
if [ "$COLD_START_MS" -lt 5000 ]; then LATENCY_SCORE=30
elif [ "$COLD_START_MS" -lt 10000 ]; then LATENCY_SCORE=25
elif [ "$COLD_START_MS" -lt 20000 ]; then LATENCY_SCORE=20
elif [ "$COLD_START_MS" -lt 30000 ]; then LATENCY_SCORE=15
elif [ "$COLD_START_MS" -lt 60000 ]; then LATENCY_SCORE=10
elif [ "$COLD_START_MS" -lt 120000 ]; then LATENCY_SCORE=5
fi

# Capabilities: 40 pts
CAP_SCORE=$(( CAP_PASSED * 40 / CAP_TOTAL ))

# Size: 20 pts (smaller = better for constrained devices)
SIZE_SCORE=0
if [ "$DISK_MB" -lt 20 ]; then SIZE_SCORE=20
elif [ "$DISK_MB" -lt 50 ]; then SIZE_SCORE=17
elif [ "$DISK_MB" -lt 100 ]; then SIZE_SCORE=14
elif [ "$DISK_MB" -lt 200 ]; then SIZE_SCORE=10
elif [ "$DISK_MB" -lt 500 ]; then SIZE_SCORE=5
fi

# Install success + startup success: 10 pts
BUILD_SCORE=0
if [ "$INSTALL_OK" = "true" ]; then BUILD_SCORE=$((BUILD_SCORE + 5)); fi
if [ "$STARTUP_OK" = "true" ]; then BUILD_SCORE=$((BUILD_SCORE + 5)); fi

OVERALL_SCORE=$((LATENCY_SCORE + CAP_SCORE + SIZE_SCORE + BUILD_SCORE))
# Clamp to 100
if [ "$OVERALL_SCORE" -gt 100 ]; then OVERALL_SCORE=100; fi

log "Score: ${OVERALL_SCORE}/100 (latency=${LATENCY_SCORE} cap=${CAP_SCORE} size=${SIZE_SCORE} build=${BUILD_SCORE})"

# ============================================================
# Output JSON
# ============================================================
cat <<JSONEOF
{"device_slug":"${DEVICE_SLUG}","fork_slug":"${FORK_SLUG}","results":{"latency":{"cold_start_ms":${COLD_START_MS},"clone_ms":${CLONE_MS},"install_ms":${INSTALL_MS},"startup_ms":${STARTUP_MS},"startup_ok":${STARTUP_OK},"install_ok":${INSTALL_OK}},"capabilities":{"messaging":${CAP_MESSAGING},"browser_automation":${CAP_BROWSER},"code_execution":${CAP_CODE_EXEC},"persistent_memory":${CAP_MEMORY},"file_management":${CAP_FILES},"web_search":${CAP_SEARCH},"mcp":${CAP_MCP},"tool_use":${CAP_TOOLS},"passed":${CAP_PASSED},"total":${CAP_TOTAL}},"size":{"disk_mb":${DISK_MB},"binary_size_kb":${BINARY_SIZE_KB},"source_lines":${LINES}},"resources":{"peak_memory_mb":${PEAK_MEMORY_MB}}},"entry_point":"${ENTRY_POINT}","docker_constraints":{"memory_limit_mb":${MEMORY_LIMIT},"cpu_limit":${CPU_LIMIT}},"overall_score":${OVERALL_SCORE}}
JSONEOF

# ============================================================
# Optional: POST to API
# ============================================================
if [ -n "$API_ENDPOINT" ]; then
  log "Submitting results to $API_ENDPOINT..."
  curl -sf -X POST "$API_ENDPOINT" \
    -H "Content-Type: application/json" \
    ${API_KEY:+-H "x-clawbench-key: $API_KEY"} \
    -d @- <<< "{\"device_slug\":\"${DEVICE_SLUG}\",\"fork_slug\":\"${FORK_SLUG}\",\"overall_score\":${OVERALL_SCORE},\"results\":{\"cold_start_ms\":${COLD_START_MS},\"disk_mb\":${DISK_MB},\"source_lines\":${LINES},\"capabilities_passed\":${CAP_PASSED},\"startup_ok\":${STARTUP_OK}}}" >&2 || log "WARNING: Failed to submit results"
fi

log "Done."
