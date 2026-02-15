# Platform Expansion Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Transform "Can it run OpenClaw?" from a static directory into a full platform with icons, SEO, affiliate monetization, user submissions, and benchmarking.

**Architecture:** Next.js App Router SSR + SQLite. pSEO via static params generation. ClawBench as a separate Docker-based CLI tool that reports results to the site.

**Tech Stack:** Next.js 16, lucide-react, better-sqlite3, Docker, next/metadata API

---

## Phase 1: Foundation

### 1. Icon System
- Install `lucide-react`
- Replace all emoji with Lucide icons across every component
- Category icons: Cpu (SBC), Cloud, Monitor (Desktop), Laptop, CircuitBoard (MCU), Smartphone (Phone), HardDrive (NAS), Server, Gamepad2 (Handheld), Router, Home (Appliance), Tablet
- Verdict icons: Waves (RUNS_GREAT), Anchor (RUNS_OK), AlertTriangle (BARELY_RUNS), XCircle (WONT_RUN)
- Keep crab emoji for brand logo only

### 2. SEO Infrastructure
- Add `generateMetadata()` to every page with title, description, og tags
- Add JSON-LD structured data (Product, Review, BreadcrumbList)
- Create `sitemap.ts` and `robots.ts` at app root
- Canonical URLs on all pages

### 3. Affiliate Link Wrapper
- New DB table `affiliate_links`: device_id, network (amazon/newegg/bestbuy/aliexpress), url, affiliate_tag
- `/go/[slug]` redirect route that logs clicks and redirects with affiliate params
- Seed existing `buy_link` data into new table
- Update device cards and detail pages to use `/go/[slug]` links

## Phase 2: pSEO Pages

### 4. Fork+Device Combo Pages
- `/can/[fork]/run-on/[device]` - "Can OpenClaw run on Raspberry Pi 5?"
- `generateStaticParams()` from all verdict combinations (~900 pages)
- Unique content: verdict, specs comparison vs requirements, cold start data, user submissions

### 5. Category Landing Pages
- `/best/[category]-for-[fork]` - "Best SBC for OpenClaw"
- Ranked device lists filtered by category+fork, with verdict distribution

### 6. Auto-Comparison Pages
- `/compare/[device1]-vs-[device2]` - "Raspberry Pi 5 vs Orange Pi 5"
- Generate for devices in same category with similar price/specs
- Side-by-side specs + verdict comparison

### 7. Setup Guides
- `/guides/[fork]-on-[device]` - "How to install OpenClaw on Raspberry Pi 5"
- Auto-generated from fork requirements + device specs
- Install steps, expected performance, tips

## Phase 3: User Features

### 8. User Verdict Submissions
- New DB table `user_verdicts`: user_id, device_id, fork_id, verdict, notes, evidence_url, verified (bool), created_at
- Submission form on device detail pages (auth required)
- Community verdicts shown separately from official verdicts
- Evidence upload: screenshot URL or ClawBench result ID

### 9. Upvote System
- New DB table `verdict_votes`: user_id, user_verdict_id, vote (+1/-1)
- High-voted submissions get "Community Verified" badge
- Sort community verdicts by vote count

## Phase 4: ClawBench

### 10. ClawBench CLI Tool
- Docker-based benchmark tool: `docker run clawbench --fork openclaw --memory 8g --cpus 4`
- Measures: cold start, warm response latency, memory usage over time, CPU usage, concurrent channel count, stability (1hr uptime), skill execution success
- Outputs JSON results + human-readable summary
- Can submit results to site via API

### 11. Docker Testing Harness
- Resource-constrained Docker containers simulating target hardware
- `--memory` and `--cpus` flags to match device specs
- Automated test matrix: run each fork at various resource levels
- Results feed back into official verdicts

### 12. Fork Repo Verification
- Script to check each fork's actual repo for: README requirements, Dockerfile, package.json dependencies, minimum specs
- Update seed data with verified requirements
