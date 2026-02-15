# Can it run OpenClaw?

The open hardware compatibility directory for [OpenClaw](https://github.com/openclaw/openclaw) AI agent forks. Community-tested benchmarks and verdicts for 80+ devices.

**Live at [canitrunopenclaw.com](https://canitrunopenclaw.com)**

## What is this?

OpenClaw is an open-source AI agent framework with multiple community forks — each optimized for different use cases, languages, and hardware targets. This site helps you figure out which fork actually runs on your hardware.

- **80+ devices** tested across SBCs, Mini PCs, Laptops, Desktops, Phones, and Tablets
- **10+ forks** tracked with live GitHub verification
- **ClawBench** — our standardized benchmark suite that scores each fork on real hardware constraints
- **Community verdicts** and ratings from real users

## ClawBench

ClawBench is our open-source benchmarking tool that tests each OpenClaw fork inside a Docker container constrained to match a target device's CPU and memory profile.

### How it works

1. **Containerize** — Clone the fork into a Docker container with CPU/RAM limits matching the device
2. **Build** — Install dependencies using the fork's native toolchain (Go, Rust, Python, TypeScript, C)
3. **Probe** — Detect entry points, time cold start, track peak memory via cgroup, measure disk usage
4. **Score** — Combine results into a 0–100 score

### Scoring

| Component | Weight | What it measures |
|-----------|--------|-----------------|
| Latency | 30 pts | Cold start time (clone + install + startup) |
| Capabilities | 40 pts | 8 capability checks (messaging, browser, code exec, memory, files, search, MCP, tool use) |
| Size | 20 pts | Total disk footprint after install |
| Build | 10 pts | Successful install + successful startup |

**Score ranges:** 85-100 Runs Great · 60-84 Runs OK · 30-59 Barely Runs · 0-29 Won't Run

### Running ClawBench locally

```bash
cd clawbench
docker build -t clawbench .
docker run --rm \
  -e FORK_REPO=https://github.com/openclaw/openclaw \
  -e FORK_LANG=TypeScript \
  -e FORK_SLUG=openclaw \
  -e DEVICE_SLUG=my-device \
  --memory=4g --cpus=4 \
  clawbench
```

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database:** Neon Postgres + Drizzle ORM
- **Auth:** Neon Auth SDK
- **Styling:** Tailwind CSS v4
- **Analytics:** PostHog
- **Deployment:** Vercel
- **Benchmarking:** Docker + Bash (ClawBench)

## Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Fill in DATABASE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET

# Push schema to database
npm run db:push

# Seed data
npm run db:seed

# Start dev server
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon Postgres connection string |
| `NEON_AUTH_BASE_URL` | Neon Auth endpoint |
| `NEON_AUTH_COOKIE_SECRET` | Cookie encryption secret |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project API key |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL |
| `GITHUB_TOKEN` | GitHub API token (for fork verification) |

## Project Structure

```
src/
├── app/                # Next.js App Router pages
│   ├── admin/          # Admin dashboard (auth-gated)
│   ├── api/            # API routes (benchmarks, verification, tracking)
│   ├── benchmarks/     # ClawBench leaderboard
│   ├── devices/        # Device directory + detail pages
│   ├── forks/          # Fork directory + detail pages
│   ├── compare/        # Device comparison tool
│   └── profile/        # User profile + submissions
├── components/         # Shared React components
└── lib/
    ├── schema.ts       # Drizzle ORM schema
    ├── queries.ts      # Database query functions
    ├── auth.ts         # Neon Auth config
    └── seo/            # Metadata, sitemap, structured data
clawbench/
├── Dockerfile          # Multi-lang benchmark container
├── bench.sh            # Benchmark script (v2)
├── bench-all.sh        # Batch runner
└── import-results.sh   # Import JSON results to DB
```

## License

MIT
