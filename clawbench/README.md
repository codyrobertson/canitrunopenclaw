# ClawBench

Automated benchmarking for OpenClaw forks on real hardware constraints.

ClawBench runs forks inside Docker containers with resource limits matching target devices (`--memory`, `--cpus`), measuring latency, capabilities, and resource usage.

## Quick Start

```bash
# Run a benchmark (device-slug + fork-slug)
./clawbench/run.sh raspberry-pi-5 nanobot

# Run with API submission
API_ENDPOINT=http://localhost:3000/api/benchmarks ./clawbench/run.sh mac-mini-m1 openclaw
```

## What It Measures

### Latency (30 points)
- **Cold start** -- Time from container start to first response
- **Warm response** -- Average response time over 5 requests
- **Clone + install** -- Dependency installation overhead

### Capabilities (40 points)
- Messaging (WhatsApp, Telegram, Discord, Slack)
- Browser automation (Puppeteer, Playwright)
- Code execution (shell, subprocess)
- Persistent memory (database, storage)
- File management (read/write)
- Web search

### Resources (30 points)
- **Peak memory** -- Maximum RSS during operation
- **CPU usage** -- Average CPU utilization
- **Concurrency** -- Max simultaneous agents before OOM

### Overall Score (0-100)
Weighted combination of latency, capabilities, and resource efficiency.

## Architecture

```
clawbench/
  Dockerfile    -- Base Docker image with Node.js, Python, Git
  bench.sh      -- Benchmark script (runs inside container)
  run.sh        -- Convenience wrapper (reads device specs from DB)
  results/      -- Saved JSON results (gitignored)
```

## How It Works

1. `run.sh` queries the SQLite database for device specs (RAM, CPU)
2. Builds the Docker image if needed
3. Runs `bench.sh` inside a container with matching resource limits
4. `bench.sh` clones the fork, installs deps, and runs all benchmarks
5. Results are output as JSON and optionally POSTed to the API

## Docker Resource Mapping

| Device | Docker Flags |
|--------|-------------|
| Raspberry Pi 5 (8GB) | `--memory=8192m --cpus=4` |
| Raspberry Pi 4 (4GB) | `--memory=4096m --cpus=4` |
| ESP32-S3 (0.5MB) | `--memory=512m --cpus=1` |
| Mac Mini M1 (8GB) | `--memory=8192m --cpus=4` |

## API Submission

Results can be submitted to the web app API:

```bash
# POST results
curl -X POST http://localhost:3000/api/benchmarks \
  -H "Content-Type: application/json" \
  -d @clawbench/results/raspberry-pi-5_nanobot_20260214.json

# GET latest results
curl "http://localhost:3000/api/benchmarks?device=raspberry-pi-5&fork=nanobot"
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_ENDPOINT` | URL to POST results | `http://host.docker.internal:3000/api/benchmarks` |
| `API_KEY` | Authentication key | (none) |
| `FORK_REPO` | Git repo URL (required in container) | -- |
| `FORK_LANG` | Language: python, typescript, go, rust, c | `python` |
| `DEVICE_SLUG` | Device identifier | `unknown` |
| `FORK_SLUG` | Fork identifier | `unknown` |
