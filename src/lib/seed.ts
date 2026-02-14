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
  if (existingDevices.count > 0) return;

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
  const getDeviceId = db().prepare("SELECT id FROM devices WHERE slug = ?");
  const getForkId = db().prepare("SELECT id FROM forks WHERE slug = ?");

  const did = (slug: string) => (getDeviceId.get(slug) as { id: number }).id;
  const fid = (slug: string) => (getForkId.get(slug) as { id: number }).id;

  const verdicts = [
    { device_id: did("esp32-s3"), fork_id: fid("mimiclaw"), verdict: "RUNS_OK", notes: "Native target for MimiClaw. GPIO and sensor control works. Limited by 8MB PSRAM.", tokens_per_sec: null, cold_start_sec: 2, warm_response_sec: 1.5 },
    { device_id: did("esp32-s3"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "No Node.js support. Completely incompatible.", tokens_per_sec: null, cold_start_sec: null, warm_response_sec: null },
    { device_id: did("esp32-s3"), fork_id: fid("picoclaw"), verdict: "WONT_RUN", notes: "Needs at least 10MB RAM and a Linux-capable SoC.", tokens_per_sec: null, cold_start_sec: null, warm_response_sec: null },
    { device_id: did("sipeed-licheerv-nano"), fork_id: fid("picoclaw"), verdict: "RUNS_OK", notes: "PicoClaw's primary target. Boots in 1 second. Limited to Telegram/Discord.", tokens_per_sec: null, cold_start_sec: 1, warm_response_sec: 2 },
    { device_id: did("sipeed-licheerv-nano"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "Only 256MB RAM. OpenClaw needs 2GB minimum.", tokens_per_sec: null, cold_start_sec: null, warm_response_sec: null },
    { device_id: did("sipeed-licheerv-nano"), fork_id: fid("nanobot"), verdict: "BARELY_RUNS", notes: "Technically possible but painfully slow. Frequent OOM crashes.", tokens_per_sec: null, cold_start_sec: 30, warm_response_sec: 8 },
    { device_id: did("raspberry-pi-zero-2-w"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw runs effortlessly with plenty of headroom.", tokens_per_sec: null, cold_start_sec: 1, warm_response_sec: 1.5 },
    { device_id: did("raspberry-pi-zero-2-w"), fork_id: fid("nanobot"), verdict: "RUNS_OK", notes: "Works but uses most of the 512MB. Close monitoring needed.", tokens_per_sec: null, cold_start_sec: 15, warm_response_sec: 5 },
    { device_id: did("raspberry-pi-zero-2-w"), fork_id: fid("nanoclaw"), verdict: "BARELY_RUNS", notes: "Container overhead on 512MB is brutal. Frequent swapping.", tokens_per_sec: null, cold_start_sec: 45, warm_response_sec: 10 },
    { device_id: did("raspberry-pi-zero-2-w"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "512MB is far below the 2GB minimum.", tokens_per_sec: null, cold_start_sec: null, warm_response_sec: null },
    { device_id: did("raspberry-pi-4-4gb"), fork_id: fid("openclaw"), verdict: "BARELY_RUNS", notes: "Meets minimum but tight. Gateway starts but expect GC crashes under load.", tokens_per_sec: null, cold_start_sec: 20, warm_response_sec: 5 },
    { device_id: did("raspberry-pi-4-4gb"), fork_id: fid("nanoclaw"), verdict: "RUNS_OK", notes: "Container isolation works. Comfortable with 1-2 conversations.", tokens_per_sec: null, cold_start_sec: 12, warm_response_sec: 3 },
    { device_id: did("raspberry-pi-4-4gb"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot barely uses 256MB. Tons of headroom here.", tokens_per_sec: null, cold_start_sec: 5, warm_response_sec: 2 },
    { device_id: did("raspberry-pi-4-4gb"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "Massive overkill for PicoClaw.", tokens_per_sec: null, cold_start_sec: 1, warm_response_sec: 0.5 },
    { device_id: did("raspberry-pi-5-8gb"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "The sweet spot. Multi-channel messaging, browser automation, and skills all work. 8 tokens/sec on 7B models.", tokens_per_sec: 8, cold_start_sec: 12, warm_response_sec: 3.2 },
    { device_id: did("raspberry-pi-5-8gb"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Plenty of RAM for container isolation with multiple groups.", tokens_per_sec: null, cold_start_sec: 8, warm_response_sec: 2 },
    { device_id: did("raspberry-pi-5-8gb"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Overkill. Multiple Nanobot instances could run simultaneously.", tokens_per_sec: null, cold_start_sec: 3, warm_response_sec: 1 },
    { device_id: did("raspberry-pi-5-8gb"), fork_id: fid("ironclaw"), verdict: "RUNS_OK", notes: "WASM sandbox runs but adds overhead. Functional for single-user.", tokens_per_sec: null, cold_start_sec: 15, warm_response_sec: 4 },
    { device_id: did("nvidia-jetson-orin-nano"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Full OpenClaw with local 7B model inference. 22 tokens/sec. The AI powerhouse.", tokens_per_sec: 22, cold_start_sec: 8, warm_response_sec: 0.8 },
    { device_id: did("nvidia-jetson-orin-nano"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Container isolation with GPU acceleration.", tokens_per_sec: null, cold_start_sec: 5, warm_response_sec: 1 },
    { device_id: did("nvidia-jetson-orin-nano"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM sandbox with GPU. Security without compromise.", tokens_per_sec: null, cold_start_sec: 6, warm_response_sec: 1.2 },
    { device_id: did("clawbox"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Purpose-built. Pre-configured with OpenClaw. 25 tokens/sec. Plug and play.", tokens_per_sec: 25, cold_start_sec: 6, warm_response_sec: 0.7 },
    { device_id: did("mac-mini-m3-16gb"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Runs beautifully. 45 tokens/sec on 7B models. Near-instant responses. Can handle 5-10 concurrent users.", tokens_per_sec: 45, cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("mac-mini-m3-16gb"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Apple Containers native. Best security + performance combo.", tokens_per_sec: null, cold_start_sec: 2, warm_response_sec: 0.3 },
    { device_id: did("mac-mini-m3-16gb"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM sandbox barely adds overhead on M3.", tokens_per_sec: null, cold_start_sec: 3, warm_response_sec: 0.5 },
    { device_id: did("mac-mini-m4-pro-24gb"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Complete overkill. Multiple agents, local 13B+ models, everything at once.", tokens_per_sec: 70, cold_start_sec: 2, warm_response_sec: 0.2 },
    { device_id: did("cloud-vps-4gb"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "Standard cloud deployment. No local models but all cloud API integrations work.", tokens_per_sec: null, cold_start_sec: 8, warm_response_sec: 2 },
    { device_id: did("cloud-vps-4gb"), fork_id: fid("moltworker"), verdict: "RUNS_GREAT", notes: "Not needed - Moltworker runs on Cloudflare edge. But would work on a VPS too.", tokens_per_sec: null, cold_start_sec: 1, warm_response_sec: 0.5 },
    { device_id: did("cloud-gpu-a100"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Enterprise-grade. 120 tokens/sec. 20-100+ concurrent users. Every feature maxed.", tokens_per_sec: 120, cold_start_sec: 2, warm_response_sec: 0.2 },
    { device_id: did("thinkpad-t480"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "Runs fine as a background service. No local models but all cloud features work well.", tokens_per_sec: null, cold_start_sec: 10, warm_response_sec: 2 },
    { device_id: did("thinkpad-t480"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Docker isolation works great. 8GB is comfortable.", tokens_per_sec: null, cold_start_sec: 6, warm_response_sec: 1.5 },
    { device_id: did("thinkpad-t480"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot barely touches these resources.", tokens_per_sec: null, cold_start_sec: 2, warm_response_sec: 0.8 },
    { device_id: did("framework-16"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "With the GPU module, runs local 7B models comfortably. Without GPU, still excellent via cloud.", tokens_per_sec: 35, cold_start_sec: 4, warm_response_sec: 0.5 },
    { device_id: did("steam-deck"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "Works in desktop mode on SteamOS. 16GB RAM is plenty. Quirky but functional.", tokens_per_sec: null, cold_start_sec: 15, warm_response_sec: 3 },
    { device_id: did("steam-deck"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot runs easily. Interesting portable AI assistant.", tokens_per_sec: null, cold_start_sec: 3, warm_response_sec: 1 },
  ];

  const verdictInsert = db().transaction(() => {
    for (const v of verdicts) insertVerdict.run(v);
  });
  verdictInsert();
}
