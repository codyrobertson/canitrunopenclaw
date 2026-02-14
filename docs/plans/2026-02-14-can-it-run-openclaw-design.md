# Can it run OpenClaw? - Design Document

**Date:** 2026-02-14
**Status:** Approved

## Overview

A hardware compatibility directory for OpenClaw and its community forks. Users can browse devices, see compatibility verdicts, rate devices, and leave comments. Higher-rated devices rank higher in listings.

Inspired by "Can it run Crysis?" but for the OpenClaw AI agent ecosystem.

## Decisions

- **Tech Stack:** Next.js 15 (App Router) + SQLite (better-sqlite3) + Tailwind CSS
- **Auth:** GitHub OAuth via NextAuth.js
- **Visual Theme:** Nautical light - ocean blues, sandy whites, claw/anchor motifs
- **Data:** Real OpenClaw forks with real specs (NanoClaw, PicoClaw, Nanobot, etc.)
- **Rating System:** Editorial tiered verdicts + user 5-star ratings
- **Architecture:** Monolithic Next.js app, single deployment

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Hero + search + top-rated device leaderboard + featured forks |
| `/devices` | Filterable device directory |
| `/devices/[slug]` | Device specs, per-fork verdicts, user ratings, comments |
| `/forks` | All OpenClaw forks with requirements |
| `/forks/[slug]` | Fork detail, features, requirements, compatible devices |
| `/compare` | Side-by-side device comparison (2-3 devices) |

## Data Model

### devices
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| slug | TEXT UNIQUE | URL-friendly name |
| name | TEXT | Display name |
| category | TEXT | SBC, Desktop, Laptop, Server, Microcontroller, Cloud, Handheld, Appliance |
| cpu | TEXT | CPU description |
| ram_gb | REAL | RAM in GB (can be fractional for MB devices, e.g., 0.008 for 8MB) |
| storage | TEXT | Storage description |
| gpu | TEXT | GPU if applicable |
| power_watts | REAL | Typical power consumption |
| price_usd | REAL | Approximate price |
| price_type | TEXT | "one-time" or "monthly" |
| image_url | TEXT | Device photo |
| buy_link | TEXT | Purchase link |
| description | TEXT | Brief description |

### forks
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| slug | TEXT UNIQUE | URL-friendly name |
| name | TEXT | Display name |
| github_url | TEXT | Repository URL |
| description | TEXT | What it does |
| min_ram_mb | INTEGER | Minimum RAM in MB |
| min_cpu_cores | INTEGER | Minimum CPU cores |
| min_storage_mb | INTEGER | Minimum storage in MB |
| language | TEXT | Primary language |
| codebase_size_lines | INTEGER | Lines of code |
| license | TEXT | License type |
| features | TEXT | JSON array of feature strings |

### compatibility_verdicts
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| device_id | INTEGER FK | References devices |
| fork_id | INTEGER FK | References forks |
| verdict | TEXT | RUNS_GREAT, RUNS_OK, BARELY_RUNS, WONT_RUN |
| notes | TEXT | Explanation |
| tokens_per_sec | REAL | Benchmark if available |
| cold_start_sec | REAL | Cold start time |
| warm_response_sec | REAL | Warm response time |

### user_ratings
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| device_id | INTEGER FK | References devices |
| fork_id | INTEGER FK | References forks |
| user_id | INTEGER FK | References users |
| stars | INTEGER | 1-5 |
| created_at | TEXT | ISO timestamp |
| UNIQUE(device_id, fork_id, user_id) | | One rating per user per device+fork combo |

### comments
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| device_id | INTEGER FK | References devices |
| fork_id | INTEGER FK | Nullable, references forks |
| user_id | INTEGER FK | References users |
| content | TEXT | Comment body |
| created_at | TEXT | ISO timestamp |

### users
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| github_id | TEXT UNIQUE | GitHub user ID |
| username | TEXT | GitHub username |
| avatar_url | TEXT | GitHub avatar |

## Ranking Algorithm

Devices ranked by weighted score:
```
score = (avg_user_rating * 0.6) + (verdict_score * 0.4)
```
Where verdict_score: RUNS_GREAT=4, RUNS_OK=3, BARELY_RUNS=2, WONT_RUN=1

Devices with more ratings get a confidence boost (Wilson score interval for tie-breaking).

## Visual Design

**Palette:**
- Primary: #0077B6 (deep ocean blue)
- Secondary: #00B4D8 (bright cyan)
- Accent: #90E0EF (light sky blue)
- Background: #F8F9FA (off-white)
- Surface: #CAF0F8 (ice blue tint)
- Text: #1B263B (dark navy)

**Typography:** Inter (body), Space Grotesk (headings)

**Verdict Badges:**
- RUNS_GREAT: Green wave badge
- RUNS_OK: Blue anchor badge
- BARELY_RUNS: Orange buoy badge
- WONT_RUN: Red skull-and-crossbones badge

## Seed Data

### Forks (7)
1. **OpenClaw** (vanilla) - 430K lines, TypeScript, 2GB RAM min, Node.js 22+
2. **NanoClaw** - 3K lines, TypeScript, ~512MB RAM, container-isolated
3. **Nanobot** - 4K lines, Python, ~256MB RAM, MCP-based
4. **PicoClaw** - 4K lines, Go, <10MB RAM, runs on RISC-V
5. **MimiClaw** - C (ESP-IDF), 8MB PSRAM, for ESP32-S3
6. **IronClaw** - Rust, WASM sandbox, security-focused
7. **Moltworker** - JS, serverless, Cloudflare Workers

### Devices (14)
1. ESP32-S3 (8MB PSRAM) - Microcontroller, $5-15
2. Sipeed LicheeRV Nano - SBC, $10, 256MB
3. Raspberry Pi Zero 2 W - SBC, $15, 512MB
4. Raspberry Pi 4 (4GB) - SBC, $55, 4GB
5. Raspberry Pi 5 (8GB) - SBC, $80, 8GB
6. NVIDIA Jetson Orin Nano - SBC, $280-350, 8GB
7. ClawBox (Jetson based) - Appliance, $399, 8GB
8. Mac Mini M3 (16GB) - Desktop, $600, 16GB
9. Mac Mini M4 Pro (24GB) - Desktop, $1400, 24GB
10. Generic Cloud VPS (4GB) - Cloud, $20/mo, 4GB
11. Cloud GPU (A100) - Cloud, $200/mo, 32-64GB
12. Old ThinkPad T480 - Laptop, $150 used, 8GB
13. Framework 16 - Laptop, $1400, 32GB
14. Steam Deck - Handheld, $400, 16GB

## Out of Scope (v1)
- User-submitted devices (admin-seeded only)
- Real-time notifications
- API for third-party consumption
- Internationalization
- Device benchmarking tool
