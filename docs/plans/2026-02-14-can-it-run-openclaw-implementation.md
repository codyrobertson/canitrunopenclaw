# Can it run OpenClaw? - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a hardware compatibility directory for OpenClaw and its forks, with device specs, compatibility verdicts, user ratings, and comments.

**Architecture:** Monolithic Next.js 15 App Router app with SQLite (better-sqlite3) for data, NextAuth.js for GitHub OAuth, Tailwind CSS v4 for styling. Nautical light theme. Server actions for mutations.

**Tech Stack:** Next.js 15, React 19, TypeScript, SQLite via better-sqlite3, NextAuth.js v5, Tailwind CSS v4, Bun

**Design Doc:** `docs/plans/2026-02-14-can-it-run-openclaw-design.md`

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Step 1: Initialize Next.js project**

Run:
```bash
cd /Users/Cody/code_projects/ciroc
bunx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-bun --turbopack
```

Accept defaults. This creates the full Next.js scaffold.

**Step 2: Install dependencies**

Run:
```bash
cd /Users/Cody/code_projects/ciroc
bun add better-sqlite3 next-auth@beta
bun add -d @types/better-sqlite3
```

**Step 3: Configure Tailwind with nautical theme**

Edit `src/app/globals.css` to set the nautical color palette:

```css
@import "tailwindcss";

@theme {
  --color-ocean-900: #023E8A;
  --color-ocean-800: #0077B6;
  --color-ocean-700: #0096C7;
  --color-ocean-600: #00B4D8;
  --color-ocean-500: #48CAE4;
  --color-ocean-400: #90E0EF;
  --color-ocean-300: #ADE8F4;
  --color-ocean-200: #CAF0F8;
  --color-ocean-100: #E8F8FD;
  --color-navy: #1B263B;
  --color-navy-light: #2D3A4F;
  --color-sand: #F8F9FA;
  --color-sand-dark: #E9ECEF;
  --color-verdict-great: #2D9F4F;
  --color-verdict-ok: #0077B6;
  --color-verdict-barely: #E07A2F;
  --color-verdict-wont: #D32F2F;
  --font-heading: "Space Grotesk", sans-serif;
  --font-body: "Inter", sans-serif;
}

body {
  font-family: var(--font-body);
  background-color: var(--color-sand);
  color: var(--color-navy);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
}
```

**Step 4: Set up root layout with fonts**

Edit `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: "Can it run OpenClaw?",
  description: "Find out if your hardware can handle the claw. A device compatibility directory for OpenClaw and its community forks.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen bg-sand text-navy antialiased">
        {children}
      </body>
    </html>
  );
}
```

**Step 5: Create a minimal home page placeholder**

Edit `src/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-5xl font-bold font-heading text-ocean-800">
        Can it run OpenClaw?
      </h1>
      <p className="mt-4 text-lg text-navy-light">
        Find out if your hardware can handle the claw.
      </p>
    </main>
  );
}
```

**Step 6: Verify it runs**

Run: `cd /Users/Cody/code_projects/ciroc && bun dev`
Expected: App runs on localhost:3000 with the heading and tagline visible.

**Step 7: Initialize git and commit**

Run:
```bash
cd /Users/Cody/code_projects/ciroc
git init
echo "node_modules/\n.next/\n*.db\n.env\n.env.local" > .gitignore
git add -A
git commit -m "feat: scaffold Next.js project with nautical theme"
```

---

## Task 2: Database Schema & Seed Data

**Files:**
- Create: `src/lib/db.ts`, `src/lib/schema.sql`, `src/lib/seed.ts`

**Step 1: Create the database connection module**

Create `src/lib/db.ts`:

```ts
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "openclaw.db");

function getDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

let _db: ReturnType<typeof getDb> | null = null;

export function db() {
  if (!_db) {
    _db = getDb();
  }
  return _db;
}
```

**Step 2: Create the SQL schema**

Create `src/lib/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  cpu TEXT,
  ram_gb REAL NOT NULL,
  storage TEXT,
  gpu TEXT,
  power_watts REAL,
  price_usd REAL,
  price_type TEXT DEFAULT 'one-time',
  image_url TEXT,
  buy_link TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS forks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  github_url TEXT,
  description TEXT,
  min_ram_mb INTEGER NOT NULL,
  min_cpu_cores INTEGER DEFAULT 1,
  min_storage_mb INTEGER DEFAULT 100,
  language TEXT,
  codebase_size_lines INTEGER,
  license TEXT,
  features TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS compatibility_verdicts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL REFERENCES devices(id),
  fork_id INTEGER NOT NULL REFERENCES forks(id),
  verdict TEXT NOT NULL CHECK(verdict IN ('RUNS_GREAT', 'RUNS_OK', 'BARELY_RUNS', 'WONT_RUN')),
  notes TEXT,
  tokens_per_sec REAL,
  cold_start_sec REAL,
  warm_response_sec REAL,
  UNIQUE(device_id, fork_id)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT
);

CREATE TABLE IF NOT EXISTS user_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL REFERENCES devices(id),
  fork_id INTEGER NOT NULL REFERENCES forks(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  stars INTEGER NOT NULL CHECK(stars >= 1 AND stars <= 5),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(device_id, fork_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL REFERENCES devices(id),
  fork_id INTEGER REFERENCES forks(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Step 3: Create the seed script**

Create `src/lib/seed.ts`:

```ts
import { db } from "./db";
import fs from "fs";
import path from "path";

export function initializeDatabase() {
  const schema = fs.readFileSync(path.join(process.cwd(), "src/lib/schema.sql"), "utf-8");
  db().exec(schema);
}

export function seedDatabase() {
  initializeDatabase();

  const existingDevices = db().prepare("SELECT COUNT(*) as count FROM devices").get() as { count: number };
  if (existingDevices.count > 0) return; // Already seeded

  const insertDevice = db().prepare(`
    INSERT INTO devices (slug, name, category, cpu, ram_gb, storage, gpu, power_watts, price_usd, price_type, description)
    VALUES (@slug, @name, @category, @cpu, @ram_gb, @storage, @gpu, @power_watts, @price_usd, @price_type, @description)
  `);

  const insertFork = db().prepare(`
    INSERT INTO forks (slug, name, github_url, description, min_ram_mb, min_cpu_cores, min_storage_mb, language, codebase_size_lines, license, features)
    VALUES (@slug, @name, @github_url, @description, @min_ram_mb, @min_cpu_cores, @min_storage_mb, @language, @codebase_size_lines, @license, @features)
  `);

  const insertVerdict = db().prepare(`
    INSERT INTO compatibility_verdicts (device_id, fork_id, verdict, notes, tokens_per_sec, cold_start_sec, warm_response_sec)
    VALUES (@device_id, @fork_id, @verdict, @notes, @tokens_per_sec, @cold_start_sec, @warm_response_sec)
  `);

  // --- FORKS ---
  const forks = [
    { slug: "openclaw", name: "OpenClaw", github_url: "https://github.com/openclaw/openclaw", description: "The original open-source autonomous AI agent. 430K+ lines of TypeScript. Connects to WhatsApp, Telegram, Slack, and 50+ services. Persistent memory, shell access, community skills.", min_ram_mb: 2048, min_cpu_cores: 2, min_storage_mb: 1000, language: "TypeScript", codebase_size_lines: 430000, license: "MIT", features: JSON.stringify(["Persistent memory", "50+ integrations", "Shell access", "Community skills", "Web browsing", "File management", "Calendar/email", "Background agents"]) },
    { slug: "nanoclaw", name: "NanoClaw", github_url: "https://github.com/qwibitai/nanoclaw", description: "Container-isolated OpenClaw alternative. Runs in Apple Containers or Docker for security. ~3K lines of TypeScript. Per-group isolation with separate memory/filesystem per conversation.", min_ram_mb: 512, min_cpu_cores: 1, min_storage_mb: 500, language: "TypeScript", codebase_size_lines: 3000, license: "MIT", features: JSON.stringify(["Container isolation", "Per-group memory", "WhatsApp integration", "Security-first", "Auditable codebase"]) },
    { slug: "nanobot", name: "Nanobot", github_url: "https://github.com/HKUDS/nanobot", description: "Ultra-lightweight personal AI assistant. 99% smaller than OpenClaw at ~4K lines of Python. MCP-based architecture with pluggable servers.", min_ram_mb: 256, min_cpu_cores: 1, min_storage_mb: 200, language: "Python", codebase_size_lines: 4000, license: "MIT", features: JSON.stringify(["MCP-based", "Telegram + WhatsApp", "Persistent memory", "Web search", "Background agents", "Pluggable servers"]) },
    { slug: "picoclaw", name: "PicoClaw", github_url: "https://github.com/sipeed/picoclaw", description: "Ultra-lightweight AI assistant in Go. Runs on <10MB RAM. Boots in 1 second on a $10 RISC-V board. Single binary across RISC-V, ARM, and x86.", min_ram_mb: 10, min_cpu_cores: 1, min_storage_mb: 50, language: "Go", codebase_size_lines: 4000, license: "Apache-2.0", features: JSON.stringify(["<10MB RAM", "1s boot time", "Single binary", "RISC-V support", "Telegram + Discord"]) },
    { slug: "mimiclaw", name: "MimiClaw", github_url: "https://github.com/nicholasgasior/mimiclaw", description: "OpenClaw for ESP32-S3 microcontrollers. Written in C with ESP-IDF 5.5. Controls GPIO, sensors, and actuators. 0.5W power consumption.", min_ram_mb: 8, min_cpu_cores: 1, min_storage_mb: 16, language: "C", codebase_size_lines: 2000, license: "MIT", features: JSON.stringify(["ESP32-S3 native", "GPIO control", "Sensor reading", "0.5W power", "Persistent memory across reboots", "Telegram integration"]) },
    { slug: "ironclaw", name: "IronClaw", github_url: "https://github.com/nicholasgasior/ironclaw", description: "Security-focused OpenClaw rewrite in Rust. All tools sandboxed in isolated WebAssembly environments. Built by NEAR AI for private key protection.", min_ram_mb: 512, min_cpu_cores: 2, min_storage_mb: 500, language: "Rust", codebase_size_lines: 15000, license: "Apache-2.0", features: JSON.stringify(["WASM sandboxing", "Rust memory safety", "Private key protection", "Capability-based permissions"]) },
    { slug: "moltworker", name: "Moltworker", github_url: "https://github.com/cloudflare/moltworker", description: "Cloudflare's serverless adaptation of OpenClaw. Runs on Cloudflare Workers with persistent state and sandboxed execution. No local hardware needed.", min_ram_mb: 0, min_cpu_cores: 0, min_storage_mb: 0, language: "JavaScript", codebase_size_lines: 8000, license: "Apache-2.0", features: JSON.stringify(["Serverless", "Cloudflare Workers", "Sandboxed execution", "Persistent state", "Global edge deployment"]) },
  ];

  const forkInsert = db().transaction(() => {
    for (const fork of forks) insertFork.run(fork);
  });
  forkInsert();

  // --- DEVICES ---
  const devices = [
    { slug: "esp32-s3", name: "ESP32-S3 (8MB PSRAM)", category: "Microcontroller", cpu: "Xtensa LX7 dual-core @ 240MHz", ram_gb: 0.008, storage: "16MB Flash", gpu: null, power_watts: 0.5, price_usd: 10, price_type: "one-time", description: "Ultra-low-power microcontroller. Only runs MimiClaw natively." },
    { slug: "sipeed-licheerv-nano", name: "Sipeed LicheeRV Nano", category: "SBC", cpu: "SOPHGO SG2002 RISC-V @ 1GHz", ram_gb: 0.256, storage: "microSD", gpu: null, power_watts: 1, price_usd: 10, price_type: "one-time", description: "Tiny RISC-V SBC. Can run PicoClaw." },
    { slug: "raspberry-pi-zero-2-w", name: "Raspberry Pi Zero 2 W", category: "SBC", cpu: "Quad-core ARM Cortex-A53 @ 1GHz", ram_gb: 0.512, storage: "microSD", gpu: "VideoCore IV", power_watts: 2.5, price_usd: 15, price_type: "one-time", description: "Tiny and cheap. Runs lightweight forks only." },
    { slug: "raspberry-pi-4-4gb", name: "Raspberry Pi 4 (4GB)", category: "SBC", cpu: "Quad-core ARM Cortex-A72 @ 1.8GHz", ram_gb: 4, storage: "microSD / USB SSD", gpu: "VideoCore VI", power_watts: 7, price_usd: 55, price_type: "one-time", description: "The baseline for running vanilla OpenClaw. Tight but workable." },
    { slug: "raspberry-pi-5-8gb", name: "Raspberry Pi 5 (8GB)", category: "SBC", cpu: "Quad-core ARM Cortex-A76 @ 2.4GHz", ram_gb: 8, storage: "microSD / NVMe via HAT", gpu: "VideoCore VII", power_watts: 5, price_usd: 80, price_type: "one-time", description: "The sweet spot for OpenClaw. Genuine headroom for multi-channel messaging and automation." },
    { slug: "nvidia-jetson-orin-nano", name: "NVIDIA Jetson Orin Nano", category: "SBC", cpu: "6-core ARM Cortex-A78AE @ 1.5GHz", ram_gb: 8, storage: "NVMe", gpu: "1024-core NVIDIA Ampere (67 TOPS)", power_watts: 15, price_usd: 300, price_type: "one-time", description: "AI powerhouse SBC. Can run local models alongside OpenClaw. 22 tokens/sec on 7B models." },
    { slug: "clawbox", name: "ClawBox", category: "Appliance", cpu: "6-core ARM Cortex-A78AE @ 1.5GHz", ram_gb: 8, storage: "512GB NVMe pre-installed", gpu: "1024-core NVIDIA Ampere (67 TOPS)", power_watts: 15, price_usd: 399, price_type: "one-time", description: "Pre-built Jetson Orin Nano Super appliance. Plug-and-play OpenClaw. 25 tokens/sec." },
    { slug: "mac-mini-m3-16gb", name: "Mac Mini M3 (16GB)", category: "Desktop", cpu: "Apple M3 (8-core)", ram_gb: 16, storage: "256GB-2TB SSD", gpu: "10-core GPU + 16-core Neural Engine", power_watts: 20, price_usd: 600, price_type: "one-time", description: "OpenClaw runs beautifully. 45 tokens/sec on 7B models. Near-instant responses." },
    { slug: "mac-mini-m4-pro-24gb", name: "Mac Mini M4 Pro (24GB)", category: "Desktop", cpu: "Apple M4 Pro (12-core)", ram_gb: 24, storage: "512GB-4TB SSD", gpu: "16-core GPU + 16-core Neural Engine", power_watts: 25, price_usd: 1400, price_type: "one-time", description: "Overkill for OpenClaw. Can run multiple agents simultaneously with local models." },
    { slug: "cloud-vps-4gb", name: "Cloud VPS (4GB)", category: "Cloud", cpu: "2-4 vCPU variable", ram_gb: 4, storage: "80GB SSD", gpu: null, power_watts: null, price_usd: 20, price_type: "monthly", description: "Basic cloud instance. Runs vanilla OpenClaw comfortably. No local models." },
    { slug: "cloud-gpu-a100", name: "Cloud GPU (A100)", category: "Cloud", cpu: "8-16 vCPU variable", ram_gb: 48, storage: "200GB+ SSD", gpu: "NVIDIA A100 80GB", power_watts: null, price_usd: 200, price_type: "monthly", description: "Enterprise cloud GPU. 120 tokens/sec. Can run any model locally. Complete overkill for just OpenClaw." },
    { slug: "thinkpad-t480", name: "ThinkPad T480 (used)", category: "Laptop", cpu: "Intel Core i5-8250U (4-core @ 1.6GHz)", ram_gb: 8, storage: "256GB SSD", gpu: "Intel UHD 620", power_watts: 45, price_usd: 150, price_type: "one-time", description: "Classic used ThinkPad. Runs OpenClaw fine as a background service. Great value." },
    { slug: "framework-16", name: "Framework Laptop 16", category: "Laptop", cpu: "AMD Ryzen 7 7840HS (8-core)", ram_gb: 32, storage: "1TB NVMe", gpu: "AMD Radeon RX 7700S (optional)", power_watts: 65, price_usd: 1400, price_type: "one-time", description: "Modular powerhouse. Runs everything plus local models with the GPU module." },
    { slug: "steam-deck", name: "Steam Deck (LCD)", category: "Handheld", cpu: "AMD APU (4-core Zen 2 @ 2.4-3.5GHz)", ram_gb: 16, storage: "64GB-512GB", gpu: "AMD RDNA 2 (8 CUs)", power_watts: 15, price_usd: 400, price_type: "one-time", description: "Gaming handheld running SteamOS (Linux). Can run OpenClaw in desktop mode." },
  ];

  const deviceInsert = db().transaction(() => {
    for (const device of devices) insertDevice.run(device);
  });
  deviceInsert();

  // --- VERDICTS ---
  // Get inserted IDs
  const getDeviceId = db().prepare("SELECT id FROM devices WHERE slug = ?");
  const getForkId = db().prepare("SELECT id FROM forks WHERE slug = ?");

  const did = (slug: string) => (getDeviceId.get(slug) as { id: number }).id;
  const fid = (slug: string) => (getForkId.get(slug) as { id: number }).id;

  const verdicts = [
    // ESP32-S3: only MimiClaw
    { device_id: did("esp32-s3"), fork_id: fid("mimiclaw"), verdict: "RUNS_OK", notes: "Native target for MimiClaw. GPIO and sensor control works. Limited by 8MB PSRAM.", tokens_per_sec: null, cold_start_sec: 2, warm_response_sec: 1.5 },
    { device_id: did("esp32-s3"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "No Node.js support. Completely incompatible.", tokens_per_sec: null, cold_start_sec: null, warm_response_sec: null },
    { device_id: did("esp32-s3"), fork_id: fid("picoclaw"), verdict: "WONT_RUN", notes: "Needs at least 10MB RAM and a Linux-capable SoC.", tokens_per_sec: null, cold_start_sec: null, warm_response_sec: null },

    // Sipeed LicheeRV Nano: PicoClaw only
    { device_id: did("sipeed-licheerv-nano"), fork_id: fid("picoclaw"), verdict: "RUNS_OK", notes: "PicoClaw's primary target. Boots in 1 second. Limited to Telegram/Discord.", tokens_per_sec: null, cold_start_sec: 1, warm_response_sec: 2 },
    { device_id: did("sipeed-licheerv-nano"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "Only 256MB RAM. OpenClaw needs 2GB minimum.", tokens_per_sec: null, cold_start_sec: null, warm_response_sec: null },
    { device_id: did("sipeed-licheerv-nano"), fork_id: fid("nanobot"), verdict: "BARELY_RUNS", notes: "Technically possible but painfully slow. Frequent OOM crashes.", tokens_per_sec: null, cold_start_sec: 30, warm_response_sec: 8 },

    // Pi Zero 2 W
    { device_id: did("raspberry-pi-zero-2-w"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw runs effortlessly with plenty of headroom.", tokens_per_sec: null, cold_start_sec: 1, warm_response_sec: 1.5 },
    { device_id: did("raspberry-pi-zero-2-w"), fork_id: fid("nanobot"), verdict: "RUNS_OK", notes: "Works but uses most of the 512MB. Close monitoring needed.", tokens_per_sec: null, cold_start_sec: 15, warm_response_sec: 5 },
    { device_id: did("raspberry-pi-zero-2-w"), fork_id: fid("nanoclaw"), verdict: "BARELY_RUNS", notes: "Container overhead on 512MB is brutal. Frequent swapping.", tokens_per_sec: null, cold_start_sec: 45, warm_response_sec: 10 },
    { device_id: did("raspberry-pi-zero-2-w"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "512MB is far below the 2GB minimum.", tokens_per_sec: null, cold_start_sec: null, warm_response_sec: null },

    // Pi 4 (4GB)
    { device_id: did("raspberry-pi-4-4gb"), fork_id: fid("openclaw"), verdict: "BARELY_RUNS", notes: "Meets minimum but tight. Gateway starts but expect GC crashes under load.", tokens_per_sec: null, cold_start_sec: 20, warm_response_sec: 5 },
    { device_id: did("raspberry-pi-4-4gb"), fork_id: fid("nanoclaw"), verdict: "RUNS_OK", notes: "Container isolation works. Comfortable with 1-2 conversations.", tokens_per_sec: null, cold_start_sec: 12, warm_response_sec: 3 },
    { device_id: did("raspberry-pi-4-4gb"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot barely uses 256MB. Tons of headroom here.", tokens_per_sec: null, cold_start_sec: 5, warm_response_sec: 2 },
    { device_id: did("raspberry-pi-4-4gb"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "Massive overkill for PicoClaw.", tokens_per_sec: null, cold_start_sec: 1, warm_response_sec: 0.5 },

    // Pi 5 (8GB)
    { device_id: did("raspberry-pi-5-8gb"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "The sweet spot. Multi-channel messaging, browser automation, and skills all work. 8 tokens/sec on 7B models.", tokens_per_sec: 8, cold_start_sec: 12, warm_response_sec: 3.2 },
    { device_id: did("raspberry-pi-5-8gb"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Plenty of RAM for container isolation with multiple groups.", tokens_per_sec: null, cold_start_sec: 8, warm_response_sec: 2 },
    { device_id: did("raspberry-pi-5-8gb"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Overkill. Multiple Nanobot instances could run simultaneously.", tokens_per_sec: null, cold_start_sec: 3, warm_response_sec: 1 },
    { device_id: did("raspberry-pi-5-8gb"), fork_id: fid("ironclaw"), verdict: "RUNS_OK", notes: "WASM sandbox runs but adds overhead. Functional for single-user.", tokens_per_sec: null, cold_start_sec: 15, warm_response_sec: 4 },

    // Jetson Orin Nano
    { device_id: did("nvidia-jetson-orin-nano"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Full OpenClaw with local 7B model inference. 22 tokens/sec. The AI powerhouse.", tokens_per_sec: 22, cold_start_sec: 8, warm_response_sec: 0.8 },
    { device_id: did("nvidia-jetson-orin-nano"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Container isolation with GPU acceleration.", tokens_per_sec: null, cold_start_sec: 5, warm_response_sec: 1 },
    { device_id: did("nvidia-jetson-orin-nano"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM sandbox with GPU. Security without compromise.", tokens_per_sec: null, cold_start_sec: 6, warm_response_sec: 1.2 },

    // ClawBox
    { device_id: did("clawbox"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Purpose-built. Pre-configured with OpenClaw. 25 tokens/sec. Plug and play.", tokens_per_sec: 25, cold_start_sec: 6, warm_response_sec: 0.7 },

    // Mac Mini M3
    { device_id: did("mac-mini-m3-16gb"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Runs beautifully. 45 tokens/sec on 7B models. Near-instant responses. Can handle 5-10 concurrent users.", tokens_per_sec: 45, cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("mac-mini-m3-16gb"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Apple Containers native. Best security + performance combo.", tokens_per_sec: null, cold_start_sec: 2, warm_response_sec: 0.3 },
    { device_id: did("mac-mini-m3-16gb"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM sandbox barely adds overhead on M3.", tokens_per_sec: null, cold_start_sec: 3, warm_response_sec: 0.5 },

    // Mac Mini M4 Pro
    { device_id: did("mac-mini-m4-pro-24gb"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Complete overkill. Multiple agents, local 13B+ models, everything at once.", tokens_per_sec: 70, cold_start_sec: 2, warm_response_sec: 0.2 },

    // Cloud VPS
    { device_id: did("cloud-vps-4gb"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "Standard cloud deployment. No local models but all cloud API integrations work.", tokens_per_sec: null, cold_start_sec: 8, warm_response_sec: 2 },
    { device_id: did("cloud-vps-4gb"), fork_id: fid("moltworker"), verdict: "RUNS_GREAT", notes: "Not needed — Moltworker runs on Cloudflare's edge. But would work on a VPS too.", tokens_per_sec: null, cold_start_sec: 1, warm_response_sec: 0.5 },

    // Cloud GPU
    { device_id: did("cloud-gpu-a100"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Enterprise-grade. 120 tokens/sec. 20-100+ concurrent users. Every feature maxed.", tokens_per_sec: 120, cold_start_sec: 2, warm_response_sec: 0.2 },

    // ThinkPad T480
    { device_id: did("thinkpad-t480"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "Runs fine as a background service. No local models but all cloud features work well.", tokens_per_sec: null, cold_start_sec: 10, warm_response_sec: 2 },
    { device_id: did("thinkpad-t480"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Docker isolation works great. 8GB is comfortable.", tokens_per_sec: null, cold_start_sec: 6, warm_response_sec: 1.5 },
    { device_id: did("thinkpad-t480"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot barely touches these resources.", tokens_per_sec: null, cold_start_sec: 2, warm_response_sec: 0.8 },

    // Framework 16
    { device_id: did("framework-16"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "With the GPU module, runs local 7B models comfortably. Without GPU, still excellent via cloud.", tokens_per_sec: 35, cold_start_sec: 4, warm_response_sec: 0.5 },

    // Steam Deck
    { device_id: did("steam-deck"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "Works in desktop mode on SteamOS. 16GB RAM is plenty. Quirky but functional.", tokens_per_sec: null, cold_start_sec: 15, warm_response_sec: 3 },
    { device_id: did("steam-deck"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot runs easily. Interesting portable AI assistant.", tokens_per_sec: null, cold_start_sec: 3, warm_response_sec: 1 },
  ];

  const verdictInsert = db().transaction(() => {
    for (const v of verdicts) insertVerdict.run(v);
  });
  verdictInsert();
}
```

**Step 4: Create a DB initialization script**

Create `scripts/seed.ts`:

```ts
import { seedDatabase } from "../src/lib/seed";
seedDatabase();
console.log("Database seeded successfully!");
```

**Step 5: Run seed and verify**

Run:
```bash
cd /Users/Cody/code_projects/ciroc
bun run scripts/seed.ts
```
Expected: "Database seeded successfully!" and `data/openclaw.db` file created.

**Step 6: Add `data/` to .gitignore, commit**

Append `data/` to `.gitignore`, then:
```bash
git add -A
git commit -m "feat: add database schema, seed data with 14 devices and 7 forks"
```

---

## Task 3: Data Access Layer (Queries)

**Files:**
- Create: `src/lib/queries.ts`

**Step 1: Create query functions**

Create `src/lib/queries.ts`:

```ts
import { db } from "./db";
import { seedDatabase } from "./seed";

// Ensure DB is initialized on first query
let initialized = false;
function ensureDb() {
  if (!initialized) {
    seedDatabase();
    initialized = true;
  }
}

export type Device = {
  id: number;
  slug: string;
  name: string;
  category: string;
  cpu: string | null;
  ram_gb: number;
  storage: string | null;
  gpu: string | null;
  power_watts: number | null;
  price_usd: number | null;
  price_type: string;
  image_url: string | null;
  buy_link: string | null;
  description: string | null;
};

export type Fork = {
  id: number;
  slug: string;
  name: string;
  github_url: string | null;
  description: string | null;
  min_ram_mb: number;
  min_cpu_cores: number;
  min_storage_mb: number;
  language: string | null;
  codebase_size_lines: number | null;
  license: string | null;
  features: string;
};

export type Verdict = {
  id: number;
  device_id: number;
  fork_id: number;
  verdict: "RUNS_GREAT" | "RUNS_OK" | "BARELY_RUNS" | "WONT_RUN";
  notes: string | null;
  tokens_per_sec: number | null;
  cold_start_sec: number | null;
  warm_response_sec: number | null;
};

export type DeviceWithScore = Device & {
  avg_rating: number | null;
  rating_count: number;
  best_verdict: string | null;
  score: number;
};

export type Comment = {
  id: number;
  device_id: number;
  fork_id: number | null;
  user_id: number;
  content: string;
  created_at: string;
  username: string;
  avatar_url: string | null;
};

// --- DEVICE QUERIES ---

export function getDevicesRanked(filters?: {
  category?: string;
  minRam?: number;
  maxPrice?: number;
  forkSlug?: string;
  search?: string;
}): DeviceWithScore[] {
  ensureDb();

  let where = "WHERE 1=1";
  const params: Record<string, unknown> = {};

  if (filters?.category) {
    where += " AND d.category = @category";
    params.category = filters.category;
  }
  if (filters?.minRam) {
    where += " AND d.ram_gb >= @minRam";
    params.minRam = filters.minRam;
  }
  if (filters?.maxPrice) {
    where += " AND d.price_usd <= @maxPrice";
    params.maxPrice = filters.maxPrice;
  }
  if (filters?.forkSlug) {
    where += " AND cv.fork_id = (SELECT id FROM forks WHERE slug = @forkSlug)";
    params.forkSlug = filters.forkSlug;
  }
  if (filters?.search) {
    where += " AND (d.name LIKE @search OR d.cpu LIKE @search OR d.description LIKE @search)";
    params.search = `%${filters.search}%`;
  }

  const sql = `
    SELECT d.*,
      COALESCE(AVG(ur.stars), 0) as avg_rating,
      COUNT(DISTINCT ur.id) as rating_count,
      (SELECT cv2.verdict FROM compatibility_verdicts cv2
       WHERE cv2.device_id = d.id
       ORDER BY CASE cv2.verdict
         WHEN 'RUNS_GREAT' THEN 4 WHEN 'RUNS_OK' THEN 3
         WHEN 'BARELY_RUNS' THEN 2 WHEN 'WONT_RUN' THEN 1
       END DESC LIMIT 1) as best_verdict,
      COALESCE(AVG(ur.stars), 0) * 0.6 +
      COALESCE((SELECT CASE cv3.verdict
        WHEN 'RUNS_GREAT' THEN 4 WHEN 'RUNS_OK' THEN 3
        WHEN 'BARELY_RUNS' THEN 2 WHEN 'WONT_RUN' THEN 1
      END FROM compatibility_verdicts cv3
      WHERE cv3.device_id = d.id
      ORDER BY CASE cv3.verdict
        WHEN 'RUNS_GREAT' THEN 4 WHEN 'RUNS_OK' THEN 3
        WHEN 'BARELY_RUNS' THEN 2 WHEN 'WONT_RUN' THEN 1
      END DESC LIMIT 1), 0) * 0.4 as score
    FROM devices d
    LEFT JOIN compatibility_verdicts cv ON cv.device_id = d.id
    LEFT JOIN user_ratings ur ON ur.device_id = d.id
    ${where}
    GROUP BY d.id
    ORDER BY score DESC, d.price_usd ASC
  `;

  return db().prepare(sql).all(params) as DeviceWithScore[];
}

export function getDeviceBySlug(slug: string): Device | undefined {
  ensureDb();
  return db().prepare("SELECT * FROM devices WHERE slug = ?").get(slug) as Device | undefined;
}

export function getVerdictsByDevice(deviceId: number): (Verdict & { fork_name: string; fork_slug: string })[] {
  ensureDb();
  return db().prepare(`
    SELECT cv.*, f.name as fork_name, f.slug as fork_slug
    FROM compatibility_verdicts cv
    JOIN forks f ON f.id = cv.fork_id
    WHERE cv.device_id = ?
    ORDER BY CASE cv.verdict
      WHEN 'RUNS_GREAT' THEN 1 WHEN 'RUNS_OK' THEN 2
      WHEN 'BARELY_RUNS' THEN 3 WHEN 'WONT_RUN' THEN 4
    END
  `).all(deviceId) as (Verdict & { fork_name: string; fork_slug: string })[];
}

// --- FORK QUERIES ---

export function getAllForks(): Fork[] {
  ensureDb();
  return db().prepare("SELECT * FROM forks ORDER BY min_ram_mb ASC").all() as Fork[];
}

export function getForkBySlug(slug: string): Fork | undefined {
  ensureDb();
  return db().prepare("SELECT * FROM forks WHERE slug = ?").get(slug) as Fork | undefined;
}

export function getDevicesByFork(forkId: number): (Device & { verdict: string; notes: string | null })[] {
  ensureDb();
  return db().prepare(`
    SELECT d.*, cv.verdict, cv.notes
    FROM devices d
    JOIN compatibility_verdicts cv ON cv.device_id = d.id
    WHERE cv.fork_id = ?
    ORDER BY CASE cv.verdict
      WHEN 'RUNS_GREAT' THEN 1 WHEN 'RUNS_OK' THEN 2
      WHEN 'BARELY_RUNS' THEN 3 WHEN 'WONT_RUN' THEN 4
    END
  `).all(forkId) as (Device & { verdict: string; notes: string | null })[];
}

// --- RATING QUERIES ---

export function getDeviceRatings(deviceId: number, forkId?: number) {
  ensureDb();
  if (forkId) {
    return db().prepare(`
      SELECT AVG(stars) as avg, COUNT(*) as count
      FROM user_ratings WHERE device_id = ? AND fork_id = ?
    `).get(deviceId, forkId) as { avg: number | null; count: number };
  }
  return db().prepare(`
    SELECT AVG(stars) as avg, COUNT(*) as count
    FROM user_ratings WHERE device_id = ?
  `).get(deviceId) as { avg: number | null; count: number };
}

export function upsertRating(deviceId: number, forkId: number, userId: number, stars: number) {
  ensureDb();
  db().prepare(`
    INSERT INTO user_ratings (device_id, fork_id, user_id, stars)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(device_id, fork_id, user_id) DO UPDATE SET stars = excluded.stars
  `).run(deviceId, forkId, userId, stars);
}

export function getUserRating(deviceId: number, forkId: number, userId: number): number | null {
  ensureDb();
  const row = db().prepare(`
    SELECT stars FROM user_ratings WHERE device_id = ? AND fork_id = ? AND user_id = ?
  `).get(deviceId, forkId, userId) as { stars: number } | undefined;
  return row?.stars ?? null;
}

// --- COMMENT QUERIES ---

export function getCommentsByDevice(deviceId: number): Comment[] {
  ensureDb();
  return db().prepare(`
    SELECT c.*, u.username, u.avatar_url
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.device_id = ?
    ORDER BY c.created_at DESC
  `).all(deviceId) as Comment[];
}

export function addComment(deviceId: number, forkId: number | null, userId: number, content: string) {
  ensureDb();
  db().prepare(`
    INSERT INTO comments (device_id, fork_id, user_id, content)
    VALUES (?, ?, ?, ?)
  `).run(deviceId, forkId, userId, content);
}

// --- USER QUERIES ---

export function upsertUser(githubId: string, username: string, avatarUrl: string | null): number {
  ensureDb();
  db().prepare(`
    INSERT INTO users (github_id, username, avatar_url)
    VALUES (?, ?, ?)
    ON CONFLICT(github_id) DO UPDATE SET username = excluded.username, avatar_url = excluded.avatar_url
  `).run(githubId, username, avatarUrl);
  const user = db().prepare("SELECT id FROM users WHERE github_id = ?").get(githubId) as { id: number };
  return user.id;
}

// --- CATEGORIES ---

export function getCategories(): string[] {
  ensureDb();
  return (db().prepare("SELECT DISTINCT category FROM devices ORDER BY category").all() as { category: string }[]).map(r => r.category);
}
```

**Step 2: Verify queries work**

Create a quick test script `scripts/test-queries.ts`:

```ts
import { getDevicesRanked, getAllForks, getDeviceBySlug, getVerdictsByDevice } from "../src/lib/queries";

console.log("=== Top Devices ===");
const devices = getDevicesRanked();
devices.slice(0, 5).forEach(d => console.log(`${d.name}: score=${d.score.toFixed(2)}, verdict=${d.best_verdict}`));

console.log("\n=== All Forks ===");
getAllForks().forEach(f => console.log(`${f.name} (${f.language}) - ${f.min_ram_mb}MB min`));

console.log("\n=== Pi 5 Verdicts ===");
const pi5 = getDeviceBySlug("raspberry-pi-5-8gb");
if (pi5) getVerdictsByDevice(pi5.id).forEach(v => console.log(`${v.fork_name}: ${v.verdict}`));
```

Run: `bun run scripts/test-queries.ts`
Expected: Lists of devices, forks, and verdicts printed to console.

**Step 3: Commit**

```bash
git add src/lib/queries.ts scripts/test-queries.ts
git commit -m "feat: add data access layer with ranked queries, ratings, and comments"
```

---

## Task 4: NextAuth.js Setup (GitHub OAuth)

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`

**Step 1: Create auth configuration**

Create `src/lib/auth.ts`:

```ts
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { upsertUser } from "./queries";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      if (profile?.login) {
        upsertUser(
          String(profile.id),
          profile.login as string,
          user.image ?? null
        );
      }
      return true;
    },
    async session({ session, token }) {
      if (token.sub) {
        // Add github_id to session
        (session as any).githubId = token.sub;
      }
      return session;
    },
    async jwt({ token, profile }) {
      if (profile) {
        token.sub = String(profile.id);
      }
      return token;
    },
  },
});
```

**Step 2: Create the API route**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

**Step 3: Create .env.local template**

Create `.env.local.example`:

```
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
AUTH_SECRET=run_npx_auth_secret_to_generate
NEXTAUTH_URL=http://localhost:3000
```

**Step 4: Generate AUTH_SECRET**

Run: `bunx auth secret`

Copy the generated secret into a new `.env.local` file.

**Step 5: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/ .env.local.example
git commit -m "feat: add NextAuth.js with GitHub OAuth"
```

---

## Task 5: Shared UI Components

**Files:**
- Create: `src/components/nav.tsx`, `src/components/verdict-badge.tsx`, `src/components/star-rating.tsx`, `src/components/device-card.tsx`, `src/components/fork-badge.tsx`, `src/components/search-bar.tsx`

**Step 1: Create navigation**

Create `src/components/nav.tsx`:

```tsx
import Link from "next/link";
import { auth, signIn, signOut } from "@/lib/auth";

export async function Nav() {
  const session = await auth();

  return (
    <nav className="border-b border-ocean-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🦀</span>
              <span className="font-heading text-lg font-bold text-ocean-800">
                Can it run OpenClaw?
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/devices" className="text-sm font-medium text-navy-light hover:text-ocean-800 transition-colors">
                Devices
              </Link>
              <Link href="/forks" className="text-sm font-medium text-navy-light hover:text-ocean-800 transition-colors">
                Forks
              </Link>
              <Link href="/compare" className="text-sm font-medium text-navy-light hover:text-ocean-800 transition-colors">
                Compare
              </Link>
            </div>
          </div>
          <div>
            {session?.user ? (
              <div className="flex items-center gap-3">
                <img
                  src={session.user.image ?? ""}
                  alt={session.user.name ?? ""}
                  className="h-8 w-8 rounded-full border border-ocean-200"
                />
                <span className="text-sm text-navy-light">{session.user.name}</span>
                <form action={async () => {
                  "use server";
                  await signOut();
                }}>
                  <button className="text-sm text-ocean-800 hover:text-ocean-600 transition-colors">
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              <form action={async () => {
                "use server";
                await signIn("github");
              }}>
                <button className="rounded-lg bg-ocean-800 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-700 transition-colors">
                  Sign in with GitHub
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
```

**Step 2: Create verdict badge**

Create `src/components/verdict-badge.tsx`:

```tsx
const VERDICT_CONFIG = {
  RUNS_GREAT: { label: "Runs Great", color: "bg-verdict-great text-white", icon: "🌊" },
  RUNS_OK: { label: "Runs OK", color: "bg-verdict-ok text-white", icon: "⚓" },
  BARELY_RUNS: { label: "Barely Runs", color: "bg-verdict-barely text-white", icon: "🔶" },
  WONT_RUN: { label: "Won't Run", color: "bg-verdict-wont text-white", icon: "☠️" },
} as const;

export function VerdictBadge({ verdict, size = "md" }: { verdict: string; size?: "sm" | "md" | "lg" }) {
  const config = VERDICT_CONFIG[verdict as keyof typeof VERDICT_CONFIG];
  if (!config) return null;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.color} ${sizeClasses[size]}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}
```

**Step 3: Create star rating component (client component)**

Create `src/components/star-rating.tsx`:

```tsx
"use client";

import { useState } from "react";

export function StarRating({
  rating,
  count,
  interactive = false,
  onRate,
  userRating,
}: {
  rating: number;
  count: number;
  interactive?: boolean;
  onRate?: (stars: number) => void;
  userRating?: number | null;
}) {
  const [hovered, setHovered] = useState(0);
  const displayRating = hovered || userRating || rating;

  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            className={`text-lg transition-colors ${
              interactive ? "cursor-pointer hover:scale-110" : "cursor-default"
            } ${star <= displayRating ? "text-amber-400" : "text-gray-300"}`}
            onMouseEnter={() => interactive && setHovered(star)}
            onMouseLeave={() => interactive && setHovered(0)}
            onClick={() => interactive && onRate?.(star)}
          >
            ★
          </button>
        ))}
      </div>
      <span className="text-sm text-navy-light">
        {rating > 0 ? `${rating.toFixed(1)}` : "No ratings"} ({count})
      </span>
    </div>
  );
}
```

**Step 4: Create device card**

Create `src/components/device-card.tsx`:

```tsx
import Link from "next/link";
import type { DeviceWithScore } from "@/lib/queries";
import { VerdictBadge } from "./verdict-badge";
import { StarRating } from "./star-rating";

function formatRam(gb: number): string {
  if (gb < 0.001) return `${Math.round(gb * 1024 * 1024)}KB`;
  if (gb < 1) return `${Math.round(gb * 1024)}MB`;
  return `${gb}GB`;
}

function formatPrice(price: number | null, type: string): string {
  if (!price) return "Free";
  return type === "monthly" ? `$${price}/mo` : `$${price}`;
}

export function DeviceCard({ device }: { device: DeviceWithScore }) {
  return (
    <Link
      href={`/devices/${device.slug}`}
      className="group block rounded-xl border border-ocean-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-ocean-400 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-ocean-600 uppercase tracking-wider">
              {device.category}
            </span>
          </div>
          <h3 className="font-heading text-lg font-semibold text-navy group-hover:text-ocean-800 transition-colors truncate">
            {device.name}
          </h3>
          <p className="mt-1 text-sm text-navy-light line-clamp-2">
            {device.description}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-ocean-800">
            {formatPrice(device.price_usd, device.price_type)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-navy-light">
        <span className="rounded bg-ocean-100 px-2 py-0.5">{formatRam(device.ram_gb)} RAM</span>
        {device.cpu && <span className="rounded bg-ocean-100 px-2 py-0.5 truncate max-w-[200px]">{device.cpu}</span>}
        {device.power_watts && <span className="rounded bg-ocean-100 px-2 py-0.5">{device.power_watts}W</span>}
      </div>

      <div className="mt-3 flex items-center justify-between">
        {device.best_verdict && <VerdictBadge verdict={device.best_verdict} size="sm" />}
        <StarRating rating={device.avg_rating ?? 0} count={device.rating_count} />
      </div>
    </Link>
  );
}
```

**Step 5: Create search bar**

Create `src/components/search-bar.tsx`:

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SearchBar({ placeholder = "Search devices..." }: { placeholder?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }
    router.push(`/devices?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-xl">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-ocean-300 bg-white px-4 py-3 pl-10 text-navy placeholder:text-ocean-400 focus:border-ocean-600 focus:outline-none focus:ring-2 focus:ring-ocean-200 transition-all"
      />
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-ocean-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </form>
  );
}
```

**Step 6: Commit**

```bash
git add src/components/
git commit -m "feat: add shared UI components (nav, verdict badges, star ratings, device cards, search)"
```

---

## Task 6: Home Page

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`

**Step 1: Add Nav to layout**

Edit `src/app/layout.tsx` to include the Nav component in the body:

```tsx
import { Nav } from "@/components/nav";
// ... existing imports ...

// In the body:
<body className="min-h-screen bg-sand text-navy antialiased">
  <Nav />
  {children}
</body>
```

**Step 2: Build the home page**

Replace `src/app/page.tsx`:

```tsx
import Link from "next/link";
import { getDevicesRanked, getAllForks } from "@/lib/queries";
import { DeviceCard } from "@/components/device-card";
import { SearchBar } from "@/components/search-bar";
import { VerdictBadge } from "@/components/verdict-badge";

export default function Home() {
  const topDevices = getDevicesRanked().slice(0, 6);
  const forks = getAllForks();

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-ocean-200 via-ocean-100 to-sand py-20">
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 1200 600" fill="none">
            <path d="M0 300 Q300 200 600 300 Q900 400 1200 300 V600 H0Z" fill="currentColor" className="text-ocean-600" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <h1 className="font-heading text-5xl font-bold text-navy sm:text-6xl">
            Can it run{" "}
            <span className="text-ocean-800">OpenClaw</span>
            <span className="text-ocean-600">?</span>
          </h1>
          <p className="mt-4 text-xl text-navy-light">
            Find out if your hardware can handle the claw. Browse {topDevices.length}+ devices
            across {forks.length} OpenClaw forks.
          </p>
          <div className="mt-8 flex justify-center">
            <SearchBar placeholder="Search devices by name, CPU, or description..." />
          </div>
        </div>
      </section>

      {/* Top Rated Devices */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-heading text-2xl font-bold text-navy">
            Top Rated Devices
          </h2>
          <Link href="/devices" className="text-sm font-medium text-ocean-800 hover:text-ocean-600 transition-colors">
            View all →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topDevices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      </section>

      {/* Fork Overview */}
      <section className="bg-white border-y border-ocean-200">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <h2 className="font-heading text-2xl font-bold text-navy mb-8">
            OpenClaw Forks
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {forks.map((fork) => (
              <Link
                key={fork.id}
                href={`/forks/${fork.slug}`}
                className="group rounded-xl border border-ocean-200 p-5 hover:border-ocean-400 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono font-medium text-ocean-600 bg-ocean-100 px-2 py-0.5 rounded">
                    {fork.language}
                  </span>
                  <span className="text-xs text-navy-light">
                    {fork.min_ram_mb < 1024 ? `${fork.min_ram_mb}MB` : `${(fork.min_ram_mb / 1024).toFixed(0)}GB`} min
                  </span>
                </div>
                <h3 className="font-heading text-lg font-semibold text-navy group-hover:text-ocean-800 transition-colors">
                  {fork.name}
                </h3>
                <p className="mt-1 text-sm text-navy-light line-clamp-2">
                  {fork.description}
                </p>
                {fork.codebase_size_lines && (
                  <p className="mt-2 text-xs text-ocean-600">
                    {fork.codebase_size_lines.toLocaleString()} lines of code
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ocean-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center text-sm text-navy-light">
          <p>
            🦀 Can it run OpenClaw? — An open hardware compatibility directory.
          </p>
          <p className="mt-1">
            Not affiliated with{" "}
            <a href="https://github.com/openclaw/openclaw" className="text-ocean-800 hover:underline" target="_blank" rel="noopener">
              OpenClaw
            </a>.
            Data sourced from community benchmarks and official documentation.
          </p>
        </div>
      </footer>
    </main>
  );
}
```

**Step 3: Verify home page renders**

Run: `bun dev`
Visit localhost:3000. Expect: Hero with search, top devices grid, forks section, footer.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: build home page with hero, device leaderboard, and fork overview"
```

---

## Task 7: Devices List Page

**Files:**
- Create: `src/app/devices/page.tsx`

**Step 1: Create devices page with filters**

Create `src/app/devices/page.tsx`:

```tsx
import { getDevicesRanked, getCategories, getAllForks } from "@/lib/queries";
import { DeviceCard } from "@/components/device-card";
import { SearchBar } from "@/components/search-bar";
import Link from "next/link";

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; fork?: string; maxPrice?: string }>;
}) {
  const params = await searchParams;
  const devices = getDevicesRanked({
    search: params.q,
    category: params.category,
    forkSlug: params.fork,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
  });
  const categories = getCategories();
  const forks = getAllForks();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-heading text-3xl font-bold text-navy mb-6">
        All Devices
      </h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="lg:w-64 shrink-0">
          <div className="rounded-xl border border-ocean-200 bg-white p-5 space-y-6 sticky top-24">
            <div>
              <SearchBar placeholder="Search..." />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-navy mb-2">Category</h3>
              <div className="space-y-1">
                <Link
                  href="/devices"
                  className={`block text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    !params.category ? "bg-ocean-100 text-ocean-800 font-medium" : "text-navy-light hover:bg-ocean-50"
                  }`}
                >
                  All
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat}
                    href={`/devices?category=${cat}${params.q ? `&q=${params.q}` : ""}`}
                    className={`block text-sm px-3 py-1.5 rounded-lg transition-colors ${
                      params.category === cat ? "bg-ocean-100 text-ocean-800 font-medium" : "text-navy-light hover:bg-ocean-50"
                    }`}
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-navy mb-2">Compatible Fork</h3>
              <div className="space-y-1">
                <Link
                  href={`/devices${params.category ? `?category=${params.category}` : ""}`}
                  className={`block text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    !params.fork ? "bg-ocean-100 text-ocean-800 font-medium" : "text-navy-light hover:bg-ocean-50"
                  }`}
                >
                  All Forks
                </Link>
                {forks.map((fork) => (
                  <Link
                    key={fork.id}
                    href={`/devices?fork=${fork.slug}${params.category ? `&category=${params.category}` : ""}${params.q ? `&q=${params.q}` : ""}`}
                    className={`block text-sm px-3 py-1.5 rounded-lg transition-colors ${
                      params.fork === fork.slug ? "bg-ocean-100 text-ocean-800 font-medium" : "text-navy-light hover:bg-ocean-50"
                    }`}
                  >
                    {fork.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Device Grid */}
        <div className="flex-1">
          <p className="text-sm text-navy-light mb-4">
            {devices.length} device{devices.length !== 1 ? "s" : ""} found
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {devices.map((device) => (
              <DeviceCard key={device.id} device={device} />
            ))}
          </div>
          {devices.length === 0 && (
            <div className="text-center py-12 text-navy-light">
              <p className="text-lg">No devices match your filters.</p>
              <Link href="/devices" className="mt-2 text-ocean-800 hover:underline">Clear filters</Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
```

**Step 2: Verify and commit**

Run: `bun dev`, visit `/devices`. Expect: Filterable device grid with sidebar.

```bash
git add -A
git commit -m "feat: add filterable devices list page with category and fork filters"
```

---

## Task 8: Device Detail Page

**Files:**
- Create: `src/app/devices/[slug]/page.tsx`, `src/components/comment-section.tsx`, `src/app/actions.ts`

**Step 1: Create server actions for rating and commenting**

Create `src/app/actions.ts`:

```ts
"use server";

import { auth } from "@/lib/auth";
import { upsertRating, addComment } from "@/lib/queries";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function rateDevice(deviceId: number, forkId: number, stars: number) {
  const session = await auth();
  if (!session?.user) throw new Error("Must be signed in");

  const githubId = (session as any).githubId;
  const user = db().prepare("SELECT id FROM users WHERE github_id = ?").get(githubId) as { id: number } | undefined;
  if (!user) throw new Error("User not found");

  upsertRating(deviceId, forkId, user.id, stars);
  revalidatePath(`/devices`);
}

export async function postComment(deviceId: number, forkId: number | null, content: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Must be signed in");
  if (!content.trim()) throw new Error("Comment cannot be empty");
  if (content.length > 2000) throw new Error("Comment too long");

  const githubId = (session as any).githubId;
  const user = db().prepare("SELECT id FROM users WHERE github_id = ?").get(githubId) as { id: number } | undefined;
  if (!user) throw new Error("User not found");

  addComment(deviceId, forkId, user.id, content.trim());
  revalidatePath(`/devices`);
}
```

**Step 2: Create comment section (client component)**

Create `src/components/comment-section.tsx`:

```tsx
"use client";

import { useState } from "react";
import { postComment } from "@/app/actions";
import type { Comment } from "@/lib/queries";

export function CommentSection({
  comments,
  deviceId,
  isSignedIn,
}: {
  comments: Comment[];
  deviceId: number;
  isSignedIn: boolean;
}) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await postComment(deviceId, null, content);
      setContent("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h3 className="font-heading text-xl font-semibold text-navy mb-4">
        Comments ({comments.length})
      </h3>

      {isSignedIn ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your experience with this device..."
            rows={3}
            maxLength={2000}
            className="w-full rounded-xl border border-ocean-300 bg-white px-4 py-3 text-navy placeholder:text-ocean-400 focus:border-ocean-600 focus:outline-none focus:ring-2 focus:ring-ocean-200 transition-all resize-none"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="rounded-lg bg-ocean-800 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mb-6 text-sm text-navy-light bg-ocean-100 rounded-lg p-3">
          Sign in with GitHub to leave a comment.
        </p>
      )}

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-lg border border-ocean-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              {comment.avatar_url && (
                <img src={comment.avatar_url} alt="" className="h-6 w-6 rounded-full" />
              )}
              <span className="text-sm font-medium text-navy">{comment.username}</span>
              <span className="text-xs text-navy-light">
                {new Date(comment.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-navy-light whitespace-pre-wrap">{comment.content}</p>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-navy-light text-center py-4">No comments yet. Be the first!</p>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Create device detail page**

Create `src/app/devices/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDeviceBySlug, getVerdictsByDevice, getCommentsByDevice, getDeviceRatings } from "@/lib/queries";
import { auth } from "@/lib/auth";
import { VerdictBadge } from "@/components/verdict-badge";
import { StarRating } from "@/components/star-rating";
import { CommentSection } from "@/components/comment-section";

function formatRam(gb: number): string {
  if (gb < 0.001) return `${Math.round(gb * 1024 * 1024)}KB`;
  if (gb < 1) return `${Math.round(gb * 1024)}MB`;
  return `${gb}GB`;
}

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const device = getDeviceBySlug(slug);
  if (!device) notFound();

  const verdicts = getVerdictsByDevice(device.id);
  const comments = getCommentsByDevice(device.id);
  const ratings = getDeviceRatings(device.id);
  const session = await auth();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-navy-light mb-6">
        <Link href="/devices" className="hover:text-ocean-800">Devices</Link>
        <span className="mx-2">/</span>
        <span className="text-navy">{device.name}</span>
      </nav>

      {/* Header */}
      <div className="rounded-xl border border-ocean-200 bg-white p-8 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-medium text-ocean-600 uppercase tracking-wider">
              {device.category}
            </span>
            <h1 className="font-heading text-3xl font-bold text-navy mt-1">
              {device.name}
            </h1>
            <p className="mt-2 text-navy-light">{device.description}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-ocean-800">
              {device.price_usd ? (device.price_type === "monthly" ? `$${device.price_usd}/mo` : `$${device.price_usd}`) : "Free"}
            </div>
            {device.buy_link && (
              <a href={device.buy_link} target="_blank" rel="noopener" className="mt-1 text-sm text-ocean-600 hover:underline">
                Buy →
              </a>
            )}
          </div>
        </div>

        {/* Specs */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg bg-ocean-50 p-3">
            <div className="text-xs text-ocean-600 font-medium">RAM</div>
            <div className="text-lg font-semibold text-navy">{formatRam(device.ram_gb)}</div>
          </div>
          {device.cpu && (
            <div className="rounded-lg bg-ocean-50 p-3">
              <div className="text-xs text-ocean-600 font-medium">CPU</div>
              <div className="text-sm font-semibold text-navy">{device.cpu}</div>
            </div>
          )}
          {device.gpu && (
            <div className="rounded-lg bg-ocean-50 p-3">
              <div className="text-xs text-ocean-600 font-medium">GPU</div>
              <div className="text-sm font-semibold text-navy">{device.gpu}</div>
            </div>
          )}
          {device.power_watts && (
            <div className="rounded-lg bg-ocean-50 p-3">
              <div className="text-xs text-ocean-600 font-medium">Power</div>
              <div className="text-lg font-semibold text-navy">{device.power_watts}W</div>
            </div>
          )}
        </div>

        {/* Overall Rating */}
        <div className="mt-6">
          <StarRating rating={ratings.avg ?? 0} count={ratings.count} />
        </div>
      </div>

      {/* Compatibility Verdicts */}
      <div className="rounded-xl border border-ocean-200 bg-white p-8 mb-6">
        <h2 className="font-heading text-xl font-semibold text-navy mb-4">
          Fork Compatibility
        </h2>
        <div className="space-y-4">
          {verdicts.map((v) => (
            <div key={v.id} className="flex items-start gap-4 rounded-lg border border-ocean-100 p-4">
              <VerdictBadge verdict={v.verdict} />
              <div className="flex-1">
                <Link href={`/forks/${v.fork_slug}`} className="font-medium text-navy hover:text-ocean-800">
                  {v.fork_name}
                </Link>
                {v.notes && <p className="mt-1 text-sm text-navy-light">{v.notes}</p>}
                <div className="mt-2 flex gap-4 text-xs text-navy-light">
                  {v.tokens_per_sec && <span>⚡ {v.tokens_per_sec} tok/s</span>}
                  {v.cold_start_sec && <span>🧊 {v.cold_start_sec}s cold start</span>}
                  {v.warm_response_sec && <span>🔥 {v.warm_response_sec}s warm</span>}
                </div>
              </div>
            </div>
          ))}
          {verdicts.length === 0 && (
            <p className="text-sm text-navy-light text-center py-4">No compatibility data yet.</p>
          )}
        </div>
      </div>

      {/* Comments */}
      <div className="rounded-xl border border-ocean-200 bg-white p-8">
        <CommentSection
          comments={comments}
          deviceId={device.id}
          isSignedIn={!!session?.user}
        />
      </div>
    </main>
  );
}
```

**Step 4: Verify and commit**

Run: `bun dev`, visit `/devices/raspberry-pi-5-8gb`. Expect: Full device detail with specs, verdicts, and comment area.

```bash
git add -A
git commit -m "feat: add device detail page with verdicts, ratings, and comments"
```

---

## Task 9: Forks Pages

**Files:**
- Create: `src/app/forks/page.tsx`, `src/app/forks/[slug]/page.tsx`

**Step 1: Create forks list page**

Create `src/app/forks/page.tsx`:

```tsx
import Link from "next/link";
import { getAllForks } from "@/lib/queries";

export default function ForksPage() {
  const forks = getAllForks();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-heading text-3xl font-bold text-navy mb-2">
        OpenClaw Forks
      </h1>
      <p className="text-navy-light mb-8">
        From the full 430K-line original to a 10MB Go binary for RISC-V boards.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        {forks.map((fork) => {
          const features = JSON.parse(fork.features) as string[];
          return (
            <Link
              key={fork.id}
              href={`/forks/${fork.slug}`}
              className="group rounded-xl border border-ocean-200 bg-white p-6 hover:border-ocean-400 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading text-xl font-semibold text-navy group-hover:text-ocean-800 transition-colors">
                  {fork.name}
                </h2>
                <span className="text-xs font-mono text-ocean-600 bg-ocean-100 px-2 py-1 rounded">
                  {fork.language}
                </span>
              </div>
              <p className="text-sm text-navy-light mb-4">{fork.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs rounded bg-ocean-50 border border-ocean-200 px-2 py-1">
                  {fork.min_ram_mb < 1024 ? `${fork.min_ram_mb}MB` : `${(fork.min_ram_mb / 1024).toFixed(0)}GB`} min RAM
                </span>
                <span className="text-xs rounded bg-ocean-50 border border-ocean-200 px-2 py-1">
                  {fork.min_cpu_cores} CPU core{fork.min_cpu_cores > 1 ? "s" : ""}
                </span>
                {fork.codebase_size_lines && (
                  <span className="text-xs rounded bg-ocean-50 border border-ocean-200 px-2 py-1">
                    {fork.codebase_size_lines.toLocaleString()} LOC
                  </span>
                )}
                <span className="text-xs rounded bg-ocean-50 border border-ocean-200 px-2 py-1">
                  {fork.license}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {features.slice(0, 4).map((f) => (
                  <span key={f} className="text-xs text-ocean-700 bg-ocean-100 px-2 py-0.5 rounded-full">
                    {f}
                  </span>
                ))}
                {features.length > 4 && (
                  <span className="text-xs text-navy-light px-2 py-0.5">
                    +{features.length - 4} more
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
```

**Step 2: Create fork detail page**

Create `src/app/forks/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getForkBySlug, getDevicesByFork } from "@/lib/queries";
import { VerdictBadge } from "@/components/verdict-badge";

function formatRam(gb: number): string {
  if (gb < 0.001) return `${Math.round(gb * 1024 * 1024)}KB`;
  if (gb < 1) return `${Math.round(gb * 1024)}MB`;
  return `${gb}GB`;
}

export default async function ForkDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const fork = getForkBySlug(slug);
  if (!fork) notFound();

  const devices = getDevicesByFork(fork.id);
  const features = JSON.parse(fork.features) as string[];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-navy-light mb-6">
        <Link href="/forks" className="hover:text-ocean-800">Forks</Link>
        <span className="mx-2">/</span>
        <span className="text-navy">{fork.name}</span>
      </nav>

      {/* Header */}
      <div className="rounded-xl border border-ocean-200 bg-white p-8 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-navy">
              {fork.name}
            </h1>
            <p className="mt-2 text-navy-light">{fork.description}</p>
          </div>
          {fork.github_url && (
            <a
              href={fork.github_url}
              target="_blank"
              rel="noopener"
              className="shrink-0 rounded-lg border border-ocean-200 px-4 py-2 text-sm font-medium text-navy hover:bg-ocean-50 transition-colors"
            >
              GitHub →
            </a>
          )}
        </div>

        {/* Requirements */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg bg-ocean-50 p-3">
            <div className="text-xs text-ocean-600 font-medium">Min RAM</div>
            <div className="text-lg font-semibold text-navy">
              {fork.min_ram_mb < 1024 ? `${fork.min_ram_mb}MB` : `${(fork.min_ram_mb / 1024).toFixed(0)}GB`}
            </div>
          </div>
          <div className="rounded-lg bg-ocean-50 p-3">
            <div className="text-xs text-ocean-600 font-medium">Min CPU</div>
            <div className="text-lg font-semibold text-navy">{fork.min_cpu_cores} core{fork.min_cpu_cores > 1 ? "s" : ""}</div>
          </div>
          <div className="rounded-lg bg-ocean-50 p-3">
            <div className="text-xs text-ocean-600 font-medium">Language</div>
            <div className="text-lg font-semibold text-navy">{fork.language}</div>
          </div>
          {fork.codebase_size_lines && (
            <div className="rounded-lg bg-ocean-50 p-3">
              <div className="text-xs text-ocean-600 font-medium">Codebase</div>
              <div className="text-lg font-semibold text-navy">{fork.codebase_size_lines.toLocaleString()} LOC</div>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-navy mb-2">Features</h3>
          <div className="flex flex-wrap gap-2">
            {features.map((f) => (
              <span key={f} className="text-sm text-ocean-700 bg-ocean-100 px-3 py-1 rounded-full">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Compatible Devices */}
      <div className="rounded-xl border border-ocean-200 bg-white p-8">
        <h2 className="font-heading text-xl font-semibold text-navy mb-4">
          Compatible Devices ({devices.length})
        </h2>
        <div className="space-y-3">
          {devices.map((d) => (
            <Link
              key={d.id}
              href={`/devices/${d.slug}`}
              className="flex items-center gap-4 rounded-lg border border-ocean-100 p-4 hover:border-ocean-300 transition-colors"
            >
              <VerdictBadge verdict={d.verdict} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-navy">{d.name}</div>
                <div className="text-xs text-navy-light">
                  {formatRam(d.ram_gb)} RAM · {d.category} · {d.price_usd ? (d.price_type === "monthly" ? `$${d.price_usd}/mo` : `$${d.price_usd}`) : "Free"}
                </div>
              </div>
              {d.notes && <p className="text-xs text-navy-light max-w-xs truncate hidden sm:block">{d.notes}</p>}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
```

**Step 3: Verify and commit**

Run: `bun dev`, visit `/forks` and `/forks/picoclaw`. Expect: Fork list with feature tags, and detail page with compatible devices.

```bash
git add -A
git commit -m "feat: add forks list page and fork detail page with compatible devices"
```

---

## Task 10: Compare Page

**Files:**
- Create: `src/app/compare/page.tsx`

**Step 1: Create comparison page**

Create `src/app/compare/page.tsx`:

```tsx
import { getDevicesRanked, getVerdictsByDevice } from "@/lib/queries";
import { VerdictBadge } from "@/components/verdict-badge";
import Link from "next/link";

function formatRam(gb: number): string {
  if (gb < 0.001) return `${Math.round(gb * 1024 * 1024)}KB`;
  if (gb < 1) return `${Math.round(gb * 1024)}MB`;
  return `${gb}GB`;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ devices?: string }>;
}) {
  const params = await searchParams;
  const allDevices = getDevicesRanked();
  const selectedSlugs = params.devices?.split(",").filter(Boolean) ?? [];
  const selectedDevices = selectedSlugs
    .map((slug) => allDevices.find((d) => d.slug === slug))
    .filter(Boolean) as typeof allDevices;

  const verdictsByDevice = selectedDevices.map((d) => ({
    device: d,
    verdicts: getVerdictsByDevice(d.id),
  }));

  // Get all unique fork names across selected devices
  const allForkNames = [...new Set(verdictsByDevice.flatMap((v) => v.verdicts.map((vv) => vv.fork_name)))];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-heading text-3xl font-bold text-navy mb-2">
        Compare Devices
      </h1>
      <p className="text-navy-light mb-8">
        Select up to 3 devices to compare side-by-side.
      </p>

      {/* Device Selector */}
      <div className="mb-8 flex flex-wrap gap-2">
        {allDevices.map((d) => {
          const isSelected = selectedSlugs.includes(d.slug);
          const newSlugs = isSelected
            ? selectedSlugs.filter((s) => s !== d.slug)
            : [...selectedSlugs, d.slug].slice(0, 3);
          return (
            <Link
              key={d.id}
              href={`/compare?devices=${newSlugs.join(",")}`}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors border ${
                isSelected
                  ? "bg-ocean-800 text-white border-ocean-800"
                  : "bg-white text-navy-light border-ocean-200 hover:border-ocean-400"
              } ${!isSelected && selectedSlugs.length >= 3 ? "opacity-50 pointer-events-none" : ""}`}
            >
              {d.name}
            </Link>
          );
        })}
      </div>

      {/* Comparison Table */}
      {selectedDevices.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-ocean-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ocean-200">
                <th className="p-4 text-left font-medium text-ocean-600 bg-ocean-50 w-40">Spec</th>
                {selectedDevices.map((d) => (
                  <th key={d.id} className="p-4 text-left font-heading font-semibold text-navy bg-ocean-50">
                    <Link href={`/devices/${d.slug}`} className="hover:text-ocean-800">{d.name}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-ocean-100">
                <td className="p-4 font-medium text-navy-light">Category</td>
                {selectedDevices.map((d) => <td key={d.id} className="p-4">{d.category}</td>)}
              </tr>
              <tr className="border-b border-ocean-100">
                <td className="p-4 font-medium text-navy-light">CPU</td>
                {selectedDevices.map((d) => <td key={d.id} className="p-4 text-xs">{d.cpu ?? "—"}</td>)}
              </tr>
              <tr className="border-b border-ocean-100">
                <td className="p-4 font-medium text-navy-light">RAM</td>
                {selectedDevices.map((d) => <td key={d.id} className="p-4 font-semibold">{formatRam(d.ram_gb)}</td>)}
              </tr>
              <tr className="border-b border-ocean-100">
                <td className="p-4 font-medium text-navy-light">GPU</td>
                {selectedDevices.map((d) => <td key={d.id} className="p-4 text-xs">{d.gpu ?? "—"}</td>)}
              </tr>
              <tr className="border-b border-ocean-100">
                <td className="p-4 font-medium text-navy-light">Power</td>
                {selectedDevices.map((d) => <td key={d.id} className="p-4">{d.power_watts ? `${d.power_watts}W` : "—"}</td>)}
              </tr>
              <tr className="border-b border-ocean-100">
                <td className="p-4 font-medium text-navy-light">Price</td>
                {selectedDevices.map((d) => (
                  <td key={d.id} className="p-4 font-semibold text-ocean-800">
                    {d.price_usd ? (d.price_type === "monthly" ? `$${d.price_usd}/mo` : `$${d.price_usd}`) : "Free"}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-ocean-100">
                <td className="p-4 font-medium text-navy-light">Best Verdict</td>
                {selectedDevices.map((d) => (
                  <td key={d.id} className="p-4">
                    {d.best_verdict ? <VerdictBadge verdict={d.best_verdict} size="sm" /> : "—"}
                  </td>
                ))}
              </tr>

              {/* Per-fork verdicts */}
              {allForkNames.map((forkName) => (
                <tr key={forkName} className="border-b border-ocean-100">
                  <td className="p-4 font-medium text-navy-light">{forkName}</td>
                  {verdictsByDevice.map(({ device, verdicts }) => {
                    const v = verdicts.find((vv) => vv.fork_name === forkName);
                    return (
                      <td key={device.id} className="p-4">
                        {v ? <VerdictBadge verdict={v.verdict} size="sm" /> : <span className="text-navy-light">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedDevices.length === 0 && (
        <div className="text-center py-16 text-navy-light">
          <p className="text-lg">Select devices above to compare.</p>
        </div>
      )}
    </main>
  );
}
```

**Step 2: Verify and commit**

Run: `bun dev`, visit `/compare?devices=raspberry-pi-5-8gb,mac-mini-m3-16gb,esp32-s3`. Expect: Side-by-side comparison table.

```bash
git add -A
git commit -m "feat: add device comparison page with side-by-side specs and verdicts"
```

---

## Task 11: Final Polish & Verification

**Step 1: Update layout with consistent footer, verify all routes**

Manually test each route:
- `/` - Home page
- `/devices` - Device list with filters
- `/devices/raspberry-pi-5-8gb` - Device detail
- `/forks` - Forks list
- `/forks/openclaw` - Fork detail
- `/compare?devices=raspberry-pi-5-8gb,mac-mini-m3-16gb` - Compare

**Step 2: Check for TypeScript errors**

Run: `bunx tsc --noEmit`
Expected: No errors.

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final polish and verification pass"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Project scaffolding | Next.js + Tailwind + nautical theme |
| 2 | Database schema & seed | SQLite schema, 14 devices, 7 forks, 35+ verdicts |
| 3 | Data access layer | Query functions with ranking algorithm |
| 4 | Auth setup | NextAuth.js with GitHub OAuth |
| 5 | Shared components | Nav, verdict badges, star ratings, device cards, search |
| 6 | Home page | Hero, leaderboard, fork overview |
| 7 | Devices list | Filterable directory with sidebar |
| 8 | Device detail | Specs, verdicts, ratings, comments |
| 9 | Forks pages | List + detail with compatible devices |
| 10 | Compare page | Side-by-side device comparison |
| 11 | Final polish | TypeScript check, manual verification |
