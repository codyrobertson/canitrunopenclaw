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
    INSERT INTO forks (slug, name, github_url, description, tagline, creator, created_year, github_stars, maturity, last_commit_date, min_ram_mb, min_cpu_cores, min_storage_mb, language, codebase_size_lines, license, features)
    VALUES (@slug, @name, @github_url, @description, @tagline, @creator, @created_year, @github_stars, @maturity, @last_commit_date, @min_ram_mb, @min_cpu_cores, @min_storage_mb, @language, @codebase_size_lines, @license, @features)
  `);

  const insertVerdict = db().prepare(`
    INSERT INTO compatibility_verdicts (device_id, fork_id, verdict, notes, cold_start_sec, warm_response_sec)
    VALUES (@device_id, @fork_id, @verdict, @notes, @cold_start_sec, @warm_response_sec)
  `);

  // --- FORKS ---
  const forks = [
    { slug: "openclaw", name: "OpenClaw", github_url: "https://github.com/openclaw/openclaw", description: "The original open-source autonomous AI agent. 430K+ lines of TypeScript. Connects to WhatsApp, Telegram, Slack, and 50+ services. Persistent memory, shell access, community skills. The most feature-complete fork with the largest community.", tagline: "The original autonomous AI agent", creator: "OpenClaw Foundation", created_year: 2023, github_stars: 42800, maturity: "stable", last_commit_date: "2026-02-12", min_ram_mb: 2048, min_cpu_cores: 2, min_storage_mb: 1000, language: "TypeScript", codebase_size_lines: 430000, license: "MIT", features: JSON.stringify(["Persistent memory", "50+ integrations", "Shell access", "Community skills", "Web browsing", "File management", "Calendar/email", "Background agents"]) },
    { slug: "nanoclaw", name: "NanoClaw", github_url: "https://github.com/qwibitai/nanoclaw", description: "Container-isolated OpenClaw alternative. Runs in Apple Containers or Docker for security. ~3K lines of TypeScript. Per-group isolation with separate memory/filesystem per conversation. Each chat gets its own sandboxed environment.", tagline: "Security through isolation", creator: "Qwibit AI", created_year: 2025, github_stars: 3200, maturity: "beta", last_commit_date: "2026-02-10", min_ram_mb: 512, min_cpu_cores: 1, min_storage_mb: 500, language: "TypeScript", codebase_size_lines: 3000, license: "MIT", features: JSON.stringify(["Container isolation", "Per-group memory", "WhatsApp integration", "Security-first", "Auditable codebase"]) },
    { slug: "nanobot", name: "Nanobot", github_url: "https://github.com/HKUDS/nanobot", description: "Ultra-lightweight personal AI assistant. 99% smaller than OpenClaw at ~4K lines of Python. MCP-based architecture with pluggable servers. Built for people who want a simple, hackable AI companion.", tagline: "99% smaller, 100% personal", creator: "HKUDS Research Group", created_year: 2025, github_stars: 8900, maturity: "stable", last_commit_date: "2026-02-08", min_ram_mb: 256, min_cpu_cores: 1, min_storage_mb: 200, language: "Python", codebase_size_lines: 4000, license: "MIT", features: JSON.stringify(["MCP-based", "Telegram + WhatsApp", "Persistent memory", "Web search", "Background agents", "Pluggable servers"]) },
    { slug: "picoclaw", name: "PicoClaw", github_url: "https://github.com/sipeed/picoclaw", description: "Ultra-lightweight AI assistant in Go. Runs on <10MB RAM. Boots in 1 second on a $10 RISC-V board. Single binary across RISC-V, ARM, and x86. The smallest fork that can still hold a conversation.", tagline: "AI on a $10 board", creator: "Sipeed Community", created_year: 2025, github_stars: 5600, maturity: "stable", last_commit_date: "2026-01-28", min_ram_mb: 10, min_cpu_cores: 1, min_storage_mb: 50, language: "Go", codebase_size_lines: 4000, license: "Apache-2.0", features: JSON.stringify(["<10MB RAM", "1s boot time", "Single binary", "RISC-V support", "Telegram + Discord"]) },
    { slug: "mimiclaw", name: "MimiClaw", github_url: "https://github.com/nicholasgasior/mimiclaw", description: "OpenClaw for ESP32-S3 microcontrollers. Written in C with ESP-IDF 5.5. Controls GPIO, sensors, and actuators. 0.5W power consumption. Perfect for IoT and home automation with AI.", tagline: "AI meets microcontrollers", creator: "Nicholas Gasior", created_year: 2025, github_stars: 1800, maturity: "beta", last_commit_date: "2026-01-15", min_ram_mb: 8, min_cpu_cores: 1, min_storage_mb: 16, language: "C", codebase_size_lines: 2000, license: "MIT", features: JSON.stringify(["ESP32-S3 native", "GPIO control", "Sensor reading", "0.5W power", "Persistent memory across reboots", "Telegram integration"]) },
    { slug: "ironclaw", name: "IronClaw", github_url: "https://github.com/nicholasgasior/ironclaw", description: "Security-focused OpenClaw rewrite in Rust. All tools sandboxed in isolated WebAssembly environments. Built by NEAR AI for private key protection. Zero unsafe code. Formal verification of core logic.", tagline: "Trust no tool", creator: "NEAR AI", created_year: 2024, github_stars: 6400, maturity: "beta", last_commit_date: "2026-02-11", min_ram_mb: 512, min_cpu_cores: 2, min_storage_mb: 500, language: "Rust", codebase_size_lines: 15000, license: "Apache-2.0", features: JSON.stringify(["WASM sandboxing", "Rust memory safety", "Private key protection", "Capability-based permissions"]) },
    { slug: "moltworker", name: "Moltworker", github_url: "https://github.com/cloudflare/moltworker", description: "Cloudflare's serverless adaptation of OpenClaw. Runs on Cloudflare Workers with persistent state and sandboxed execution. No local hardware needed. Pay-per-request pricing. Global edge deployment in 300+ cities.", tagline: "OpenClaw at the edge", creator: "Cloudflare Labs", created_year: 2025, github_stars: 4100, maturity: "stable", last_commit_date: "2026-02-13", min_ram_mb: 0, min_cpu_cores: 0, min_storage_mb: 0, language: "JavaScript", codebase_size_lines: 8000, license: "Apache-2.0", features: JSON.stringify(["Serverless", "Cloudflare Workers", "Sandboxed execution", "Persistent state", "Global edge deployment"]) },
    { slug: "swiftclaw", name: "SwiftClaw", github_url: "https://github.com/nicholasgasior/swiftclaw", description: "Native iOS/macOS OpenClaw client written in Swift. Runs as a background process on Apple devices. Deep integration with Shortcuts, Siri, and Apple Intelligence. Uses on-device Core ML for lightweight inference.", tagline: "OpenClaw, designed by Apple fans", creator: "Ravi Patel", created_year: 2025, github_stars: 2900, maturity: "beta", last_commit_date: "2026-02-06", min_ram_mb: 512, min_cpu_cores: 2, min_storage_mb: 200, language: "Swift", codebase_size_lines: 12000, license: "MIT", features: JSON.stringify(["Native iOS/macOS", "Siri integration", "Shortcuts automation", "Core ML inference", "iCloud sync", "Apple Watch companion"]) },
    { slug: "clawlixir", name: "ClawLixir", github_url: "https://github.com/nicholasgasior/clawlixir", description: "Elixir/OTP implementation of OpenClaw built for massive concurrency. Each conversation is a supervised process. Hot code reloading. Handles 10,000+ concurrent users on a single node. Phoenix LiveView dashboard.", tagline: "Let it crash, let it claw", creator: "Kai Sasaki", created_year: 2024, github_stars: 3700, maturity: "stable", last_commit_date: "2026-02-09", min_ram_mb: 1024, min_cpu_cores: 2, min_storage_mb: 500, language: "Elixir", codebase_size_lines: 18000, license: "MIT", features: JSON.stringify(["OTP supervision trees", "Hot code reloading", "10K+ concurrent users", "Phoenix LiveView dashboard", "Distributed clustering", "Telegram + Discord + Slack"]) },
    { slug: "clawpp", name: "Claw++", github_url: "https://github.com/nicholasgasior/clawpp", description: "High-performance C++ fork targeting embedded Linux and edge devices. Runs on OpenWrt routers, Raspberry Pi, and industrial SBCs. 100ms cold start. Static linking for zero-dependency deployment.", tagline: "Bare metal AI agent", creator: "EdgeAI Collective", created_year: 2025, github_stars: 1200, maturity: "alpha", last_commit_date: "2026-01-20", min_ram_mb: 64, min_cpu_cores: 1, min_storage_mb: 30, language: "C++", codebase_size_lines: 9000, license: "GPL-3.0", features: JSON.stringify(["Embedded Linux", "OpenWrt support", "100ms cold start", "Static binary", "MQTT integration", "GPIO via sysfs"]) },
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
    // --- New devices ---
    { slug: "orange-pi-5", name: "Orange Pi 5 (8GB)", category: "SBC", cpu: "Rockchip RK3588S (8-core, 4x A76 + 4x A55)", ram_gb: 8, storage: "eMMC / NVMe", gpu: "Mali-G610 MP4", power_watts: 10, price_usd: 88, price_type: "one-time", description: "Powerful ARM SBC with RK3588S. Better CPU performance than Raspberry Pi 5. NPU for AI inference." },
    { slug: "intel-nuc-13-pro", name: "Intel NUC 13 Pro", category: "Mini PC", cpu: "Intel Core i5-1340P (12-core)", ram_gb: 16, storage: "512GB NVMe", gpu: "Intel Iris Xe", power_watts: 28, price_usd: 550, price_type: "one-time", description: "Ultra-compact x86 mini PC. Silent operation. Perfect always-on OpenClaw server." },
    { slug: "beelink-ser5-max", name: "Beelink SER5 Max", category: "Mini PC", cpu: "AMD Ryzen 7 5800H (8-core @ 3.2GHz)", ram_gb: 32, storage: "500GB NVMe", gpu: "AMD Radeon Vega 8", power_watts: 54, price_usd: 380, price_type: "one-time", description: "Affordable mini PC with desktop-class Ryzen. Great value for a dedicated OpenClaw box." },
    { slug: "synology-ds224plus", name: "Synology DS224+", category: "NAS", cpu: "Intel Celeron J4125 (4-core @ 2.0GHz)", ram_gb: 2, storage: "2x 3.5\" SATA bays", gpu: null, power_watts: 20, price_usd: 300, price_type: "one-time", description: "Popular 2-bay NAS. Runs Docker containers. Can host lightweight forks alongside file storage." },
    { slug: "cheap-android-phone", name: "TCL 30 SE (Budget Android)", category: "Phone", cpu: "MediaTek Helio G25 (8-core @ 2.0GHz)", ram_gb: 4, storage: "128GB", gpu: "PowerVR GE8320", power_watts: 5, price_usd: 30, price_type: "one-time", description: "Sub-$30 Walmart Android phone. Can run Termux + lightweight forks. Surprisingly capable for the price." },
    { slug: "samsung-galaxy-s24", name: "Samsung Galaxy S24", category: "Phone", cpu: "Snapdragon 8 Gen 3 (8-core)", ram_gb: 8, storage: "256GB", gpu: "Adreno 750", power_watts: 6, price_usd: 800, price_type: "one-time", description: "Flagship Android phone. Termux + proot-distro gives full Linux. Can run vanilla OpenClaw via cloud APIs." },
    { slug: "rock-5b", name: "Radxa ROCK 5B", category: "SBC", cpu: "Rockchip RK3588 (8-core, 4x A76 + 4x A55)", ram_gb: 16, storage: "eMMC / NVMe / microSD", gpu: "Mali-G610 MP4 + 6 TOPS NPU", power_watts: 12, price_usd: 150, price_type: "one-time", description: "Powerful ARM SBC with 16GB RAM and 6 TOPS NPU. Near-desktop performance for AI workloads." },
    { slug: "libre-le-potato", name: "Libre Computer Le Potato", category: "SBC", cpu: "Amlogic S905X (4-core A53 @ 1.5GHz)", ram_gb: 2, storage: "microSD / eMMC", gpu: "Mali-450 MP3", power_watts: 5, price_usd: 35, price_type: "one-time", description: "Raspberry Pi 3B form-factor alternative. 2GB RAM. Budget SBC for lightweight forks." },
    // --- SBCs (15 more) ---
    { slug: "banana-pi-bpi-m7", name: "Banana Pi BPI-M7", category: "SBC", cpu: "Rockchip RK3588 (8-core, 4x A76 + 4x A55)", ram_gb: 16, storage: "eMMC / NVMe / microSD", gpu: "Mali-G610 MP4 + 6 TOPS NPU", power_watts: 12, price_usd: 120, price_type: "one-time", description: "High-end ARM SBC with RK3588. 16GB RAM and NVMe support make it a serious OpenClaw contender. NPU useful for local inference." },
    { slug: "pine64-rock64", name: "Pine64 ROCK64", category: "SBC", cpu: "Rockchip RK3328 (4-core A53 @ 1.5GHz)", ram_gb: 4, storage: "eMMC / microSD", gpu: "Mali-450 MP2", power_watts: 5, price_usd: 35, price_type: "one-time", description: "Budget ARM SBC from Pine64. 4GB RAM is enough for lightweight forks. Decent community support." },
    { slug: "beaglebone-black", name: "BeagleBone Black", category: "SBC", cpu: "TI AM3358 (1-core A8 @ 1GHz)", ram_gb: 0.512, storage: "4GB eMMC / microSD", gpu: null, power_watts: 3, price_usd: 55, price_type: "one-time", description: "Industrial-grade SBC with real-time PRU co-processors. Only 512MB RAM limits it to lightweight forks." },
    { slug: "beaglebone-ai-64", name: "BeagleBone AI-64", category: "SBC", cpu: "TI TDA4VM (2x A72 + 4x R5F + C7x DSP, 8 TOPS)", ram_gb: 4, storage: "16GB eMMC / microSD", gpu: null, power_watts: 15, price_usd: 180, price_type: "one-time", description: "Industrial AI SBC with 8 TOPS of neural network acceleration. 4GB RAM supports mid-tier forks. Serious edge AI platform." },
    { slug: "milk-v-mars", name: "Milk-V Mars", category: "SBC", cpu: "StarFive JH7110 RISC-V (4-core @ 1.5GHz)", ram_gb: 8, storage: "eMMC / microSD", gpu: null, power_watts: 5, price_usd: 50, price_type: "one-time", description: "Affordable RISC-V SBC with 8GB RAM. PicoClaw runs natively on RISC-V. OpenClaw works but slower than ARM equivalents." },
    { slug: "odroid-n2-plus", name: "ODROID-N2+", category: "SBC", cpu: "Amlogic S922X (4x A73 + 2x A53)", ram_gb: 4, storage: "eMMC / microSD", gpu: "Mali-G52 MP6", power_watts: 7, price_usd: 80, price_type: "one-time", description: "Hardkernel's fastest Amlogic SBC. 4GB RAM handles lightweight forks well. Rock-solid stability and mainline Linux support." },
    { slug: "khadas-vim4", name: "Khadas VIM4", category: "SBC", cpu: "Amlogic A311D2 (4x A73 + 4x A53)", ram_gb: 8, storage: "eMMC / microSD", gpu: "Mali-G52 MP8 + 3.2 TOPS NPU", power_watts: 10, price_usd: 170, price_type: "one-time", description: "Premium SBC with NPU for AI acceleration. 8GB RAM and fast I/O make it good for OpenClaw with local inference." },
    { slug: "asus-tinker-board-2s", name: "Asus Tinker Board 2S", category: "SBC", cpu: "Rockchip RK3399 (2x A72 + 4x A53)", ram_gb: 4, storage: "16GB eMMC / microSD", gpu: "Mali-T860 MP4", power_watts: 8, price_usd: 95, price_type: "one-time", description: "ASUS-quality SBC with RK3399. 4GB RAM and good I/O. Reliable but older chip compared to RK3588 boards." },
    { slug: "lattepanda-3-delta", name: "LattePanda 3 Delta", category: "SBC", cpu: "Intel N5105 (4-core Jasper Lake @ 2.9GHz)", ram_gb: 8, storage: "64GB eMMC / M.2 SATA", gpu: "Intel UHD Graphics", power_watts: 15, price_usd: 220, price_type: "one-time", description: "x86 SBC with Intel N5105. Full Windows/Linux compatibility. 8GB RAM runs OpenClaw natively without ARM quirks." },
    { slug: "coral-dev-board", name: "Coral Dev Board", category: "SBC", cpu: "NXP i.MX8M (4x A53 + 1x M4F)", ram_gb: 4, storage: "8GB eMMC / microSD", gpu: "Google Edge TPU (4 TOPS)", power_watts: 10, price_usd: 150, price_type: "one-time", description: "Google's Edge TPU board for ML inference. 4GB RAM handles lightweight forks. TPU accelerates specific model architectures." },
    { slug: "raspberry-pi-3b-plus", name: "Raspberry Pi 3B+", category: "SBC", cpu: "Quad-core ARM Cortex-A53 @ 1.4GHz", ram_gb: 1, storage: "microSD", gpu: "VideoCore IV", power_watts: 5, price_usd: 35, price_type: "one-time", description: "The classic Pi. 1GB RAM is very tight. Only lightweight forks like PicoClaw and Nanobot are practical." },
    { slug: "raspberry-pi-400", name: "Raspberry Pi 400", category: "SBC", cpu: "Quad-core ARM Cortex-A72 @ 1.8GHz", ram_gb: 4, storage: "microSD", gpu: "VideoCore VI", power_watts: 7, price_usd: 70, price_type: "one-time", description: "Pi 4 in a keyboard form factor. 4GB RAM handles mid-tier forks. Neat self-contained package for a desk setup." },
    { slug: "pine-a64-plus", name: "Pine A64+", category: "SBC", cpu: "Allwinner A64 (4-core A53 @ 1.2GHz)", ram_gb: 2, storage: "microSD", gpu: "Mali-400 MP2", power_watts: 4, price_usd: 30, price_type: "one-time", description: "Early 64-bit ARM SBC. 2GB RAM and slow storage limit it to PicoClaw and Nanobot. Cheap but dated." },
    { slug: "pine64-star64", name: "PINE64 Star64", category: "SBC", cpu: "StarFive JH7110 RISC-V (4-core @ 1.5GHz)", ram_gb: 8, storage: "eMMC / microSD", gpu: null, power_watts: 5, price_usd: 70, price_type: "one-time", description: "Pine64's RISC-V board with 8GB RAM. Good PicoClaw target. OpenClaw works but RISC-V software ecosystem is still maturing." },
    { slug: "visionfive-2", name: "VisionFive 2", category: "SBC", cpu: "StarFive JH7110 RISC-V (4-core @ 1.5GHz)", ram_gb: 8, storage: "eMMC / microSD / M.2 NVMe", gpu: null, power_watts: 5, price_usd: 65, price_type: "one-time", description: "StarFive's flagship RISC-V SBC. NVMe support is a nice touch. 8GB RAM is enough for OpenClaw if you're patient with RISC-V performance." },
    // --- Mini PCs (8 more) ---
    { slug: "minisforum-um780-xtx", name: "Minisforum UM780 XTX", category: "Mini PC", cpu: "AMD Ryzen 7 7840HS (8-core @ 3.8-5.1GHz)", ram_gb: 32, storage: "1TB NVMe", gpu: "AMD Radeon 780M (RDNA 3, 12 CUs)", power_watts: 65, price_usd: 530, price_type: "one-time", description: "Top-tier mini PC with Ryzen 7840HS. 32GB RAM and iGPU handle everything including local models. Whisper-quiet." },
    { slug: "gmktec-nucbox-k8", name: "GMKtec NucBox K8", category: "Mini PC", cpu: "Intel Core i5-12450H (8-core @ 2.0-4.4GHz)", ram_gb: 16, storage: "512GB NVMe", gpu: "Intel UHD Graphics", power_watts: 45, price_usd: 350, price_type: "one-time", description: "Budget x86 mini PC with 12th-gen Intel. 16GB RAM is comfortable for OpenClaw. Good bang for the buck." },
    { slug: "beelink-mini-s12-pro", name: "Beelink Mini S12 Pro", category: "Mini PC", cpu: "Intel N100 (4-core E-core @ 3.4GHz)", ram_gb: 16, storage: "500GB NVMe", gpu: "Intel UHD Graphics", power_watts: 15, price_usd: 170, price_type: "one-time", description: "Ultra-low-power N100 mini PC. 16GB RAM at $170 is incredible value. Perfect silent always-on OpenClaw server." },
    { slug: "geekom-mini-it12", name: "Geekom Mini IT12", category: "Mini PC", cpu: "Intel Core i7-12650H (10-core @ 2.3-4.7GHz)", ram_gb: 32, storage: "1TB NVMe", gpu: "Intel Iris Xe", power_watts: 45, price_usd: 500, price_type: "one-time", description: "Powerful mini PC with 12th-gen i7. 32GB RAM and fast NVMe. Can handle multiple agents and services concurrently." },
    { slug: "asus-pn53", name: "ASUS PN53", category: "Mini PC", cpu: "AMD Ryzen 7 6800U (8-core @ 2.7-4.7GHz)", ram_gb: 16, storage: "512GB NVMe", gpu: "AMD Radeon 680M (RDNA 2, 12 CUs)", power_watts: 28, price_usd: 450, price_type: "one-time", description: "ASUS mini PC with Zen 3+ and RDNA 2 iGPU. Compact and efficient. 16GB RAM handles OpenClaw plus services." },
    { slug: "lenovo-thinkcentre-m75q", name: "Lenovo ThinkCentre M75q Tiny", category: "Mini PC", cpu: "AMD Ryzen 5 5600GE (6-core @ 3.4-4.4GHz)", ram_gb: 16, storage: "256GB NVMe", gpu: "AMD Radeon Vega 7", power_watts: 35, price_usd: 380, price_type: "one-time", description: "Enterprise-grade tiny desktop. ThinkCentre reliability. 16GB RAM and Ryzen 5600GE make it a solid always-on AI host." },
    { slug: "mac-mini-m1", name: "Mac Mini M1 (used)", category: "Mini PC", cpu: "Apple M1 (8-core)", ram_gb: 8, storage: "256GB SSD", gpu: "7-core GPU + 16-core Neural Engine", power_watts: 15, price_usd: 400, price_type: "one-time", description: "The original Apple Silicon Mac Mini. Still excellent for OpenClaw. SwiftClaw runs natively. Great used value." },
    { slug: "lattepanda-sigma", name: "LattePanda Sigma", category: "Mini PC", cpu: "Intel Core i5-1340P (12-core @ 1.9-4.6GHz)", ram_gb: 16, storage: "500GB NVMe", gpu: "Intel Iris Xe", power_watts: 28, price_usd: 500, price_type: "one-time", description: "x86 SBC/mini PC hybrid. Dual Ethernet, multiple M.2 slots. Versatile platform for OpenClaw with expansion options." },
    // --- Desktops (6 more) ---
    { slug: "mac-studio-m2-max", name: "Mac Studio M2 Max", category: "Desktop", cpu: "Apple M2 Max (12-core)", ram_gb: 32, storage: "512GB-8TB SSD", gpu: "30-core GPU + 16-core Neural Engine", power_watts: 50, price_usd: 2000, price_type: "one-time", description: "Pro desktop powerhouse. 32GB unified memory runs 13B+ models locally. 60+ tokens/sec. Multiple concurrent agents easy." },
    { slug: "custom-pc-5600x-3060", name: "Custom PC (Ryzen 5600X + RTX 3060)", category: "Desktop", cpu: "AMD Ryzen 5 5600X (6-core @ 3.7-4.6GHz)", ram_gb: 32, storage: "1TB NVMe", gpu: "NVIDIA RTX 3060 12GB", power_watts: 250, price_usd: 800, price_type: "one-time", description: "Mid-range gaming/AI PC. RTX 3060 12GB handles 7B models at 30+ tokens/sec. Great value for local AI workloads." },
    { slug: "custom-pc-i5-12400", name: "Custom PC (i5-12400 Budget)", category: "Desktop", cpu: "Intel Core i5-12400 (6-core @ 2.5-4.4GHz)", ram_gb: 16, storage: "500GB NVMe", gpu: "Intel UHD 730", power_watts: 150, price_usd: 450, price_type: "one-time", description: "Budget desktop build. No dGPU but 16GB RAM runs OpenClaw via cloud APIs perfectly. Low power for always-on use." },
    { slug: "dell-optiplex-micro-7010", name: "Dell OptiPlex Micro 7010", category: "Desktop", cpu: "Intel Core i5-13500T (14-core @ 1.6-4.6GHz)", ram_gb: 16, storage: "256GB NVMe", gpu: "Intel UHD 770", power_watts: 35, price_usd: 650, price_type: "one-time", description: "Ultra-small form factor enterprise desktop. 13th-gen i5 with 14 cores. Silent and reliable for always-on operation." },
    { slug: "mac-pro-m2-ultra", name: "Mac Pro M2 Ultra", category: "Desktop", cpu: "Apple M2 Ultra (24-core)", ram_gb: 192, storage: "1TB-8TB SSD", gpu: "76-core GPU + 32-core Neural Engine", power_watts: 120, price_usd: 7000, price_type: "one-time", description: "Absurd overkill for OpenClaw. 192GB unified memory can run 70B+ models locally. Runs dozens of concurrent agents without breaking a sweat." },
    { slug: "hp-z2-mini-g9", name: "HP Z2 Mini G9", category: "Desktop", cpu: "Intel Core i7-12700 (12-core @ 2.1-4.9GHz)", ram_gb: 32, storage: "512GB NVMe", gpu: "Intel UHD 770 / optional NVIDIA T1000", power_watts: 65, price_usd: 1200, price_type: "one-time", description: "Workstation-class mini desktop. ISV-certified. 32GB RAM and optional dGPU. Enterprise-grade reliability for production deployments." },
    // --- Laptops (8 more) ---
    { slug: "macbook-air-m2", name: "MacBook Air M2", category: "Laptop", cpu: "Apple M2 (8-core)", ram_gb: 16, storage: "512GB SSD", gpu: "10-core GPU + 16-core Neural Engine", power_watts: 30, price_usd: 1100, price_type: "one-time", description: "Fanless ultrabook with Apple Silicon. 16GB unified memory runs OpenClaw and local 7B models simultaneously. SwiftClaw native." },
    { slug: "macbook-pro-14-m3-pro", name: "MacBook Pro 14\" M3 Pro", category: "Laptop", cpu: "Apple M3 Pro (12-core)", ram_gb: 18, storage: "512GB SSD", gpu: "18-core GPU + 16-core Neural Engine", power_watts: 40, price_usd: 2000, price_type: "one-time", description: "Pro laptop with M3 Pro. 18GB RAM handles 7B models at 50+ tokens/sec. Battery lasts all day even running agents." },
    { slug: "thinkpad-x1-carbon-gen11", name: "ThinkPad X1 Carbon Gen 11", category: "Laptop", cpu: "Intel Core i7-1365U (10-core @ 1.8-5.2GHz)", ram_gb: 16, storage: "512GB NVMe", gpu: "Intel Iris Xe", power_watts: 30, price_usd: 1400, price_type: "one-time", description: "Premium business ultrabook. 16GB RAM and fast SSD. Runs OpenClaw as a background service while you work. Enterprise-grade build." },
    { slug: "dell-xps-15", name: "Dell XPS 15", category: "Laptop", cpu: "Intel Core i7-13700H (14-core @ 2.4-5.0GHz)", ram_gb: 32, storage: "1TB NVMe", gpu: "NVIDIA RTX 4060 Laptop 8GB", power_watts: 65, price_usd: 1700, price_type: "one-time", description: "Premium laptop with discrete GPU. RTX 4060 handles 7B models at 35+ tokens/sec. 32GB RAM is plenty for everything." },
    { slug: "system76-lemur-pro", name: "System76 Lemur Pro", category: "Laptop", cpu: "Intel Core i7-1355U (10-core @ 1.7-5.0GHz)", ram_gb: 16, storage: "500GB NVMe", gpu: "Intel Iris Xe", power_watts: 28, price_usd: 1100, price_type: "one-time", description: "Linux-first ultrabook. Coreboot firmware. 16GB RAM runs OpenClaw natively on Pop!_OS. Great battery life." },
    { slug: "hp-elitebook-845-g10", name: "HP EliteBook 845 G10", category: "Laptop", cpu: "AMD Ryzen 7 7840U (8-core @ 3.3-5.1GHz)", ram_gb: 16, storage: "512GB NVMe", gpu: "AMD Radeon 780M", power_watts: 28, price_usd: 1200, price_type: "one-time", description: "Enterprise AMD laptop with Zen 4 and RDNA 3 iGPU. 16GB RAM handles OpenClaw well. Good Linux support." },
    { slug: "lenovo-chromebook-duet-5", name: "Lenovo Chromebook Duet 5", category: "Laptop", cpu: "Qualcomm Snapdragon 7c Gen 2 (8-core @ 2.55GHz)", ram_gb: 8, storage: "128GB eMMC", gpu: "Adreno 618", power_watts: 10, price_usd: 350, price_type: "one-time", description: "ARM Chromebook with Linux container support. 8GB RAM runs lightweight forks in Crostini. Limited by ChromeOS sandbox." },
    { slug: "pinebook-pro", name: "Pinebook Pro", category: "Laptop", cpu: "Rockchip RK3399 (2x A72 + 4x A53)", ram_gb: 4, storage: "64GB eMMC", gpu: "Mali-T860 MP4", power_watts: 10, price_usd: 200, price_type: "one-time", description: "Open-source ARM laptop. 4GB RAM limits it to lighter forks. Slow eMMC storage. Great for tinkering." },
    // --- Cloud (6 more) ---
    { slug: "cloud-vps-2gb", name: "Cloud VPS (2GB)", category: "Cloud", cpu: "1-2 vCPU variable", ram_gb: 2, storage: "50GB SSD", gpu: null, power_watts: null, price_usd: 10, price_type: "monthly", description: "Cheapest cloud option. 2GB RAM is tight for OpenClaw. Better suited for Nanobot or PicoClaw." },
    { slug: "cloud-vps-8gb", name: "Cloud VPS (8GB)", category: "Cloud", cpu: "4-8 vCPU variable", ram_gb: 8, storage: "160GB SSD", gpu: null, power_watts: null, price_usd: 40, price_type: "monthly", description: "Comfortable cloud instance. OpenClaw runs well with room for services. No local models but all cloud APIs work." },
    { slug: "cloud-gpu-t4", name: "Cloud GPU (T4)", category: "Cloud", cpu: "4-8 vCPU variable", ram_gb: 16, storage: "100GB SSD", gpu: "NVIDIA T4 16GB", power_watts: null, price_usd: 80, price_type: "monthly", description: "Budget GPU cloud instance. T4 handles 7B models at ~15 tokens/sec. Good balance of price and capability." },
    { slug: "cloud-gpu-h100", name: "Cloud GPU (H100)", category: "Cloud", cpu: "16-32 vCPU variable", ram_gb: 128, storage: "500GB+ NVMe", gpu: "NVIDIA H100 80GB", power_watts: null, price_usd: 2500, price_type: "monthly", description: "Cutting-edge GPU cloud. H100 runs 70B models at 100+ tokens/sec. Enterprise-scale AI agent deployment." },
    { slug: "lambda-cloud-a100x8", name: "Lambda Cloud (A100x8)", category: "Cloud", cpu: "96+ vCPU", ram_gb: 512, storage: "2TB+ NVMe", gpu: "8x NVIDIA A100 80GB", power_watts: null, price_usd: 10000, price_type: "monthly", description: "Multi-GPU research cluster. 640GB total VRAM. Runs any model at absurd speeds. Way beyond what OpenClaw needs." },
    { slug: "aws-graviton3-arm", name: "AWS Graviton3 ARM (4GB)", category: "Cloud", cpu: "AWS Graviton3 ARM (2 vCPU)", ram_gb: 4, storage: "80GB gp3", gpu: null, power_watts: null, price_usd: 15, price_type: "monthly", description: "ARM-based cloud instance. Graviton3 is fast and cheap. OpenClaw runs but tight at 4GB. Good for lightweight forks." },
    // --- Phones/Tablets (6 more) ---
    { slug: "iphone-15-pro", name: "iPhone 15 Pro", category: "Phone", cpu: "Apple A17 Pro (6-core)", ram_gb: 8, storage: "256GB-1TB", gpu: "6-core GPU + 16-core Neural Engine", power_watts: 5, price_usd: 1000, price_type: "one-time", description: "Flagship iPhone with A17 Pro. SwiftClaw runs natively. No Termux equivalent but native Swift apps work beautifully." },
    { slug: "google-pixel-8", name: "Google Pixel 8", category: "Phone", cpu: "Google Tensor G3 (9-core)", ram_gb: 8, storage: "128GB-256GB", gpu: "Mali-G715 + Tensor TPU", power_watts: 5, price_usd: 700, price_type: "one-time", description: "Google's AI-focused phone. 8GB RAM runs Nanobot in Termux well. On-device ML via Tensor G3 is a bonus." },
    { slug: "oneplus-12", name: "OnePlus 12", category: "Phone", cpu: "Snapdragon 8 Gen 3 (8-core, 1x X4 + 5x A720 + 2x A520)", ram_gb: 16, storage: "256GB-512GB", gpu: "Adreno 750", power_watts: 6, price_usd: 800, price_type: "one-time", description: "Flagship Android with 16GB RAM. Termux + proot-distro gives full Linux. Enough RAM for vanilla OpenClaw in Termux." },
    { slug: "ipad-pro-m2", name: "iPad Pro M2", category: "Tablet", cpu: "Apple M2 (8-core)", ram_gb: 8, storage: "128GB-2TB", gpu: "10-core GPU + 16-core Neural Engine", power_watts: 10, price_usd: 800, price_type: "one-time", description: "Pro tablet with desktop-class M2 chip. SwiftClaw runs natively. No terminal access without jailbreak but native apps work." },
    { slug: "google-pixel-4a", name: "Google Pixel 4a (used)", category: "Phone", cpu: "Snapdragon 730G (8-core @ 2.2GHz)", ram_gb: 6, storage: "128GB", gpu: "Adreno 618", power_watts: 4, price_usd: 100, price_type: "one-time", description: "Budget used Pixel. 6GB RAM runs Nanobot in Termux. Great value dedicated AI phone for $100." },
    { slug: "samsung-galaxy-tab-s9", name: "Samsung Galaxy Tab S9", category: "Tablet", cpu: "Snapdragon 8 Gen 2 (8-core)", ram_gb: 8, storage: "128GB-256GB", gpu: "Adreno 740", power_watts: 8, price_usd: 650, price_type: "one-time", description: "Flagship Android tablet. 8GB RAM and Snapdragon 8 Gen 2. Termux runs well. DeX mode provides desktop-like experience." },
    // --- Handhelds (3 more) ---
    { slug: "steam-deck-oled", name: "Steam Deck OLED", category: "Handheld", cpu: "AMD APU (4-core Zen 2 @ 2.4-3.5GHz)", ram_gb: 16, storage: "512GB-1TB NVMe", gpu: "AMD RDNA 2 (8 CUs)", power_watts: 15, price_usd: 550, price_type: "one-time", description: "Upgraded Steam Deck with OLED screen and faster storage. Same APU but better thermals. OpenClaw in desktop mode is smooth." },
    { slug: "rog-ally", name: "ROG Ally", category: "Handheld", cpu: "AMD Ryzen Z1 Extreme (8-core Zen 4 @ 3.3-5.1GHz)", ram_gb: 16, storage: "512GB NVMe", gpu: "AMD RDNA 3 (12 CUs)", power_watts: 30, price_usd: 700, price_type: "one-time", description: "Windows gaming handheld with Zen 4 power. 16GB RAM and RDNA 3 iGPU. Runs OpenClaw natively on Windows or Linux." },
    { slug: "gpd-win-4", name: "GPD Win 4", category: "Handheld", cpu: "AMD Ryzen 7 6800U (8-core Zen 3+ @ 2.7-4.7GHz)", ram_gb: 32, storage: "1TB NVMe", gpu: "AMD Radeon 680M (RDNA 2, 12 CUs)", power_watts: 28, price_usd: 800, price_type: "one-time", description: "Pocket PC with 32GB RAM and Ryzen 6800U. The most capable handheld for AI workloads. Can run local 7B models." },
    // --- NAS (4 more) ---
    { slug: "qnap-ts-464", name: "QNAP TS-464", category: "NAS", cpu: "Intel N5095 (4-core Jasper Lake @ 2.9GHz)", ram_gb: 8, storage: "4x 3.5\" SATA + 2x M.2 NVMe", gpu: "Intel UHD Graphics", power_watts: 25, price_usd: 500, price_type: "one-time", description: "4-bay NAS with x86 power. 8GB RAM and N5095 run Docker containers easily. Good dual-purpose NAS + OpenClaw host." },
    { slug: "truenas-mini-r", name: "TrueNAS Mini R", category: "NAS", cpu: "Intel Xeon D-2123IT (4-core @ 2.2-3.0GHz)", ram_gb: 32, storage: "5x 3.5\" SATA + boot SSD", gpu: null, power_watts: 65, price_usd: 1500, price_type: "one-time", description: "Enterprise-grade NAS with Xeon D and ECC RAM. 32GB handles OpenClaw plus ZFS without breaking a sweat." },
    { slug: "synology-ds923-plus", name: "Synology DS923+", category: "NAS", cpu: "AMD Ryzen R1600 (2-core @ 2.6GHz)", ram_gb: 4, storage: "4x 3.5\" SATA + 2x M.2 NVMe", gpu: null, power_watts: 30, price_usd: 570, price_type: "one-time", description: "Popular 4-bay NAS with AMD Ryzen embedded. 4GB RAM is tight but Docker support works. Expandable to 32GB." },
    { slug: "asustor-as5402t", name: "Asustor AS5402T", category: "NAS", cpu: "Intel N5105 (4-core Jasper Lake @ 2.9GHz)", ram_gb: 4, storage: "2x 3.5\" SATA + 2x M.2 NVMe", gpu: "Intel UHD Graphics", power_watts: 20, price_usd: 350, price_type: "one-time", description: "Affordable 2-bay NAS with N5105. 4GB RAM is tight but supports Docker. Good value for combined NAS + lightweight AI hosting." },
    // --- Appliances (3 more) ---
    { slug: "home-assistant-yellow", name: "Home Assistant Yellow", category: "Appliance", cpu: "Raspberry Pi CM4 (4x A72 @ 1.5GHz)", ram_gb: 4, storage: "NVMe SSD slot", gpu: null, power_watts: 7, price_usd: 150, price_type: "one-time", description: "Purpose-built home automation hub with CM4. 4GB RAM can run lightweight forks alongside Home Assistant." },
    { slug: "home-assistant-green", name: "Home Assistant Green", category: "Appliance", cpu: "Allwinner H616 (4-core A53 @ 1.5GHz)", ram_gb: 1, storage: "32GB eMMC", gpu: null, power_watts: 5, price_usd: 100, price_type: "one-time", description: "Entry-level HA appliance. Only 1GB RAM severely limits AI agent options. PicoClaw is the only realistic choice." },
    { slug: "umbrel-home", name: "Umbrel Home", category: "Appliance", cpu: "Raspberry Pi CM4 (4x A72 @ 1.5GHz)", ram_gb: 4, storage: "1TB NVMe pre-installed", gpu: null, power_watts: 7, price_usd: 500, price_type: "one-time", description: "Self-hosting appliance with app store. Pre-installed NVMe. 4GB RAM can run Nanobot or PicoClaw as an Umbrel app." },
    // --- Microcontrollers (3 more) ---
    { slug: "esp32-c3", name: "ESP32-C3", category: "Microcontroller", cpu: "RISC-V single-core @ 160MHz", ram_gb: 0.0004, storage: "4MB Flash", gpu: null, power_watts: 0.3, price_usd: 4, price_type: "one-time", description: "Ultra-cheap RISC-V microcontroller. 400KB SRAM. Too constrained for any fork except maybe a future PicoClaw-Lite." },
    { slug: "raspberry-pi-pico-w", name: "Raspberry Pi Pico W", category: "Microcontroller", cpu: "RP2040 dual-core ARM Cortex-M0+ @ 133MHz", ram_gb: 0.000264, storage: "2MB Flash", gpu: null, power_watts: 0.2, price_usd: 6, price_type: "one-time", description: "Tiny WiFi-capable MCU. 264KB SRAM. No OS, no fork compatibility. Could be an I/O peripheral for a larger system." },
    { slug: "arduino-portenta-h7", name: "Arduino Portenta H7", category: "Microcontroller", cpu: "STM32H747 dual-core (Cortex-M7 + M4 @ 480/240MHz)", ram_gb: 0.008, storage: "2MB Flash + 8MB SDRAM", gpu: null, power_watts: 1, price_usd: 100, price_type: "one-time", description: "Industrial-grade Arduino with 8MB SDRAM. Runs MicroPython. Too constrained for real AI agents but useful as a sensor gateway." },
    // --- Servers (4 more) ---
    { slug: "dell-poweredge-t360", name: "Dell PowerEdge T360", category: "Server", cpu: "Intel Xeon E-2434 (4-core @ 3.4-4.8GHz)", ram_gb: 32, storage: "2TB HDD / optional SSD", gpu: null, power_watts: 250, price_usd: 1500, price_type: "one-time", description: "Entry tower server with Xeon E. 32GB ECC RAM. Reliable 24/7 operation. Good for production OpenClaw deployments." },
    { slug: "hp-proliant-dl380-gen10", name: "HP ProLiant DL380 Gen10", category: "Server", cpu: "Intel Xeon Silver 4214 (12-core @ 2.2-3.2GHz)", ram_gb: 64, storage: "4x 600GB SAS / SSD", gpu: null, power_watts: 500, price_usd: 3000, price_type: "one-time", description: "Enterprise 2U rackmount server. 64GB RAM handles ClawLixir with thousands of concurrent users. Built for data center ops." },
    { slug: "supermicro-mini-itx", name: "Supermicro Mini-ITX (Xeon D)", category: "Server", cpu: "Intel Xeon D-1733NT (8-core @ 2.0-3.0GHz)", ram_gb: 64, storage: "2x M.2 NVMe + 2x 2.5\" SATA", gpu: null, power_watts: 80, price_usd: 1800, price_type: "one-time", description: "Compact server with embedded Xeon D. 64GB ECC in Mini-ITX form factor. Low power for a server. Perfect homelab AI host." },
    { slug: "dell-optiplex-7050-refurb", name: "Dell OptiPlex 7050 (refurb)", category: "Server", cpu: "Intel Core i5-7500 (4-core @ 3.4-3.8GHz)", ram_gb: 8, storage: "256GB SSD", gpu: "Intel HD 630", power_watts: 65, price_usd: 120, price_type: "one-time", description: "Refurbished business desktop repurposed as a server. 8GB RAM runs OpenClaw via cloud APIs. Best bang-for-buck dedicated box." },
    // --- Routers (2 more) ---
    { slug: "gl-inet-beryl-ax", name: "GL.iNet Beryl AX (GL-MT3000)", category: "Router", cpu: "MediaTek MT7981B (2-core ARM @ 1.3GHz)", ram_gb: 0.512, storage: "256MB NAND", gpu: null, power_watts: 5, price_usd: 70, price_type: "one-time", description: "OpenWrt travel router. 512MB RAM is tight but Claw++ can run alongside routing. Great for portable AI on the go." },
    { slug: "ubiquiti-dream-machine", name: "Ubiquiti Dream Machine", category: "Router", cpu: "Qualcomm APQ8053 (8-core A53 @ 1.8GHz)", ram_gb: 2, storage: "16GB eMMC", gpu: null, power_watts: 12, price_usd: 300, price_type: "one-time", description: "All-in-one network appliance. 2GB RAM mostly used by UniFi. PicoClaw could run alongside but resources are tight." },
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
    { device_id: did("esp32-s3"), fork_id: fid("mimiclaw"), verdict: "RUNS_OK", notes: "Native target for MimiClaw. GPIO and sensor control works. Limited by 8MB PSRAM.", cold_start_sec: 2, warm_response_sec: 1.5 },
    { device_id: did("esp32-s3"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "No Node.js support. Completely incompatible.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("esp32-s3"), fork_id: fid("picoclaw"), verdict: "WONT_RUN", notes: "Needs at least 10MB RAM and a Linux-capable SoC.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("sipeed-licheerv-nano"), fork_id: fid("picoclaw"), verdict: "RUNS_OK", notes: "PicoClaw's primary target. Boots in 1 second. Limited to Telegram/Discord.", cold_start_sec: 1, warm_response_sec: 2 },
    { device_id: did("sipeed-licheerv-nano"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "Only 256MB RAM. OpenClaw needs 2GB minimum.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("sipeed-licheerv-nano"), fork_id: fid("nanobot"), verdict: "BARELY_RUNS", notes: "Technically possible but painfully slow. Frequent OOM crashes.", cold_start_sec: 30, warm_response_sec: 8 },
    { device_id: did("raspberry-pi-zero-2-w"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw runs effortlessly with plenty of headroom.", cold_start_sec: 1, warm_response_sec: 1.5 },
    { device_id: did("raspberry-pi-zero-2-w"), fork_id: fid("nanobot"), verdict: "RUNS_OK", notes: "Works but uses most of the 512MB. Close monitoring needed.", cold_start_sec: 15, warm_response_sec: 5 },
    { device_id: did("raspberry-pi-zero-2-w"), fork_id: fid("nanoclaw"), verdict: "BARELY_RUNS", notes: "Container overhead on 512MB is brutal. Frequent swapping.", cold_start_sec: 45, warm_response_sec: 10 },
    { device_id: did("raspberry-pi-zero-2-w"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "512MB is far below the 2GB minimum.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("raspberry-pi-4-4gb"), fork_id: fid("openclaw"), verdict: "BARELY_RUNS", notes: "Meets minimum but tight. Gateway starts but expect GC crashes under load.", cold_start_sec: 20, warm_response_sec: 5 },
    { device_id: did("raspberry-pi-4-4gb"), fork_id: fid("nanoclaw"), verdict: "RUNS_OK", notes: "Container isolation works. Comfortable with 1-2 conversations.", cold_start_sec: 12, warm_response_sec: 3 },
    { device_id: did("raspberry-pi-4-4gb"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot barely uses 256MB. Tons of headroom here.", cold_start_sec: 5, warm_response_sec: 2 },
    { device_id: did("raspberry-pi-4-4gb"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "Massive overkill for PicoClaw.", cold_start_sec: 1, warm_response_sec: 0.5 },
    { device_id: did("raspberry-pi-5-8gb"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "The sweet spot for SBC hosting. Multi-channel messaging, browser automation, and community skills all work. 8GB gives breathing room.", cold_start_sec: 12, warm_response_sec: 3.2 },
    { device_id: did("raspberry-pi-5-8gb"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Plenty of RAM for container isolation with multiple groups.", cold_start_sec: 8, warm_response_sec: 2 },
    { device_id: did("raspberry-pi-5-8gb"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Overkill. Multiple Nanobot instances could run simultaneously.", cold_start_sec: 3, warm_response_sec: 1 },
    { device_id: did("raspberry-pi-5-8gb"), fork_id: fid("ironclaw"), verdict: "RUNS_OK", notes: "WASM sandbox runs but adds overhead. Functional for single-user.", cold_start_sec: 15, warm_response_sec: 4 },
    { device_id: did("nvidia-jetson-orin-nano"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Full OpenClaw with all integrations. 8GB RAM and GPU headroom for concurrent skills. Fast cold start.", cold_start_sec: 8, warm_response_sec: 0.8 },
    { device_id: did("nvidia-jetson-orin-nano"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Container isolation with GPU acceleration.", cold_start_sec: 5, warm_response_sec: 1 },
    { device_id: did("nvidia-jetson-orin-nano"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM sandbox with GPU. Security without compromise.", cold_start_sec: 6, warm_response_sec: 1.2 },
    { device_id: did("clawbox"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Purpose-built appliance. Pre-configured OpenClaw with all integrations. Plug and play.", cold_start_sec: 6, warm_response_sec: 0.7 },
    { device_id: did("mac-mini-m3-16gb"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Runs beautifully. Near-instant API responses. 16GB handles 5-10 concurrent messaging channels without swapping.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("mac-mini-m3-16gb"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Apple Containers native. Best security + performance combo.", cold_start_sec: 2, warm_response_sec: 0.3 },
    { device_id: did("mac-mini-m3-16gb"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM sandbox barely adds overhead on M3.", cold_start_sec: 3, warm_response_sec: 0.5 },
    { device_id: did("mac-mini-m4-pro-24gb"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "24GB unified memory. Multiple agents and background services simultaneously with headroom to spare.", cold_start_sec: 2, warm_response_sec: 0.2 },
    { device_id: did("cloud-vps-4gb"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "Standard cloud deployment. No local models but all cloud API integrations work.", cold_start_sec: 8, warm_response_sec: 2 },
    { device_id: did("cloud-vps-4gb"), fork_id: fid("moltworker"), verdict: "RUNS_GREAT", notes: "Not needed - Moltworker runs on Cloudflare edge. But would work on a VPS too.", cold_start_sec: 1, warm_response_sec: 0.5 },
    { device_id: did("cloud-gpu-a100"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Enterprise GPU cloud. 48GB RAM and fast vCPUs handle 20+ concurrent agent sessions. GPU unused by OpenClaw itself.", cold_start_sec: 2, warm_response_sec: 0.3 },
    { device_id: did("thinkpad-t480"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "Runs fine as a background service. No local models but all cloud features work well.", cold_start_sec: 10, warm_response_sec: 2 },
    { device_id: did("thinkpad-t480"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Docker isolation works great. 8GB is comfortable.", cold_start_sec: 6, warm_response_sec: 1.5 },
    { device_id: did("thinkpad-t480"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot barely touches these resources.", cold_start_sec: 2, warm_response_sec: 0.8 },
    { device_id: did("framework-16"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "With the GPU module, runs local 7B models comfortably. Without GPU, still excellent via cloud.", cold_start_sec: 4, warm_response_sec: 0.5 },
    { device_id: did("steam-deck"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "Works in desktop mode on SteamOS. 16GB RAM is plenty. Quirky but functional.", cold_start_sec: 15, warm_response_sec: 3 },
    { device_id: did("steam-deck"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot runs easily. Interesting portable AI assistant.", cold_start_sec: 3, warm_response_sec: 1 },
    // --- New device verdicts ---
    { device_id: did("orange-pi-5"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "RK3588S handles the Node.js runtime well. 8GB RAM is comfortable. Good alternative to Raspberry Pi 5.", cold_start_sec: 10, warm_response_sec: 2.5 },
    { device_id: did("orange-pi-5"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Docker support works well. Plenty of headroom for container isolation.", cold_start_sec: 7, warm_response_sec: 1.5 },
    { device_id: did("orange-pi-5"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Python runtime uses ~200MB. 8GB leaves plenty for the OS and MCP servers.", cold_start_sec: 3, warm_response_sec: 1 },
    { device_id: did("orange-pi-5"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "Single Go binary uses <10MB. ARM64 native. Instant startup.", cold_start_sec: 1, warm_response_sec: 0.3 },
    { device_id: did("intel-nuc-13-pro"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "i5-1340P and 16GB. Silent operation. Ideal always-on OpenClaw server for cloud API workloads.", cold_start_sec: 4, warm_response_sec: 0.6 },
    { device_id: did("intel-nuc-13-pro"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Docker isolation works perfectly. Great home server setup.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("intel-nuc-13-pro"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM sandbox overhead is negligible on x86.", cold_start_sec: 4, warm_response_sec: 0.7 },
    { device_id: did("beelink-ser5-max"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "32GB RAM handles multiple agents via cloud APIs. Ryzen 5800H is fast for Node.js workloads.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("beelink-ser5-max"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Can run many isolated containers simultaneously.", cold_start_sec: 2, warm_response_sec: 0.3 },
    { device_id: did("beelink-ser5-max"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "Rust + WASM runs great on AMD. Very responsive.", cold_start_sec: 3, warm_response_sec: 0.5 },
    { device_id: did("synology-ds224plus"), fork_id: fid("openclaw"), verdict: "BARELY_RUNS", notes: "Only 2GB RAM. Docker available but tight. Better to upgrade to 6GB+ first.", cold_start_sec: 45, warm_response_sec: 8 },
    { device_id: did("synology-ds224plus"), fork_id: fid("nanobot"), verdict: "RUNS_OK", notes: "Docker container with Nanobot works. 256MB footprint leaves room for NAS duties.", cold_start_sec: 12, warm_response_sec: 4 },
    { device_id: did("synology-ds224plus"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw barely uses resources. Perfect NAS companion.", cold_start_sec: 2, warm_response_sec: 1 },
    { device_id: did("cheap-android-phone"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "Termux can't provide the full Node.js environment needed. RAM too constrained.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("cheap-android-phone"), fork_id: fid("picoclaw"), verdict: "RUNS_OK", notes: "PicoClaw Go binary runs in Termux. Functional but battery drain is real.", cold_start_sec: 3, warm_response_sec: 3 },
    { device_id: did("cheap-android-phone"), fork_id: fid("nanobot"), verdict: "BARELY_RUNS", notes: "Python in Termux works but 4GB shared with Android OS. Frequent OOM kills.", cold_start_sec: 25, warm_response_sec: 6 },
    { device_id: did("samsung-galaxy-s24"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "Termux + proot-distro provides full Linux. 8GB RAM is workable. Uses cloud APIs only.", cold_start_sec: 18, warm_response_sec: 3 },
    { device_id: did("samsung-galaxy-s24"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot in Termux runs beautifully. Great mobile AI assistant setup.", cold_start_sec: 4, warm_response_sec: 1.5 },
    { device_id: did("samsung-galaxy-s24"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw is perfect for mobile. Tiny footprint, fast responses.", cold_start_sec: 1, warm_response_sec: 0.8 },
    { device_id: did("rock-5b"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "16GB RAM and RK3588 make this the best ARM SBC for OpenClaw. NVMe support helps with swap. Handles multiple channels.", cold_start_sec: 8, warm_response_sec: 1.8 },
    { device_id: did("rock-5b"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Container isolation with 16GB RAM works great.", cold_start_sec: 5, warm_response_sec: 1 },
    { device_id: did("rock-5b"), fork_id: fid("ironclaw"), verdict: "RUNS_OK", notes: "WASM sandbox works. ARM performance is solid.", cold_start_sec: 10, warm_response_sec: 2 },
    { device_id: did("libre-le-potato"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "2GB RAM is below the 2GB minimum. OOM immediately on startup.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("libre-le-potato"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw runs effortlessly. Great budget option.", cold_start_sec: 1, warm_response_sec: 1 },
    { device_id: did("libre-le-potato"), fork_id: fid("nanobot"), verdict: "RUNS_OK", notes: "Nanobot works within 256MB. 2GB is enough to run both Nanobot and the OS.", cold_start_sec: 8, warm_response_sec: 3 },
    // --- Banana Pi BPI-M7 (16GB, RK3588) ---
    { device_id: did("banana-pi-bpi-m7"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "16GB RAM and RK3588. NVMe support helps with swap under load. Handles multiple messaging channels comfortably.", cold_start_sec: 8, warm_response_sec: 1.8 },
    { device_id: did("banana-pi-bpi-m7"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Container isolation with 16GB is smooth. Multiple groups run concurrently.", cold_start_sec: 5, warm_response_sec: 1 },
    { device_id: did("banana-pi-bpi-m7"), fork_id: fid("ironclaw"), verdict: "RUNS_OK", notes: "WASM sandbox works on ARM64. Some overhead but functional.", cold_start_sec: 10, warm_response_sec: 2 },
    { device_id: did("banana-pi-bpi-m7"), fork_id: fid("clawlixir"), verdict: "RUNS_OK", notes: "Elixir BEAM VM runs fine on ARM. 16GB handles hundreds of concurrent users.", cold_start_sec: 8, warm_response_sec: 1.5 },
    // --- Pine64 ROCK64 (4GB) ---
    { device_id: did("pine64-rock64"), fork_id: fid("openclaw"), verdict: "BARELY_RUNS", notes: "4GB meets minimum but RK3328 is sluggish. Expect slow response times.", cold_start_sec: 25, warm_response_sec: 6 },
    { device_id: did("pine64-rock64"), fork_id: fid("nanoclaw"), verdict: "RUNS_OK", notes: "Container overhead is noticeable but functional with 1-2 groups.", cold_start_sec: 15, warm_response_sec: 4 },
    { device_id: did("pine64-rock64"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot is light enough. Plenty of headroom on 4GB.", cold_start_sec: 5, warm_response_sec: 2 },
    { device_id: did("pine64-rock64"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw barely uses any resources here.", cold_start_sec: 1, warm_response_sec: 0.5 },
    // --- BeagleBone Black (512MB) ---
    { device_id: did("beaglebone-black"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw runs great. PRU co-processors are a bonus for GPIO tasks.", cold_start_sec: 1, warm_response_sec: 1.5 },
    { device_id: did("beaglebone-black"), fork_id: fid("nanobot"), verdict: "BARELY_RUNS", notes: "512MB shared with OS. Nanobot works but OOM kills are common under load.", cold_start_sec: 20, warm_response_sec: 7 },
    { device_id: did("beaglebone-black"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "512MB is far below the 2GB minimum. Single-core A8 is too slow anyway.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("beaglebone-black"), fork_id: fid("clawpp"), verdict: "RUNS_OK", notes: "Claw++ static binary runs. 512MB is tight but C++ efficiency helps.", cold_start_sec: 0.5, warm_response_sec: 2 },
    // --- BeagleBone AI-64 (4GB) ---
    { device_id: did("beaglebone-ai-64"), fork_id: fid("openclaw"), verdict: "BARELY_RUNS", notes: "4GB meets minimum but TDA4VM is quirky. Community support for AI workloads is limited.", cold_start_sec: 22, warm_response_sec: 5 },
    { device_id: did("beaglebone-ai-64"), fork_id: fid("nanoclaw"), verdict: "RUNS_OK", notes: "Docker works but the TI BSP can be finicky. 4GB is adequate.", cold_start_sec: 14, warm_response_sec: 3.5 },
    { device_id: did("beaglebone-ai-64"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot runs easily. 8 TOPS DSP could accelerate specific tasks.", cold_start_sec: 5, warm_response_sec: 2 },
    { device_id: did("beaglebone-ai-64"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw is overkill-proof. Runs effortlessly.", cold_start_sec: 1, warm_response_sec: 0.5 },
    // --- Milk-V Mars (8GB RISC-V) ---
    { device_id: did("milk-v-mars"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "8GB RAM is fine but JH7110 RISC-V is slower than ARM equivalents. Node.js works but not optimized.", cold_start_sec: 18, warm_response_sec: 4 },
    { device_id: did("milk-v-mars"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw's Go binary compiles natively for RISC-V. This is its home turf.", cold_start_sec: 1, warm_response_sec: 0.8 },
    { device_id: did("milk-v-mars"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Python works on RISC-V Linux. 8GB gives plenty of headroom.", cold_start_sec: 6, warm_response_sec: 2 },
    { device_id: did("milk-v-mars"), fork_id: fid("nanoclaw"), verdict: "RUNS_OK", notes: "Docker on RISC-V is experimental. Works but expect rough edges.", cold_start_sec: 12, warm_response_sec: 3 },
    // --- ODROID-N2+ (4GB) ---
    { device_id: did("odroid-n2-plus"), fork_id: fid("openclaw"), verdict: "BARELY_RUNS", notes: "4GB meets minimum. A73 cores are decent but memory is the bottleneck.", cold_start_sec: 20, warm_response_sec: 5 },
    { device_id: did("odroid-n2-plus"), fork_id: fid("nanoclaw"), verdict: "RUNS_OK", notes: "Docker works well. Hardkernel's mainline support is excellent.", cold_start_sec: 12, warm_response_sec: 3 },
    { device_id: did("odroid-n2-plus"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot runs easily with lots of headroom.", cold_start_sec: 5, warm_response_sec: 1.5 },
    { device_id: did("odroid-n2-plus"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw barely registers on this hardware.", cold_start_sec: 1, warm_response_sec: 0.5 },
    // --- Khadas VIM4 (8GB) ---
    { device_id: did("khadas-vim4"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "8GB RAM and A311D2 handle OpenClaw well. Good I/O for concurrent API calls.", cold_start_sec: 10, warm_response_sec: 2.5 },
    { device_id: did("khadas-vim4"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Container isolation works smoothly. 8GB is comfortable.", cold_start_sec: 7, warm_response_sec: 1.5 },
    { device_id: did("khadas-vim4"), fork_id: fid("ironclaw"), verdict: "RUNS_OK", notes: "WASM sandbox runs. NPU doesn't help IronClaw directly but RAM is sufficient.", cold_start_sec: 12, warm_response_sec: 3 },
    { device_id: did("khadas-vim4"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot is trivial for this hardware.", cold_start_sec: 3, warm_response_sec: 1 },
    // --- Asus Tinker Board 2S (4GB) ---
    { device_id: did("asus-tinker-board-2s"), fork_id: fid("openclaw"), verdict: "BARELY_RUNS", notes: "RK3399 is showing its age. 4GB RAM meets minimum but expect GC pauses.", cold_start_sec: 22, warm_response_sec: 5.5 },
    { device_id: did("asus-tinker-board-2s"), fork_id: fid("nanoclaw"), verdict: "RUNS_OK", notes: "Docker works. 4GB handles single-group isolation fine.", cold_start_sec: 14, warm_response_sec: 3.5 },
    { device_id: did("asus-tinker-board-2s"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot runs well with headroom to spare.", cold_start_sec: 5, warm_response_sec: 2 },
    { device_id: did("asus-tinker-board-2s"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "Overkill for PicoClaw.", cold_start_sec: 1, warm_response_sec: 0.5 },
    // --- LattePanda 3 Delta (8GB, x86) ---
    { device_id: did("lattepanda-3-delta"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "x86 compatibility is nice. N5105 and 8GB RAM run OpenClaw without ARM quirks.", cold_start_sec: 10, warm_response_sec: 2.5 },
    { device_id: did("lattepanda-3-delta"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Docker on x86 is the best-supported path. 8GB is comfortable.", cold_start_sec: 6, warm_response_sec: 1.5 },
    { device_id: did("lattepanda-3-delta"), fork_id: fid("ironclaw"), verdict: "RUNS_OK", notes: "WASM sandbox works well on x86. 8GB handles it.", cold_start_sec: 8, warm_response_sec: 2 },
    { device_id: did("lattepanda-3-delta"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot is trivial on this hardware.", cold_start_sec: 3, warm_response_sec: 1 },
    // --- Coral Dev Board (4GB) ---
    { device_id: did("coral-dev-board"), fork_id: fid("openclaw"), verdict: "BARELY_RUNS", notes: "4GB and quad A53 meet minimum but barely. Edge TPU doesn't help OpenClaw.", cold_start_sec: 25, warm_response_sec: 6 },
    { device_id: did("coral-dev-board"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot fits easily. TPU could accelerate specific ML tasks.", cold_start_sec: 5, warm_response_sec: 2 },
    { device_id: did("coral-dev-board"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw runs effortlessly.", cold_start_sec: 1, warm_response_sec: 0.5 },
    // --- Raspberry Pi 3B+ (1GB) ---
    { device_id: did("raspberry-pi-3b-plus"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw's Go binary runs great. 1GB is plenty for it.", cold_start_sec: 1, warm_response_sec: 1.5 },
    { device_id: did("raspberry-pi-3b-plus"), fork_id: fid("nanobot"), verdict: "BARELY_RUNS", notes: "1GB minus OS leaves maybe 600MB for Nanobot. Works but fragile.", cold_start_sec: 18, warm_response_sec: 6 },
    { device_id: did("raspberry-pi-3b-plus"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "1GB is half the minimum. OOM on startup.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("raspberry-pi-3b-plus"), fork_id: fid("clawpp"), verdict: "RUNS_OK", notes: "Claw++ static binary fits. 1GB is enough for C++ efficiency.", cold_start_sec: 0.3, warm_response_sec: 2 },
    // --- Raspberry Pi 400 (4GB) ---
    { device_id: did("raspberry-pi-400"), fork_id: fid("openclaw"), verdict: "BARELY_RUNS", notes: "Same as Pi 4 (4GB). Tight but functional. Keyboard form factor is charming.", cold_start_sec: 20, warm_response_sec: 5 },
    { device_id: did("raspberry-pi-400"), fork_id: fid("nanoclaw"), verdict: "RUNS_OK", notes: "Container isolation works with 1-2 conversations.", cold_start_sec: 12, warm_response_sec: 3 },
    { device_id: did("raspberry-pi-400"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot has tons of headroom on 4GB.", cold_start_sec: 5, warm_response_sec: 2 },
    { device_id: did("raspberry-pi-400"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw barely uses any resources.", cold_start_sec: 1, warm_response_sec: 0.5 },
    // --- Pine A64+ (2GB) ---
    { device_id: did("pine-a64-plus"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "2GB matches minimum on paper but A64 is too slow. OOM under any real load.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("pine-a64-plus"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw runs perfectly. Great budget option.", cold_start_sec: 1, warm_response_sec: 1 },
    { device_id: did("pine-a64-plus"), fork_id: fid("nanobot"), verdict: "RUNS_OK", notes: "Nanobot fits in 256MB. 2GB total leaves room for the OS.", cold_start_sec: 8, warm_response_sec: 3 },
    { device_id: did("pine-a64-plus"), fork_id: fid("clawpp"), verdict: "RUNS_OK", notes: "Claw++ static binary works. Slow CPU but functional.", cold_start_sec: 0.5, warm_response_sec: 2.5 },
    // --- PINE64 Star64 (8GB RISC-V) ---
    { device_id: did("pine64-star64"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "8GB is enough. RISC-V Node.js is slower than ARM but works. Expect 2x latency vs Pi 5.", cold_start_sec: 18, warm_response_sec: 4 },
    { device_id: did("pine64-star64"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw's Go binary is native RISC-V. Boots in under a second.", cold_start_sec: 1, warm_response_sec: 0.8 },
    { device_id: did("pine64-star64"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Python on RISC-V Linux. 8GB gives plenty of room.", cold_start_sec: 6, warm_response_sec: 2 },
    { device_id: did("pine64-star64"), fork_id: fid("nanoclaw"), verdict: "RUNS_OK", notes: "Docker on RISC-V is still maturing. Works but expect occasional issues.", cold_start_sec: 12, warm_response_sec: 3 },
    // --- VisionFive 2 (8GB RISC-V) ---
    { device_id: did("visionfive-2"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "Same JH7110 as Star64. 8GB RAM handles OpenClaw. NVMe support helps with I/O.", cold_start_sec: 16, warm_response_sec: 3.5 },
    { device_id: did("visionfive-2"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "Native RISC-V target. PicoClaw shines here.", cold_start_sec: 1, warm_response_sec: 0.7 },
    { device_id: did("visionfive-2"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot on RISC-V with 8GB. Solid.", cold_start_sec: 5, warm_response_sec: 1.8 },
    { device_id: did("visionfive-2"), fork_id: fid("nanoclaw"), verdict: "RUNS_OK", notes: "Docker works. RISC-V container ecosystem is improving fast.", cold_start_sec: 11, warm_response_sec: 2.8 },
    // --- Minisforum UM780 XTX (32GB, Ryzen 7840HS) ---
    { device_id: did("minisforum-um780-xtx"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "32GB and Zen 4. Handles multiple agents and services concurrently. Best value mini PC for a dedicated AI host.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("minisforum-um780-xtx"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Can run dozens of isolated containers concurrently.", cold_start_sec: 2, warm_response_sec: 0.3 },
    { device_id: did("minisforum-um780-xtx"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM sandbox overhead is negligible. Zen 4 tears through it.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("minisforum-um780-xtx"), fork_id: fid("clawlixir"), verdict: "RUNS_GREAT", notes: "BEAM VM loves multiple cores. Handles thousands of concurrent connections.", cold_start_sec: 4, warm_response_sec: 0.3 },
    // --- GMKtec NucBox K8 (16GB, i5-12450H) ---
    { device_id: did("gmktec-nucbox-k8"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "12th-gen i5 with 16GB is more than enough. Good always-on server.", cold_start_sec: 4, warm_response_sec: 0.6 },
    { device_id: did("gmktec-nucbox-k8"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Docker on x86 is the best path. 16GB handles multiple containers.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("gmktec-nucbox-k8"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "Rust + WASM on x86 is fast. No issues.", cold_start_sec: 4, warm_response_sec: 0.6 },
    // --- Beelink Mini S12 Pro (16GB, N100) ---
    { device_id: did("beelink-mini-s12-pro"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "N100 is surprisingly capable. 16GB and low power make it the best value always-on OpenClaw box.", cold_start_sec: 6, warm_response_sec: 1 },
    { device_id: did("beelink-mini-s12-pro"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Docker runs great. 16GB at 15W is the sweet spot for home servers.", cold_start_sec: 4, warm_response_sec: 0.6 },
    { device_id: did("beelink-mini-s12-pro"), fork_id: fid("clawlixir"), verdict: "RUNS_OK", notes: "Only 4 E-cores limits concurrency vs P-core chips. Handles hundreds of users though.", cold_start_sec: 6, warm_response_sec: 1.2 },
    { device_id: did("beelink-mini-s12-pro"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM runs fine on x86. Low-power champion.", cold_start_sec: 5, warm_response_sec: 0.8 },
    // --- Geekom Mini IT12 (32GB, i7-12650H) ---
    { device_id: did("geekom-mini-it12"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "10-core i7 and 32GB. Multiple agents and services concurrently. Fast NVMe keeps things responsive under load.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("geekom-mini-it12"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Can host many isolated containers simultaneously.", cold_start_sec: 2, warm_response_sec: 0.3 },
    { device_id: did("geekom-mini-it12"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM sandbox barely adds overhead on this hardware.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("geekom-mini-it12"), fork_id: fid("clawlixir"), verdict: "RUNS_GREAT", notes: "BEAM VM thrives on the 10 cores. Great for high-concurrency deployments.", cold_start_sec: 3, warm_response_sec: 0.3 },
    // --- ASUS PN53 (16GB, Ryzen 6800U) ---
    { device_id: did("asus-pn53"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Zen 3+ with 16GB handles OpenClaw comfortably. RDNA 2 iGPU is a bonus.", cold_start_sec: 4, warm_response_sec: 0.6 },
    { device_id: did("asus-pn53"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Docker isolation works great. Reliable ASUS hardware.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("asus-pn53"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "Rust + WASM is fast on Zen 3+.", cold_start_sec: 4, warm_response_sec: 0.5 },
    // --- Lenovo ThinkCentre M75q Tiny (16GB, Ryzen 5600GE) ---
    { device_id: did("lenovo-thinkcentre-m75q"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Ryzen 5600GE and 16GB is a solid combo. Enterprise reliability for always-on use.", cold_start_sec: 5, warm_response_sec: 0.7 },
    { device_id: did("lenovo-thinkcentre-m75q"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "ThinkCentre reliability with Docker. Great for production.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("lenovo-thinkcentre-m75q"), fork_id: fid("clawlixir"), verdict: "RUNS_GREAT", notes: "6 Zen 3 cores handle ClawLixir's concurrency model well.", cold_start_sec: 4, warm_response_sec: 0.5 },
    // --- Mac Mini M1 used (8GB) ---
    { device_id: did("mac-mini-m1"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "M1 is still fast. 8GB unified memory is tight for local models but cloud APIs work great.", cold_start_sec: 5, warm_response_sec: 0.6 },
    { device_id: did("mac-mini-m1"), fork_id: fid("swiftclaw"), verdict: "RUNS_GREAT", notes: "Native Swift on Apple Silicon. Core ML inference is fast. This is SwiftClaw's home.", cold_start_sec: 2, warm_response_sec: 0.3 },
    { device_id: did("mac-mini-m1"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Apple Containers native. Best isolation on macOS.", cold_start_sec: 3, warm_response_sec: 0.5 },
    { device_id: did("mac-mini-m1"), fork_id: fid("ironclaw"), verdict: "RUNS_OK", notes: "WASM sandbox works on ARM64 macOS. Some overhead.", cold_start_sec: 5, warm_response_sec: 0.8 },
    // --- LattePanda Sigma (16GB, i5-1340P) ---
    { device_id: did("lattepanda-sigma"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "12-core i5 and 16GB. Dual Ethernet makes it versatile for networking setups.", cold_start_sec: 4, warm_response_sec: 0.6 },
    { device_id: did("lattepanda-sigma"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Docker works perfectly. Multiple M.2 slots for expansion.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("lattepanda-sigma"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "x86 WASM performance is great.", cold_start_sec: 4, warm_response_sec: 0.5 },
    // --- Mac Studio M2 Max (32GB) ---
    { device_id: did("mac-studio-m2-max"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "32GB unified memory. M2 Max handles multiple concurrent agents and background services effortlessly.", cold_start_sec: 2, warm_response_sec: 0.2 },
    { device_id: did("mac-studio-m2-max"), fork_id: fid("swiftclaw"), verdict: "RUNS_GREAT", notes: "Native Apple Silicon. SwiftClaw with Core ML runs flawlessly.", cold_start_sec: 1, warm_response_sec: 0.2 },
    { device_id: did("mac-studio-m2-max"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Apple Containers with 32GB. Run dozens of isolated groups.", cold_start_sec: 1, warm_response_sec: 0.2 },
    { device_id: did("mac-studio-m2-max"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM sandbox overhead is invisible on M2 Max.", cold_start_sec: 2, warm_response_sec: 0.3 },
    { device_id: did("mac-studio-m2-max"), fork_id: fid("clawlixir"), verdict: "RUNS_GREAT", notes: "BEAM VM on 12 cores handles massive concurrency.", cold_start_sec: 2, warm_response_sec: 0.2 },
    // --- Custom PC Ryzen 5600X + RTX 3060 (32GB) ---
    { device_id: did("custom-pc-5600x-3060"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "32GB RAM and fast CPU handle OpenClaw via cloud APIs excellently. RTX 3060 is unused by OpenClaw itself.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("custom-pc-5600x-3060"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Docker with GPU passthrough. Isolated containers with GPU acceleration.", cold_start_sec: 2, warm_response_sec: 0.3 },
    { device_id: did("custom-pc-5600x-3060"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM sandbox is trivial on desktop x86 + GPU.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("custom-pc-5600x-3060"), fork_id: fid("clawlixir"), verdict: "RUNS_GREAT", notes: "6 cores handle ClawLixir concurrency well. GPU is a bonus.", cold_start_sec: 3, warm_response_sec: 0.3 },
    // --- Custom PC i5-12400 Budget (16GB) ---
    { device_id: did("custom-pc-i5-12400"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "16GB and 6 P-cores. No dGPU means cloud-only models but everything else works great.", cold_start_sec: 4, warm_response_sec: 0.6 },
    { device_id: did("custom-pc-i5-12400"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Docker isolation works perfectly. Good budget server.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("custom-pc-i5-12400"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "x86 WASM is fast. 16GB handles it easily.", cold_start_sec: 4, warm_response_sec: 0.5 },
    // --- Dell OptiPlex Micro 7010 (16GB, i5-13500T) ---
    { device_id: did("dell-optiplex-micro-7010"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "14-core i5-13500T in a tiny box. Silent, reliable, perfect for always-on deployment.", cold_start_sec: 4, warm_response_sec: 0.5 },
    { device_id: did("dell-optiplex-micro-7010"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Enterprise-grade Docker host. Dell reliability is a plus.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("dell-optiplex-micro-7010"), fork_id: fid("clawlixir"), verdict: "RUNS_GREAT", notes: "14 cores are great for BEAM concurrency. Production-ready.", cold_start_sec: 3, warm_response_sec: 0.3 },
    // --- Mac Pro M2 Ultra (192GB) ---
    { device_id: did("mac-pro-m2-ultra"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "192GB unified memory. Can run dozens of concurrent OpenClaw agents without breaking a sweat. Way beyond what's needed.", cold_start_sec: 1, warm_response_sec: 0.3 },
    { device_id: did("mac-pro-m2-ultra"), fork_id: fid("swiftclaw"), verdict: "RUNS_GREAT", notes: "Native Apple Silicon. SwiftClaw with Core ML. 32-core Neural Engine accelerates on-device inference.", cold_start_sec: 1, warm_response_sec: 0.2 },
    { device_id: did("mac-pro-m2-ultra"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "192GB supports dozens of isolated Apple Containers. Each gets dedicated memory.", cold_start_sec: 1, warm_response_sec: 0.2 },
    { device_id: did("mac-pro-m2-ultra"), fork_id: fid("clawlixir"), verdict: "RUNS_GREAT", notes: "24 P+E cores with 192GB. BEAM VM scales to thousands of concurrent connections.", cold_start_sec: 1, warm_response_sec: 0.2 },
    { device_id: did("mac-pro-m2-ultra"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM sandbox overhead is negligible with this much silicon.", cold_start_sec: 1, warm_response_sec: 0.2 },
    // --- HP Z2 Mini G9 (32GB, i7-12700) ---
    { device_id: did("hp-z2-mini-g9"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Workstation-class i7-12700 and 32GB. ISV-certified reliability for production.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("hp-z2-mini-g9"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Enterprise Docker host. 32GB handles many containers.", cold_start_sec: 2, warm_response_sec: 0.3 },
    { device_id: did("hp-z2-mini-g9"), fork_id: fid("clawlixir"), verdict: "RUNS_GREAT", notes: "12 cores and 32GB. ClawLixir handles thousands of concurrent users.", cold_start_sec: 3, warm_response_sec: 0.3 },
    { device_id: did("hp-z2-mini-g9"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM sandbox trivial on workstation hardware.", cold_start_sec: 3, warm_response_sec: 0.4 },
    // --- MacBook Air M2 (16GB) ---
    { device_id: did("macbook-air-m2"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Fanless M2 with 16GB. Silent always-on operation. Handles OpenClaw with all integrations enabled.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("macbook-air-m2"), fork_id: fid("swiftclaw"), verdict: "RUNS_GREAT", notes: "Native Apple Silicon. SwiftClaw with Shortcuts and Siri integration.", cold_start_sec: 2, warm_response_sec: 0.3 },
    { device_id: did("macbook-air-m2"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Apple Containers native. Great portable setup.", cold_start_sec: 2, warm_response_sec: 0.3 },
    { device_id: did("macbook-air-m2"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM sandbox barely adds overhead on M2.", cold_start_sec: 3, warm_response_sec: 0.5 },
    // --- MacBook Pro 14" M3 Pro (18GB) ---
    { device_id: did("macbook-pro-14-m3-pro"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "M3 Pro with 18GB. Battery lasts all day even with agents running. Fast SSD keeps background tasks responsive.", cold_start_sec: 2, warm_response_sec: 0.3 },
    { device_id: did("macbook-pro-14-m3-pro"), fork_id: fid("swiftclaw"), verdict: "RUNS_GREAT", notes: "SwiftClaw on M3 Pro is the premium Apple experience.", cold_start_sec: 1, warm_response_sec: 0.2 },
    { device_id: did("macbook-pro-14-m3-pro"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Apple Containers with 18GB unified memory. Smooth.", cold_start_sec: 2, warm_response_sec: 0.2 },
    { device_id: did("macbook-pro-14-m3-pro"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM sandbox overhead invisible on M3 Pro.", cold_start_sec: 2, warm_response_sec: 0.3 },
    // --- ThinkPad X1 Carbon Gen 11 (16GB) ---
    { device_id: did("thinkpad-x1-carbon-gen11"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Fast i7-1365U and 16GB. Background OpenClaw while you work. Enterprise build quality.", cold_start_sec: 4, warm_response_sec: 0.6 },
    { device_id: did("thinkpad-x1-carbon-gen11"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Docker isolation works great on Linux or WSL2.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("thinkpad-x1-carbon-gen11"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "x86 WASM is fast. Lightweight enough for a background service.", cold_start_sec: 4, warm_response_sec: 0.6 },
    // --- Dell XPS 15 (32GB, RTX 4060) ---
    { device_id: did("dell-xps-15"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "32GB RAM and 14-core i7 handle OpenClaw and all background services. GPU unused by OpenClaw but nice for other workloads.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("dell-xps-15"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "GPU passthrough in Docker for accelerated inference.", cold_start_sec: 2, warm_response_sec: 0.3 },
    { device_id: did("dell-xps-15"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM sandbox trivial with 32GB and 14 cores.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("dell-xps-15"), fork_id: fid("clawlixir"), verdict: "RUNS_GREAT", notes: "14 cores handle BEAM concurrency well.", cold_start_sec: 3, warm_response_sec: 0.3 },
    // --- System76 Lemur Pro (16GB) ---
    { device_id: did("system76-lemur-pro"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Linux-first with 16GB. Pop!_OS and Coreboot make it the purist's OpenClaw laptop.", cold_start_sec: 4, warm_response_sec: 0.6 },
    { device_id: did("system76-lemur-pro"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Docker on Pop!_OS is well-supported. 16GB handles isolation well.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("system76-lemur-pro"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "Linux + Rust + WASM is the ideal combo.", cold_start_sec: 4, warm_response_sec: 0.5 },
    // --- HP EliteBook 845 G10 (16GB, Ryzen 7840U) ---
    { device_id: did("hp-elitebook-845-g10"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Zen 4 with 16GB. Good Linux support. RDNA 3 iGPU helps with some inference.", cold_start_sec: 4, warm_response_sec: 0.6 },
    { device_id: did("hp-elitebook-845-g10"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Docker works well on Linux. Enterprise build quality.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("hp-elitebook-845-g10"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "Zen 4 x86 WASM performance is excellent.", cold_start_sec: 3, warm_response_sec: 0.5 },
    // --- Lenovo Chromebook Duet 5 (8GB, Snapdragon 7c) ---
    { device_id: did("lenovo-chromebook-duet-5"), fork_id: fid("openclaw"), verdict: "BARELY_RUNS", notes: "Linux container (Crostini) adds overhead. 8GB shared with ChromeOS. Sluggish but works.", cold_start_sec: 30, warm_response_sec: 6 },
    { device_id: did("lenovo-chromebook-duet-5"), fork_id: fid("nanobot"), verdict: "RUNS_OK", notes: "Nanobot in Crostini Linux container. Works but ChromeOS resource sharing is tricky.", cold_start_sec: 10, warm_response_sec: 3 },
    { device_id: did("lenovo-chromebook-duet-5"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw ARM binary runs in Crostini. Lightweight enough to not fight ChromeOS.", cold_start_sec: 2, warm_response_sec: 1.5 },
    // --- Pinebook Pro (4GB, RK3399) ---
    { device_id: did("pinebook-pro"), fork_id: fid("openclaw"), verdict: "BARELY_RUNS", notes: "4GB meets minimum but RK3399 is old and slow eMMC hurts. Barely usable.", cold_start_sec: 30, warm_response_sec: 7 },
    { device_id: did("pinebook-pro"), fork_id: fid("nanoclaw"), verdict: "RUNS_OK", notes: "Docker works but 4GB is tight with container overhead.", cold_start_sec: 15, warm_response_sec: 4 },
    { device_id: did("pinebook-pro"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot is light enough. Good for tinkering.", cold_start_sec: 6, warm_response_sec: 2.5 },
    { device_id: did("pinebook-pro"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw ARM binary runs effortlessly.", cold_start_sec: 1, warm_response_sec: 0.5 },
    // --- Cloud VPS 2GB ---
    { device_id: did("cloud-vps-2gb"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "2GB matches minimum on paper but with OS overhead, OOM on startup. Need at least 4GB VPS.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("cloud-vps-2gb"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot is the ideal fork for cheap VPS instances. Fits easily.", cold_start_sec: 4, warm_response_sec: 1.5 },
    { device_id: did("cloud-vps-2gb"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw uses almost nothing. Perfect for $10/mo VPS.", cold_start_sec: 1, warm_response_sec: 0.8 },
    { device_id: did("cloud-vps-2gb"), fork_id: fid("nanoclaw"), verdict: "BARELY_RUNS", notes: "Container overhead on 2GB is brutal. Swapping constantly.", cold_start_sec: 35, warm_response_sec: 8 },
    // --- Cloud VPS 8GB ---
    { device_id: did("cloud-vps-8gb"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "8GB cloud instance is the comfortable sweet spot. All cloud API features work flawlessly.", cold_start_sec: 6, warm_response_sec: 1.5 },
    { device_id: did("cloud-vps-8gb"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Docker isolation on 8GB VPS. Great for multi-group deployments.", cold_start_sec: 4, warm_response_sec: 1 },
    { device_id: did("cloud-vps-8gb"), fork_id: fid("ironclaw"), verdict: "RUNS_OK", notes: "WASM sandbox works. Cloud vCPU performance varies.", cold_start_sec: 8, warm_response_sec: 2 },
    { device_id: did("cloud-vps-8gb"), fork_id: fid("clawlixir"), verdict: "RUNS_OK", notes: "BEAM VM on shared vCPUs is less ideal than dedicated cores but functional.", cold_start_sec: 6, warm_response_sec: 1.5 },
    // --- Cloud GPU T4 ---
    { device_id: did("cloud-gpu-t4"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "16GB RAM handles OpenClaw via cloud APIs. T4 GPU is unused by OpenClaw but available for other workloads.", cold_start_sec: 5, warm_response_sec: 1 },
    { device_id: did("cloud-gpu-t4"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "GPU Docker containers with T4. Good for isolated inference.", cold_start_sec: 4, warm_response_sec: 0.8 },
    { device_id: did("cloud-gpu-t4"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM sandbox with GPU access. Secure and capable.", cold_start_sec: 5, warm_response_sec: 1 },
    // --- Cloud GPU H100 ---
    { device_id: did("cloud-gpu-h100"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "128GB RAM and fast vCPUs. Enterprise-scale concurrent agent deployment. $2500/mo is steep for just OpenClaw.", cold_start_sec: 2, warm_response_sec: 0.2 },
    { device_id: did("cloud-gpu-h100"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "128GB RAM means hundreds of isolated containers. GPU inference per-container.", cold_start_sec: 1, warm_response_sec: 0.1 },
    { device_id: did("cloud-gpu-h100"), fork_id: fid("clawlixir"), verdict: "RUNS_GREAT", notes: "BEAM VM on 16-32 vCPUs. Handles tens of thousands of concurrent users.", cold_start_sec: 2, warm_response_sec: 0.1 },
    { device_id: did("cloud-gpu-h100"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM sandbox is invisible on H100-class hardware.", cold_start_sec: 2, warm_response_sec: 0.2 },
    // --- Lambda Cloud A100x8 ---
    { device_id: did("lambda-cloud-a100x8"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "512GB RAM and 96+ vCPUs. Research-grade cluster. Could host hundreds of concurrent OpenClaw agents.", cold_start_sec: 3, warm_response_sec: 0.3 },
    { device_id: did("lambda-cloud-a100x8"), fork_id: fid("clawlixir"), verdict: "RUNS_GREAT", notes: "96+ vCPUs and 512GB RAM. BEAM VM handles massive concurrent workloads.", cold_start_sec: 2, warm_response_sec: 0.2 },
    { device_id: did("lambda-cloud-a100x8"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "GPU slicing across 8 A100s enables many isolated containers with dedicated GPU fractions.", cold_start_sec: 2, warm_response_sec: 0.2 },
    // --- AWS Graviton3 ARM (4GB) ---
    { device_id: did("aws-graviton3-arm"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "Graviton3 ARM is fast but 4GB is tight. Functional for light usage.", cold_start_sec: 8, warm_response_sec: 2 },
    { device_id: did("aws-graviton3-arm"), fork_id: fid("nanoclaw"), verdict: "RUNS_OK", notes: "Docker on Graviton ARM. 4GB limits container count.", cold_start_sec: 6, warm_response_sec: 1.5 },
    { device_id: did("aws-graviton3-arm"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot is ideal for cheap ARM cloud instances.", cold_start_sec: 3, warm_response_sec: 1 },
    { device_id: did("aws-graviton3-arm"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw Go binary is native ARM. Barely uses resources.", cold_start_sec: 1, warm_response_sec: 0.5 },
    // --- iPhone 15 Pro (8GB) ---
    { device_id: did("iphone-15-pro"), fork_id: fid("swiftclaw"), verdict: "RUNS_GREAT", notes: "SwiftClaw's primary target. Siri Shortcuts, Core ML, background execution. The Apple AI agent dream.", cold_start_sec: 2, warm_response_sec: 0.3 },
    { device_id: did("iphone-15-pro"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "No terminal access on stock iOS. SwiftClaw is the only option without jailbreaking.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("iphone-15-pro"), fork_id: fid("picoclaw"), verdict: "WONT_RUN", notes: "Can't run arbitrary binaries on iOS without jailbreak.", cold_start_sec: null, warm_response_sec: null },
    // --- Google Pixel 8 (8GB) ---
    { device_id: did("google-pixel-8"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot in Termux runs well. 8GB and Tensor G3 make it snappy.", cold_start_sec: 5, warm_response_sec: 1.5 },
    { device_id: did("google-pixel-8"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw Go binary in Termux. Lightweight and fast.", cold_start_sec: 1, warm_response_sec: 0.8 },
    { device_id: did("google-pixel-8"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "Termux + proot-distro. 8GB handles it but battery drain is significant.", cold_start_sec: 18, warm_response_sec: 3 },
    // --- OnePlus 12 (16GB) ---
    { device_id: did("oneplus-12"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "16GB in Termux with proot-distro. Enough RAM for vanilla OpenClaw. Battery drain is the main concern.", cold_start_sec: 15, warm_response_sec: 2.5 },
    { device_id: did("oneplus-12"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot in Termux is effortless with 16GB. Great mobile AI setup.", cold_start_sec: 4, warm_response_sec: 1 },
    { device_id: did("oneplus-12"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw barely uses any resources. Perfect for phones.", cold_start_sec: 1, warm_response_sec: 0.5 },
    { device_id: did("oneplus-12"), fork_id: fid("nanoclaw"), verdict: "RUNS_OK", notes: "proot containers in Termux. Works but less clean than real Docker.", cold_start_sec: 12, warm_response_sec: 3 },
    // --- iPad Pro M2 (8GB) ---
    { device_id: did("ipad-pro-m2"), fork_id: fid("swiftclaw"), verdict: "RUNS_GREAT", notes: "SwiftClaw runs natively. M2 chip with Core ML. No terminal but native Swift apps are smooth.", cold_start_sec: 2, warm_response_sec: 0.3 },
    { device_id: did("ipad-pro-m2"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "iPadOS has no terminal access. Can't run Node.js without jailbreak.", cold_start_sec: null, warm_response_sec: null },
    // --- Google Pixel 4a used (6GB) ---
    { device_id: did("google-pixel-4a"), fork_id: fid("nanobot"), verdict: "RUNS_OK", notes: "Nanobot in Termux works. 6GB is adequate. Great $100 dedicated AI phone.", cold_start_sec: 8, warm_response_sec: 2.5 },
    { device_id: did("google-pixel-4a"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw Go binary in Termux. Fast and lightweight.", cold_start_sec: 1, warm_response_sec: 1 },
    { device_id: did("google-pixel-4a"), fork_id: fid("openclaw"), verdict: "BARELY_RUNS", notes: "6GB minus Android overhead leaves maybe 3GB. OpenClaw starts but crashes under load.", cold_start_sec: 25, warm_response_sec: 5 },
    // --- Samsung Galaxy Tab S9 (8GB) ---
    { device_id: did("samsung-galaxy-tab-s9"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "8GB in Termux with proot. DeX mode makes it feel like a desktop. Functional but quirky.", cold_start_sec: 16, warm_response_sec: 3 },
    { device_id: did("samsung-galaxy-tab-s9"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot in Termux runs well. DeX + external keyboard is a nice setup.", cold_start_sec: 4, warm_response_sec: 1.5 },
    { device_id: did("samsung-galaxy-tab-s9"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw in Termux. Lightweight and responsive.", cold_start_sec: 1, warm_response_sec: 0.8 },
    // --- Steam Deck OLED (16GB) ---
    { device_id: did("steam-deck-oled"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "Same APU as LCD model but better thermals and faster NVMe. Desktop mode works.", cold_start_sec: 14, warm_response_sec: 2.8 },
    { device_id: did("steam-deck-oled"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot on SteamOS. Fun portable AI companion.", cold_start_sec: 3, warm_response_sec: 1 },
    { device_id: did("steam-deck-oled"), fork_id: fid("nanoclaw"), verdict: "RUNS_OK", notes: "Flatpak/Docker on SteamOS is possible but fiddly. 16GB helps.", cold_start_sec: 10, warm_response_sec: 2.5 },
    // --- ROG Ally (16GB, Zen 4) ---
    { device_id: did("rog-ally"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Zen 4 + 16GB. Runs on Windows or dual-boot Linux. Powerful CPU handles Node.js and background skills well.", cold_start_sec: 5, warm_response_sec: 0.8 },
    { device_id: did("rog-ally"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Docker works on Windows (WSL2) or Linux installs.", cold_start_sec: 4, warm_response_sec: 0.6 },
    { device_id: did("rog-ally"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "x86 Zen 4 WASM performance is excellent.", cold_start_sec: 4, warm_response_sec: 0.6 },
    { device_id: did("rog-ally"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot barely touches these resources.", cold_start_sec: 2, warm_response_sec: 0.8 },
    // --- GPD Win 4 (32GB, Ryzen 6800U) ---
    { device_id: did("gpd-win-4"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "32GB and Ryzen 6800U. Most RAM of any handheld. Runs multiple agents and services as a pocket server.", cold_start_sec: 4, warm_response_sec: 0.5 },
    { device_id: did("gpd-win-4"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "32GB handles many isolated containers.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("gpd-win-4"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "Zen 3+ x86 runs WASM sandbox with ease.", cold_start_sec: 3, warm_response_sec: 0.5 },
    { device_id: did("gpd-win-4"), fork_id: fid("clawlixir"), verdict: "RUNS_OK", notes: "BEAM VM works but 8 cores is the limit. Handles hundreds of concurrent users.", cold_start_sec: 4, warm_response_sec: 0.5 },
    // --- QNAP TS-464 (8GB, N5095) ---
    { device_id: did("qnap-ts-464"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "N5095 and 8GB in Docker alongside NAS duties. Works but competes for resources with QTS.", cold_start_sec: 10, warm_response_sec: 2.5 },
    { device_id: did("qnap-ts-464"), fork_id: fid("nanoclaw"), verdict: "RUNS_OK", notes: "Docker isolation on QNAP works. 8GB is adequate.", cold_start_sec: 8, warm_response_sec: 2 },
    { device_id: did("qnap-ts-464"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot in Docker alongside NAS duties. Low footprint.", cold_start_sec: 4, warm_response_sec: 1.5 },
    { device_id: did("qnap-ts-464"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw as a Docker container. Barely uses any NAS resources.", cold_start_sec: 1, warm_response_sec: 0.5 },
    // --- TrueNAS Mini R (32GB, Xeon D) ---
    { device_id: did("truenas-mini-r"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Xeon D and 32GB ECC. Run OpenClaw in a jail or VM alongside ZFS. Enterprise reliability.", cold_start_sec: 5, warm_response_sec: 1 },
    { device_id: did("truenas-mini-r"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Docker/jail isolation with 32GB. Plenty of room alongside NAS duties.", cold_start_sec: 4, warm_response_sec: 0.8 },
    { device_id: did("truenas-mini-r"), fork_id: fid("clawlixir"), verdict: "RUNS_GREAT", notes: "4-core Xeon D handles ClawLixir concurrency. 32GB ECC is rock-solid.", cold_start_sec: 5, warm_response_sec: 0.8 },
    { device_id: did("truenas-mini-r"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM sandbox on Xeon D. Server-grade security.", cold_start_sec: 5, warm_response_sec: 1 },
    // --- Synology DS923+ (4GB, Ryzen R1600) ---
    { device_id: did("synology-ds923-plus"), fork_id: fid("openclaw"), verdict: "BARELY_RUNS", notes: "4GB with DSM overhead leaves maybe 2.5GB for Docker. Tight but starts. Upgrade RAM first.", cold_start_sec: 30, warm_response_sec: 6 },
    { device_id: did("synology-ds923-plus"), fork_id: fid("nanobot"), verdict: "RUNS_OK", notes: "Nanobot in Docker. 4GB is workable. Better than DS224+ due to faster CPU.", cold_start_sec: 8, warm_response_sec: 3 },
    { device_id: did("synology-ds923-plus"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw in Docker uses almost nothing. Perfect NAS companion.", cold_start_sec: 1, warm_response_sec: 0.8 },
    // --- Asustor AS5402T (4GB, N5105) ---
    { device_id: did("asustor-as5402t"), fork_id: fid("openclaw"), verdict: "BARELY_RUNS", notes: "4GB with ADM overhead. N5105 is capable but RAM is the bottleneck.", cold_start_sec: 28, warm_response_sec: 6 },
    { device_id: did("asustor-as5402t"), fork_id: fid("nanobot"), verdict: "RUNS_OK", notes: "Nanobot in Docker. N5105 handles Python fine. 4GB is adequate.", cold_start_sec: 7, warm_response_sec: 2.5 },
    { device_id: did("asustor-as5402t"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw in Docker. Minimal resource usage.", cold_start_sec: 1, warm_response_sec: 0.5 },
    // --- Home Assistant Yellow (4GB, CM4) ---
    { device_id: did("home-assistant-yellow"), fork_id: fid("openclaw"), verdict: "BARELY_RUNS", notes: "4GB CM4 with Home Assistant already running. Very tight. Possible but risky.", cold_start_sec: 25, warm_response_sec: 6 },
    { device_id: did("home-assistant-yellow"), fork_id: fid("nanobot"), verdict: "RUNS_OK", notes: "Nanobot as HA add-on. Works alongside home automation. 4GB is adequate.", cold_start_sec: 8, warm_response_sec: 3 },
    { device_id: did("home-assistant-yellow"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw barely uses resources. Ideal HA companion for AI.", cold_start_sec: 1, warm_response_sec: 1 },
    // --- Home Assistant Green (1GB, H616) ---
    { device_id: did("home-assistant-green"), fork_id: fid("picoclaw"), verdict: "RUNS_OK", notes: "PicoClaw fits but 1GB shared with HA is tight. Possible but monitor memory.", cold_start_sec: 2, warm_response_sec: 2 },
    { device_id: did("home-assistant-green"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "1GB total. HA uses most of it. No chance for OpenClaw.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("home-assistant-green"), fork_id: fid("nanobot"), verdict: "BARELY_RUNS", notes: "Nanobot might start but HA + Nanobot in 1GB is asking for OOM kills.", cold_start_sec: 20, warm_response_sec: 8 },
    // --- Umbrel Home (4GB, CM4) ---
    { device_id: did("umbrel-home"), fork_id: fid("nanobot"), verdict: "RUNS_OK", notes: "Nanobot as an Umbrel app. 4GB shared with other apps. Works if you're not running too many services.", cold_start_sec: 8, warm_response_sec: 3 },
    { device_id: did("umbrel-home"), fork_id: fid("picoclaw"), verdict: "RUNS_GREAT", notes: "PicoClaw uses almost nothing. Perfect alongside Bitcoin node and other Umbrel apps.", cold_start_sec: 1, warm_response_sec: 1 },
    { device_id: did("umbrel-home"), fork_id: fid("openclaw"), verdict: "BARELY_RUNS", notes: "4GB with Umbrel overhead. OpenClaw starts but competes with other apps for memory.", cold_start_sec: 25, warm_response_sec: 6 },
    // --- ESP32-C3 (400KB SRAM) ---
    { device_id: did("esp32-c3"), fork_id: fid("mimiclaw"), verdict: "WONT_RUN", notes: "MimiClaw targets ESP32-S3 specifically. C3 lacks PSRAM and Xtensa cores.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("esp32-c3"), fork_id: fid("picoclaw"), verdict: "WONT_RUN", notes: "No Linux. 400KB SRAM. Not enough for any fork.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("esp32-c3"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "Microcontroller with 400KB SRAM. Not even remotely compatible.", cold_start_sec: null, warm_response_sec: null },
    // --- Raspberry Pi Pico W (264KB) ---
    { device_id: did("raspberry-pi-pico-w"), fork_id: fid("mimiclaw"), verdict: "WONT_RUN", notes: "Not an ESP32. MimiClaw only runs on ESP32-S3.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("raspberry-pi-pico-w"), fork_id: fid("picoclaw"), verdict: "WONT_RUN", notes: "No OS, no Linux, 264KB SRAM. PicoClaw needs at least a Linux-capable SoC.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("raspberry-pi-pico-w"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "264KB SRAM. This is a microcontroller, not a computer.", cold_start_sec: null, warm_response_sec: null },
    // --- Arduino Portenta H7 (8MB SDRAM) ---
    { device_id: did("arduino-portenta-h7"), fork_id: fid("mimiclaw"), verdict: "WONT_RUN", notes: "Not ESP32-S3. Different architecture entirely. MimiClaw is ESP32-S3 only.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("arduino-portenta-h7"), fork_id: fid("picoclaw"), verdict: "WONT_RUN", notes: "MicroPython but no real Linux. PicoClaw needs a Go runtime.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("arduino-portenta-h7"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "8MB SDRAM and no OS. Not compatible with any standard fork.", cold_start_sec: null, warm_response_sec: null },
    // --- Dell PowerEdge T360 (32GB, Xeon E-2434) ---
    { device_id: did("dell-poweredge-t360"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "Xeon E and 32GB ECC. Built for 24/7 operation. Production-grade OpenClaw deployment.", cold_start_sec: 4, warm_response_sec: 0.5 },
    { device_id: did("dell-poweredge-t360"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Docker on server hardware. ECC RAM adds reliability.", cold_start_sec: 3, warm_response_sec: 0.4 },
    { device_id: did("dell-poweredge-t360"), fork_id: fid("clawlixir"), verdict: "RUNS_GREAT", notes: "Server-grade for ClawLixir. Handles thousands of concurrent users reliably.", cold_start_sec: 4, warm_response_sec: 0.4 },
    { device_id: did("dell-poweredge-t360"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM sandbox on Xeon. Enterprise security on enterprise hardware.", cold_start_sec: 4, warm_response_sec: 0.5 },
    // --- HP ProLiant DL380 Gen10 (64GB, Xeon 4214) ---
    { device_id: did("hp-proliant-dl380-gen10"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "12-core Xeon and 64GB. Data center grade. Runs multiple OpenClaw instances concurrently.", cold_start_sec: 3, warm_response_sec: 0.3 },
    { device_id: did("hp-proliant-dl380-gen10"), fork_id: fid("clawlixir"), verdict: "RUNS_GREAT", notes: "BEAM VM on 12 Xeon cores with 64GB. Handles tens of thousands of concurrent connections.", cold_start_sec: 3, warm_response_sec: 0.2 },
    { device_id: did("hp-proliant-dl380-gen10"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "64GB supports many isolated Docker containers. Enterprise-grade.", cold_start_sec: 2, warm_response_sec: 0.2 },
    { device_id: did("hp-proliant-dl380-gen10"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM sandbox on server Xeon. Maximum security on maximum hardware.", cold_start_sec: 3, warm_response_sec: 0.3 },
    // --- Supermicro Mini-ITX Xeon D (64GB) ---
    { device_id: did("supermicro-mini-itx"), fork_id: fid("openclaw"), verdict: "RUNS_GREAT", notes: "8-core Xeon D and 64GB ECC in Mini-ITX. Low power server. Perfect homelab AI host.", cold_start_sec: 4, warm_response_sec: 0.4 },
    { device_id: did("supermicro-mini-itx"), fork_id: fid("clawlixir"), verdict: "RUNS_GREAT", notes: "Xeon D loves BEAM concurrency. 64GB handles massive workloads.", cold_start_sec: 4, warm_response_sec: 0.3 },
    { device_id: did("supermicro-mini-itx"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Docker on Xeon D. 64GB ECC for reliable containerized deployments.", cold_start_sec: 3, warm_response_sec: 0.3 },
    { device_id: did("supermicro-mini-itx"), fork_id: fid("ironclaw"), verdict: "RUNS_GREAT", notes: "WASM sandbox on embedded Xeon. Great power-to-performance ratio.", cold_start_sec: 4, warm_response_sec: 0.4 },
    // --- Dell OptiPlex 7050 refurb (8GB, i5-7500) ---
    { device_id: did("dell-optiplex-7050-refurb"), fork_id: fid("openclaw"), verdict: "RUNS_OK", notes: "i5-7500 and 8GB. Old but functional. Cloud APIs only. Best $120 dedicated box.", cold_start_sec: 8, warm_response_sec: 2 },
    { device_id: did("dell-optiplex-7050-refurb"), fork_id: fid("nanoclaw"), verdict: "RUNS_GREAT", notes: "Docker on x86 with 8GB. Comfortable for container isolation.", cold_start_sec: 5, warm_response_sec: 1.2 },
    { device_id: did("dell-optiplex-7050-refurb"), fork_id: fid("nanobot"), verdict: "RUNS_GREAT", notes: "Nanobot barely uses any resources. Great budget server.", cold_start_sec: 3, warm_response_sec: 1 },
    { device_id: did("dell-optiplex-7050-refurb"), fork_id: fid("ironclaw"), verdict: "RUNS_OK", notes: "WASM sandbox works on Kaby Lake. 8GB is sufficient.", cold_start_sec: 7, warm_response_sec: 1.5 },
    // --- GL.iNet Beryl AX (512MB, MT7981B) ---
    { device_id: did("gl-inet-beryl-ax"), fork_id: fid("clawpp"), verdict: "RUNS_OK", notes: "Claw++ static binary runs on OpenWrt. 512MB is tight alongside routing but works.", cold_start_sec: 0.5, warm_response_sec: 2.5 },
    { device_id: did("gl-inet-beryl-ax"), fork_id: fid("picoclaw"), verdict: "RUNS_OK", notes: "PicoClaw Go binary on OpenWrt. Fits but monitor memory alongside WiFi.", cold_start_sec: 1, warm_response_sec: 2 },
    { device_id: did("gl-inet-beryl-ax"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "512MB OpenWrt router. Not even close for OpenClaw.", cold_start_sec: null, warm_response_sec: null },
    // --- Ubiquiti Dream Machine (2GB, APQ8053) ---
    { device_id: did("ubiquiti-dream-machine"), fork_id: fid("picoclaw"), verdict: "RUNS_OK", notes: "PicoClaw could run alongside UniFi but Ubiquiti locks down their OS. Requires hacks.", cold_start_sec: 2, warm_response_sec: 2 },
    { device_id: did("ubiquiti-dream-machine"), fork_id: fid("clawpp"), verdict: "BARELY_RUNS", notes: "Claw++ binary might run but UniFi OS doesn't officially support custom binaries. Risky.", cold_start_sec: 1, warm_response_sec: 3 },
    { device_id: did("ubiquiti-dream-machine"), fork_id: fid("openclaw"), verdict: "WONT_RUN", notes: "2GB minus UniFi overhead. Locked-down OS. Not practical.", cold_start_sec: null, warm_response_sec: null },
    // --- Additional clawpp verdicts for embedded Linux devices ---
    { device_id: did("lattepanda-3-delta"), fork_id: fid("clawpp"), verdict: "RUNS_GREAT", notes: "Claw++ on x86 embedded Linux with 8GB. Static binary deploys in seconds. 100ms cold start.", cold_start_sec: 0.1, warm_response_sec: 0.5 },
    { device_id: did("home-assistant-yellow"), fork_id: fid("clawpp"), verdict: "RUNS_OK", notes: "Claw++ static binary on CM4 alongside Home Assistant. 64MB minimum easily met. Low overhead.", cold_start_sec: 0.2, warm_response_sec: 1.5 },
    { device_id: did("home-assistant-green"), fork_id: fid("clawpp"), verdict: "RUNS_OK", notes: "Claw++ needs only 64MB of the 1GB. Fits alongside HA better than Python or Node.js forks.", cold_start_sec: 0.3, warm_response_sec: 2 },
    { device_id: did("umbrel-home"), fork_id: fid("clawpp"), verdict: "RUNS_OK", notes: "Claw++ static binary on CM4. 64MB footprint leaves room for Umbrel services.", cold_start_sec: 0.2, warm_response_sec: 1.5 },
    { device_id: did("raspberry-pi-400"), fork_id: fid("clawpp"), verdict: "RUNS_GREAT", notes: "Claw++ on Pi 4 hardware. 4GB is 62x the 64MB minimum. Instant cold start.", cold_start_sec: 0.1, warm_response_sec: 0.8 },
    { device_id: did("pinebook-pro"), fork_id: fid("clawpp"), verdict: "RUNS_GREAT", notes: "Claw++ static binary on RK3399 embedded Linux. 4GB is plenty. Fast startup despite slow eMMC.", cold_start_sec: 0.1, warm_response_sec: 0.8 },
    { device_id: did("raspberry-pi-zero-2-w"), fork_id: fid("clawpp"), verdict: "RUNS_GREAT", notes: "Claw++ is perfect for the Zero 2W. 512MB is 8x the minimum. C++ efficiency shines here.", cold_start_sec: 0.2, warm_response_sec: 1.5 },
    { device_id: did("coral-dev-board"), fork_id: fid("clawpp"), verdict: "RUNS_GREAT", notes: "Claw++ on i.MX8M embedded Linux. 4GB is 62x minimum. MQTT integration pairs well with TPU tasks.", cold_start_sec: 0.1, warm_response_sec: 0.8 },
    { device_id: did("odroid-n2-plus"), fork_id: fid("clawpp"), verdict: "RUNS_GREAT", notes: "Claw++ on Amlogic embedded Linux. 4GB and mainline kernel support make it rock-solid.", cold_start_sec: 0.1, warm_response_sec: 0.6 },
    // --- Additional swiftclaw WONT_RUN verdicts for prominent non-Apple devices ---
    { device_id: did("minisforum-um780-xtx"), fork_id: fid("swiftclaw"), verdict: "WONT_RUN", notes: "SwiftClaw requires iOS/macOS. This runs Windows or Linux.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("steam-deck-oled"), fork_id: fid("swiftclaw"), verdict: "WONT_RUN", notes: "SwiftClaw requires iOS/macOS. Steam Deck runs SteamOS (Linux).", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("rog-ally"), fork_id: fid("swiftclaw"), verdict: "WONT_RUN", notes: "SwiftClaw requires iOS/macOS. ROG Ally runs Windows.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("google-pixel-8"), fork_id: fid("swiftclaw"), verdict: "WONT_RUN", notes: "SwiftClaw requires iOS/macOS. Android is not supported.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("samsung-galaxy-tab-s9"), fork_id: fid("swiftclaw"), verdict: "WONT_RUN", notes: "SwiftClaw requires iOS/macOS. This is an Android tablet.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("oneplus-12"), fork_id: fid("swiftclaw"), verdict: "WONT_RUN", notes: "SwiftClaw requires iOS/macOS. Android is not supported.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("dell-xps-15"), fork_id: fid("swiftclaw"), verdict: "WONT_RUN", notes: "SwiftClaw requires iOS/macOS. Dell XPS runs Windows or Linux.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("thinkpad-x1-carbon-gen11"), fork_id: fid("swiftclaw"), verdict: "WONT_RUN", notes: "SwiftClaw requires iOS/macOS. ThinkPad runs Windows or Linux.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("custom-pc-5600x-3060"), fork_id: fid("swiftclaw"), verdict: "WONT_RUN", notes: "SwiftClaw requires iOS/macOS. Custom PCs run Windows or Linux.", cold_start_sec: null, warm_response_sec: null },
    { device_id: did("google-pixel-4a"), fork_id: fid("swiftclaw"), verdict: "WONT_RUN", notes: "SwiftClaw requires iOS/macOS. Android is not supported.", cold_start_sec: null, warm_response_sec: null },
  ];

  const verdictInsert = db().transaction(() => {
    for (const v of verdicts) insertVerdict.run(v);
  });
  verdictInsert();

  // --- AFFILIATE LINKS ---
  const insertAffiliateLink = db().prepare(`
    INSERT INTO affiliate_links (device_id, network, url, affiliate_tag, label, priority)
    VALUES (@device_id, @network, @url, @affiliate_tag, @label, @priority)
  `);

  const affiliateLinks = [
    // Raspberry Pi 5 (8GB) - popular device, multiple networks
    { device_id: did("raspberry-pi-5-8gb"), network: "amazon", url: "https://amazon.com/dp/PLACEHOLDER", affiliate_tag: "tag=canitrunclaw-20", label: "Amazon", priority: 10 },
    { device_id: did("raspberry-pi-5-8gb"), network: "newegg", url: "https://www.newegg.com/p/PLACEHOLDER", affiliate_tag: null, label: "Newegg", priority: 5 },
    { device_id: did("raspberry-pi-5-8gb"), network: "direct", url: "https://www.raspberrypi.com/products/raspberry-pi-5/", affiliate_tag: null, label: "Raspberry Pi Store", priority: 3 },

    // Raspberry Pi 4 (4GB)
    { device_id: did("raspberry-pi-4-4gb"), network: "amazon", url: "https://amazon.com/dp/PLACEHOLDER", affiliate_tag: "tag=canitrunclaw-20", label: "Amazon", priority: 10 },
    { device_id: did("raspberry-pi-4-4gb"), network: "direct", url: "https://www.raspberrypi.com/products/raspberry-pi-4-model-b/", affiliate_tag: null, label: "Raspberry Pi Store", priority: 3 },

    // Mac Mini M3
    { device_id: did("mac-mini-m3-16gb"), network: "amazon", url: "https://amazon.com/dp/PLACEHOLDER", affiliate_tag: "tag=canitrunclaw-20", label: "Amazon", priority: 10 },
    { device_id: did("mac-mini-m3-16gb"), network: "bestbuy", url: "https://www.bestbuy.com/site/PLACEHOLDER", affiliate_tag: null, label: "Best Buy", priority: 7 },
    { device_id: did("mac-mini-m3-16gb"), network: "direct", url: "https://www.apple.com/shop/buy-mac/mac-mini", affiliate_tag: null, label: "Apple Store", priority: 5 },

    // Mac Mini M4 Pro
    { device_id: did("mac-mini-m4-pro-24gb"), network: "amazon", url: "https://amazon.com/dp/PLACEHOLDER", affiliate_tag: "tag=canitrunclaw-20", label: "Amazon", priority: 10 },
    { device_id: did("mac-mini-m4-pro-24gb"), network: "bestbuy", url: "https://www.bestbuy.com/site/PLACEHOLDER", affiliate_tag: null, label: "Best Buy", priority: 7 },
    { device_id: did("mac-mini-m4-pro-24gb"), network: "direct", url: "https://www.apple.com/shop/buy-mac/mac-mini", affiliate_tag: null, label: "Apple Store", priority: 5 },

    // NVIDIA Jetson Orin Nano
    { device_id: did("nvidia-jetson-orin-nano"), network: "amazon", url: "https://amazon.com/dp/PLACEHOLDER", affiliate_tag: "tag=canitrunclaw-20", label: "Amazon", priority: 10 },
    { device_id: did("nvidia-jetson-orin-nano"), network: "direct", url: "https://store.nvidia.com/en-us/jetson/store/", affiliate_tag: null, label: "NVIDIA Store", priority: 7 },

    // ClawBox
    { device_id: did("clawbox"), network: "direct", url: "https://clawbox.ai/buy", affiliate_tag: null, label: "ClawBox Store", priority: 10 },

    // Framework 16
    { device_id: did("framework-16"), network: "direct", url: "https://frame.work/products/laptop16-diy-amd-7040", affiliate_tag: null, label: "Framework Store", priority: 10 },

    // Steam Deck
    { device_id: did("steam-deck"), network: "direct", url: "https://store.steampowered.com/steamdeck", affiliate_tag: null, label: "Steam Store", priority: 10 },

    // ThinkPad T480 (used)
    { device_id: did("thinkpad-t480"), network: "amazon", url: "https://amazon.com/dp/PLACEHOLDER", affiliate_tag: "tag=canitrunclaw-20", label: "Amazon", priority: 10 },

    // Orange Pi 5
    { device_id: did("orange-pi-5"), network: "aliexpress", url: "https://www.aliexpress.com/item/PLACEHOLDER.html", affiliate_tag: null, label: "AliExpress", priority: 10 },
    { device_id: did("orange-pi-5"), network: "amazon", url: "https://amazon.com/dp/PLACEHOLDER", affiliate_tag: "tag=canitrunclaw-20", label: "Amazon", priority: 8 },

    // Intel NUC 13 Pro
    { device_id: did("intel-nuc-13-pro"), network: "amazon", url: "https://amazon.com/dp/PLACEHOLDER", affiliate_tag: "tag=canitrunclaw-20", label: "Amazon", priority: 10 },
    { device_id: did("intel-nuc-13-pro"), network: "newegg", url: "https://www.newegg.com/p/PLACEHOLDER", affiliate_tag: null, label: "Newegg", priority: 7 },

    // Beelink SER5 Max
    { device_id: did("beelink-ser5-max"), network: "amazon", url: "https://amazon.com/dp/PLACEHOLDER", affiliate_tag: "tag=canitrunclaw-20", label: "Amazon", priority: 10 },

    // Beelink Mini S12 Pro
    { device_id: did("beelink-mini-s12-pro"), network: "amazon", url: "https://amazon.com/dp/PLACEHOLDER", affiliate_tag: "tag=canitrunclaw-20", label: "Amazon", priority: 10 },

    // ROCK 5B
    { device_id: did("rock-5b"), network: "aliexpress", url: "https://www.aliexpress.com/item/PLACEHOLDER.html", affiliate_tag: null, label: "AliExpress", priority: 10 },
    { device_id: did("rock-5b"), network: "amazon", url: "https://amazon.com/dp/PLACEHOLDER", affiliate_tag: "tag=canitrunclaw-20", label: "Amazon", priority: 8 },

    // Minisforum UM780 XTX
    { device_id: did("minisforum-um780-xtx"), network: "amazon", url: "https://amazon.com/dp/PLACEHOLDER", affiliate_tag: "tag=canitrunclaw-20", label: "Amazon", priority: 10 },
    { device_id: did("minisforum-um780-xtx"), network: "direct", url: "https://www.minisforum.com/products/UM780-XTX.html", affiliate_tag: null, label: "Minisforum Store", priority: 7 },

    // Mac Mini M1 (used)
    { device_id: did("mac-mini-m1"), network: "amazon", url: "https://amazon.com/dp/PLACEHOLDER", affiliate_tag: "tag=canitrunclaw-20", label: "Amazon", priority: 10 },

    // MacBook Air M2
    { device_id: did("macbook-air-m2"), network: "amazon", url: "https://amazon.com/dp/PLACEHOLDER", affiliate_tag: "tag=canitrunclaw-20", label: "Amazon", priority: 10 },
    { device_id: did("macbook-air-m2"), network: "bestbuy", url: "https://www.bestbuy.com/site/PLACEHOLDER", affiliate_tag: null, label: "Best Buy", priority: 7 },
    { device_id: did("macbook-air-m2"), network: "direct", url: "https://www.apple.com/shop/buy-mac/macbook-air", affiliate_tag: null, label: "Apple Store", priority: 5 },

    // Raspberry Pi Zero 2 W
    { device_id: did("raspberry-pi-zero-2-w"), network: "amazon", url: "https://amazon.com/dp/PLACEHOLDER", affiliate_tag: "tag=canitrunclaw-20", label: "Amazon", priority: 10 },
    { device_id: did("raspberry-pi-zero-2-w"), network: "direct", url: "https://www.raspberrypi.com/products/raspberry-pi-zero-2-w/", affiliate_tag: null, label: "Raspberry Pi Store", priority: 3 },

    // ESP32-S3
    { device_id: did("esp32-s3"), network: "amazon", url: "https://amazon.com/dp/PLACEHOLDER", affiliate_tag: "tag=canitrunclaw-20", label: "Amazon", priority: 10 },
    { device_id: did("esp32-s3"), network: "aliexpress", url: "https://www.aliexpress.com/item/PLACEHOLDER.html", affiliate_tag: null, label: "AliExpress", priority: 7 },
  ];

  const affiliateLinkInsert = db().transaction(() => {
    for (const link of affiliateLinks) insertAffiliateLink.run(link);
  });
  affiliateLinkInsert();

  // --- BENCHMARK RUNS & RESULTS ---
  const insertBenchmarkRun = db().prepare(`
    INSERT INTO benchmark_runs (device_id, fork_id, status, docker_image, memory_limit_mb, cpu_limit, started_at, completed_at)
    VALUES (@device_id, @fork_id, 'completed', @docker_image, @memory_limit_mb, @cpu_limit, @started_at, @completed_at)
  `);

  const insertBenchmarkResult = db().prepare(`
    INSERT INTO benchmark_results (run_id, metric, value, unit, category, details)
    VALUES (@run_id, @metric, @value, @unit, @category, @details)
  `);

  type SeedBenchmark = {
    device_slug: string;
    fork_slug: string;
    memory_limit_mb: number;
    cpu_limit: number;
    started_at: string;
    completed_at: string;
    results: { metric: string; value: number; unit: string; category: "latency" | "capability" | "resource"; details: string | null }[];
  };

  const benchmarkSeeds: SeedBenchmark[] = [
    // Raspberry Pi 5 + Nanobot
    {
      device_slug: "raspberry-pi-5-8gb", fork_slug: "nanobot",
      memory_limit_mb: 8192, cpu_limit: 4,
      started_at: "2026-02-10T14:00:00", completed_at: "2026-02-10T14:05:32",
      results: [
        { metric: "cold_start", value: 4200, unit: "ms", category: "latency", details: null },
        { metric: "warm_response", value: 180, unit: "ms", category: "latency", details: null },
        { metric: "api_call_avg", value: 320, unit: "ms", category: "latency", details: null },
        { metric: "messaging", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "browser_automation", value: 0, unit: "bool", category: "capability", details: null },
        { metric: "code_execution", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "persistent_memory", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "file_management", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "web_search", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "peak_memory", value: 185, unit: "MB", category: "resource", details: null },
        { metric: "cpu_avg", value: 22, unit: "percent", category: "resource", details: null },
        { metric: "max_concurrent", value: 4, unit: "agents", category: "resource", details: null },
        { metric: "overall_score", value: 82, unit: "score", category: "resource", details: null },
      ],
    },
    // Raspberry Pi 5 + OpenClaw
    {
      device_slug: "raspberry-pi-5-8gb", fork_slug: "openclaw",
      memory_limit_mb: 8192, cpu_limit: 4,
      started_at: "2026-02-10T15:00:00", completed_at: "2026-02-10T15:12:45",
      results: [
        { metric: "cold_start", value: 18500, unit: "ms", category: "latency", details: null },
        { metric: "warm_response", value: 420, unit: "ms", category: "latency", details: null },
        { metric: "api_call_avg", value: 580, unit: "ms", category: "latency", details: null },
        { metric: "messaging", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "browser_automation", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "code_execution", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "persistent_memory", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "file_management", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "web_search", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "peak_memory", value: 1850, unit: "MB", category: "resource", details: null },
        { metric: "cpu_avg", value: 65, unit: "percent", category: "resource", details: null },
        { metric: "max_concurrent", value: 2, unit: "agents", category: "resource", details: null },
        { metric: "overall_score", value: 58, unit: "score", category: "resource", details: null },
      ],
    },
    // Raspberry Pi 5 + PicoClaw
    {
      device_slug: "raspberry-pi-5-8gb", fork_slug: "picoclaw",
      memory_limit_mb: 8192, cpu_limit: 4,
      started_at: "2026-02-11T09:00:00", completed_at: "2026-02-11T09:02:10",
      results: [
        { metric: "cold_start", value: 1200, unit: "ms", category: "latency", details: null },
        { metric: "warm_response", value: 45, unit: "ms", category: "latency", details: null },
        { metric: "api_call_avg", value: 290, unit: "ms", category: "latency", details: null },
        { metric: "messaging", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "browser_automation", value: 0, unit: "bool", category: "capability", details: null },
        { metric: "code_execution", value: 0, unit: "bool", category: "capability", details: null },
        { metric: "persistent_memory", value: 0, unit: "bool", category: "capability", details: null },
        { metric: "file_management", value: 0, unit: "bool", category: "capability", details: null },
        { metric: "web_search", value: 0, unit: "bool", category: "capability", details: null },
        { metric: "peak_memory", value: 8, unit: "MB", category: "resource", details: null },
        { metric: "cpu_avg", value: 5, unit: "percent", category: "resource", details: null },
        { metric: "max_concurrent", value: 8, unit: "agents", category: "resource", details: null },
        { metric: "overall_score", value: 77, unit: "score", category: "resource", details: null },
      ],
    },
    // Mac Mini M1 + OpenClaw
    {
      device_slug: "mac-mini-m1", fork_slug: "openclaw",
      memory_limit_mb: 8192, cpu_limit: 4,
      started_at: "2026-02-09T10:00:00", completed_at: "2026-02-09T10:08:20",
      results: [
        { metric: "cold_start", value: 8200, unit: "ms", category: "latency", details: null },
        { metric: "warm_response", value: 150, unit: "ms", category: "latency", details: null },
        { metric: "api_call_avg", value: 310, unit: "ms", category: "latency", details: null },
        { metric: "messaging", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "browser_automation", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "code_execution", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "persistent_memory", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "file_management", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "web_search", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "peak_memory", value: 2100, unit: "MB", category: "resource", details: null },
        { metric: "cpu_avg", value: 45, unit: "percent", category: "resource", details: null },
        { metric: "max_concurrent", value: 4, unit: "agents", category: "resource", details: null },
        { metric: "overall_score", value: 78, unit: "score", category: "resource", details: null },
      ],
    },
    // Mac Mini M1 + Nanobot
    {
      device_slug: "mac-mini-m1", fork_slug: "nanobot",
      memory_limit_mb: 8192, cpu_limit: 4,
      started_at: "2026-02-09T11:00:00", completed_at: "2026-02-09T11:03:15",
      results: [
        { metric: "cold_start", value: 2100, unit: "ms", category: "latency", details: null },
        { metric: "warm_response", value: 85, unit: "ms", category: "latency", details: null },
        { metric: "api_call_avg", value: 240, unit: "ms", category: "latency", details: null },
        { metric: "messaging", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "browser_automation", value: 0, unit: "bool", category: "capability", details: null },
        { metric: "code_execution", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "persistent_memory", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "file_management", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "web_search", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "peak_memory", value: 120, unit: "MB", category: "resource", details: null },
        { metric: "cpu_avg", value: 12, unit: "percent", category: "resource", details: null },
        { metric: "max_concurrent", value: 8, unit: "agents", category: "resource", details: null },
        { metric: "overall_score", value: 91, unit: "score", category: "resource", details: null },
      ],
    },
    // NVIDIA Jetson Orin Nano + NanoClaw
    {
      device_slug: "nvidia-jetson-orin-nano", fork_slug: "nanoclaw",
      memory_limit_mb: 8192, cpu_limit: 6,
      started_at: "2026-02-12T08:00:00", completed_at: "2026-02-12T08:06:40",
      results: [
        { metric: "cold_start", value: 5800, unit: "ms", category: "latency", details: null },
        { metric: "warm_response", value: 210, unit: "ms", category: "latency", details: null },
        { metric: "api_call_avg", value: 350, unit: "ms", category: "latency", details: null },
        { metric: "messaging", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "browser_automation", value: 0, unit: "bool", category: "capability", details: null },
        { metric: "code_execution", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "persistent_memory", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "file_management", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "web_search", value: 0, unit: "bool", category: "capability", details: null },
        { metric: "peak_memory", value: 380, unit: "MB", category: "resource", details: null },
        { metric: "cpu_avg", value: 28, unit: "percent", category: "resource", details: null },
        { metric: "max_concurrent", value: 4, unit: "agents", category: "resource", details: null },
        { metric: "overall_score", value: 74, unit: "score", category: "resource", details: null },
      ],
    },
    // Beelink SER5 Max + IronClaw
    {
      device_slug: "beelink-ser5-max", fork_slug: "ironclaw",
      memory_limit_mb: 16384, cpu_limit: 8,
      started_at: "2026-02-13T16:00:00", completed_at: "2026-02-13T16:07:55",
      results: [
        { metric: "cold_start", value: 6500, unit: "ms", category: "latency", details: null },
        { metric: "warm_response", value: 130, unit: "ms", category: "latency", details: null },
        { metric: "api_call_avg", value: 280, unit: "ms", category: "latency", details: null },
        { metric: "messaging", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "browser_automation", value: 0, unit: "bool", category: "capability", details: null },
        { metric: "code_execution", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "persistent_memory", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "file_management", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "web_search", value: 0, unit: "bool", category: "capability", details: null },
        { metric: "peak_memory", value: 420, unit: "MB", category: "resource", details: null },
        { metric: "cpu_avg", value: 18, unit: "percent", category: "resource", details: null },
        { metric: "max_concurrent", value: 8, unit: "agents", category: "resource", details: null },
        { metric: "overall_score", value: 80, unit: "score", category: "resource", details: null },
      ],
    },
    // Mac Mini M3 + OpenClaw
    {
      device_slug: "mac-mini-m3-16gb", fork_slug: "openclaw",
      memory_limit_mb: 16384, cpu_limit: 8,
      started_at: "2026-02-08T12:00:00", completed_at: "2026-02-08T12:06:18",
      results: [
        { metric: "cold_start", value: 5400, unit: "ms", category: "latency", details: null },
        { metric: "warm_response", value: 95, unit: "ms", category: "latency", details: null },
        { metric: "api_call_avg", value: 210, unit: "ms", category: "latency", details: null },
        { metric: "messaging", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "browser_automation", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "code_execution", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "persistent_memory", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "file_management", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "web_search", value: 1, unit: "bool", category: "capability", details: null },
        { metric: "peak_memory", value: 2300, unit: "MB", category: "resource", details: null },
        { metric: "cpu_avg", value: 32, unit: "percent", category: "resource", details: null },
        { metric: "max_concurrent", value: 8, unit: "agents", category: "resource", details: null },
        { metric: "overall_score", value: 88, unit: "score", category: "resource", details: null },
      ],
    },
  ];

  const benchmarkInsert = db().transaction(() => {
    for (const bench of benchmarkSeeds) {
      const runResult = insertBenchmarkRun.run({
        device_id: did(bench.device_slug),
        fork_id: fid(bench.fork_slug),
        docker_image: "clawbench:latest",
        memory_limit_mb: bench.memory_limit_mb,
        cpu_limit: bench.cpu_limit,
        started_at: bench.started_at,
        completed_at: bench.completed_at,
      });
      const runId = Number(runResult.lastInsertRowid);
      for (const r of bench.results) {
        insertBenchmarkResult.run({
          run_id: runId,
          metric: r.metric,
          value: r.value,
          unit: r.unit,
          category: r.category,
          details: r.details,
        });
      }
    }
  });
  benchmarkInsert();
}
