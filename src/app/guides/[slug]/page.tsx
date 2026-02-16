import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Snowflake,
  Flame,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Terminal,
  Cpu,
  HardDrive,
  MemoryStick,
  Lightbulb,
  Download,
  ShoppingCart,
  ExternalLink,
} from "lucide-react";
import {
  getAffiliateLinks,
} from "@/lib/queries";
import {
  getDeviceBySlugCached,
  getForkBySlugCached,
  getVerdictForDeviceAndForkCached,
} from "@/lib/queries-cached";
import { createMetadata } from "@/lib/seo/metadata";
import { evaluateSeoGuardrails } from "@/lib/seo/guardrails";
import { createNeonDuplicateDetector } from "@/lib/seo/neon-duplicate-detector";
import { breadcrumbsForGuide, relatedLinksForGuide } from "@/lib/seo/links";
import { guidePath } from "@/lib/seo/routes";
import { buildBreadcrumbList, buildHowTo, buildSchemaGraph } from "@/lib/seo/schema";
import { JsonLd } from "@/components/json-ld";
import { VerdictBadge } from "@/components/verdict-badge";
import { CategoryBadge } from "@/components/device-card";

export const dynamic = "force-static";
export const revalidate = 86400; // 24h ISR; avoids build-time param explosion at scale.

function formatRam(gb: number): string {
  if (gb < 0.001) return `${Math.round(gb * 1024 * 1024)}KB`;
  if (gb < 1) return `${Math.round(gb * 1024)}MB`;
  return `${gb}GB`;
}

function formatRamMb(mb: number): string {
  if (mb === 0) return "N/A (Serverless)";
  if (mb < 1024) return `${mb}MB`;
  return `${(mb / 1024).toFixed(0)}GB`;
}

function parseSlug(slug: string): { forkSlug: string; deviceSlug: string } | null {
  const match = slug.match(/^(.+)-on-(.+)$/);
  if (!match) return null;

  const parts = slug.split("-on-");
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { forkSlug: parts[0], deviceSlug: parts[1] };
  }
  return null;
}

type InstallStep = {
  title: string;
  command?: string;
  description: string;
};

function getInstallSteps(language: string | null, forkName: string, forkSlug: string, githubUrl: string | null): InstallStep[] {
  const repoUrl = githubUrl ?? `https://github.com/openclaw/${forkSlug}`;

  switch (language) {
    case "TypeScript":
    case "JavaScript":
      return [
        {
          title: "Install Node.js via nvm",
          command: "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash\nnvm install --lts\nnvm use --lts",
          description: "Install Node.js LTS using nvm (Node Version Manager). This ensures you have the correct Node.js version.",
        },
        {
          title: `Clone ${forkName}`,
          command: `git clone ${repoUrl}.git\ncd ${forkSlug}`,
          description: `Download the ${forkName} source code from GitHub.`,
        },
        {
          title: "Install dependencies",
          command: "npm install",
          description: "Install all required Node.js packages.",
        },
        {
          title: "Configure environment",
          command: "cp .env.example .env\n# Edit .env with your API keys and settings",
          description: "Copy the example environment file and configure your API keys, messaging platform tokens, and other settings.",
        },
        {
          title: `Start ${forkName}`,
          command: "npm start",
          description: `Launch ${forkName}. On first run, it will initialize the database and connect to configured services.`,
        },
      ];

    case "Python":
      return [
        {
          title: "Install Python 3.11+",
          command: "# Ubuntu/Debian\nsudo apt update && sudo apt install python3 python3-pip python3-venv\n\n# macOS\nbrew install python@3.11",
          description: "Ensure you have Python 3.11 or newer installed.",
        },
        {
          title: `Clone ${forkName}`,
          command: `git clone ${repoUrl}.git\ncd ${forkSlug}`,
          description: `Download the ${forkName} source code.`,
        },
        {
          title: "Create virtual environment",
          command: "python3 -m venv venv\nsource venv/bin/activate",
          description: "Create and activate an isolated Python environment.",
        },
        {
          title: "Install dependencies",
          command: "pip install -r requirements.txt",
          description: "Install all required Python packages.",
        },
        {
          title: "Configure and run",
          command: `cp .env.example .env\n# Edit .env with your settings\npython -m ${forkSlug}`,
          description: `Configure your environment variables and start ${forkName}.`,
        },
      ];

    case "Go":
      return [
        {
          title: "Install Go 1.22+",
          command: "# Download from https://go.dev/dl/\n# Or use package manager:\nbrew install go  # macOS\nsudo apt install golang  # Ubuntu",
          description: "Install Go 1.22 or newer. Go compiles to a single binary with no dependencies.",
        },
        {
          title: `Install ${forkName}`,
          command: `go install ${repoUrl.replace("https://", "")}@latest`,
          description: `Install ${forkName} directly from source. This compiles a native binary for your platform.`,
        },
        {
          title: "Configure and run",
          command: `# Create config file\nmkdir -p ~/.config/${forkSlug}\n${forkSlug} --init\n\n# Edit config and start\n${forkSlug}`,
          description: `Initialize the configuration and start ${forkName}. The single binary includes everything needed.`,
        },
      ];

    case "Rust":
      return [
        {
          title: "Install Rust via rustup",
          command: "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh\nsource ~/.cargo/env",
          description: "Install the Rust toolchain using rustup.",
        },
        {
          title: `Clone and build ${forkName}`,
          command: `git clone ${repoUrl}.git\ncd ${forkSlug}\ncargo build --release`,
          description: `Clone and compile ${forkName} in release mode. This may take a few minutes on lower-powered devices.`,
        },
        {
          title: "Configure and run",
          command: `cp .env.example .env\n# Edit .env with your settings\n./target/release/${forkSlug}`,
          description: `Configure environment variables and run the compiled binary.`,
        },
      ];

    case "C":
      return [
        {
          title: "Install ESP-IDF 5.5",
          command: "mkdir -p ~/esp\ncd ~/esp\ngit clone --recursive https://github.com/espressif/esp-idf.git -b v5.5\ncd esp-idf\n./install.sh esp32s3\nsource export.sh",
          description: "Install the Espressif IoT Development Framework. This is required for ESP32-S3 development.",
        },
        {
          title: `Clone ${forkName}`,
          command: `git clone ${repoUrl}.git\ncd ${forkSlug}`,
          description: `Download the ${forkName} firmware source code.`,
        },
        {
          title: "Configure the project",
          command: "idf.py menuconfig\n# Set WiFi credentials, API keys, and GPIO pins",
          description: "Use the ESP-IDF menu configuration to set your WiFi network, API keys, and hardware pin mappings.",
        },
        {
          title: "Build and flash",
          command: "idf.py build\nidf.py -p /dev/ttyUSB0 flash monitor",
          description: "Compile the firmware, flash it to the ESP32-S3 via USB, and open the serial monitor to see output.",
        },
      ];

    case "C++":
      return [
        {
          title: "Install build tools",
          command: "# Ubuntu/Debian\nsudo apt update && sudo apt install build-essential cmake git\n\n# macOS\nxcode-select --install\nbrew install cmake",
          description: "Install a C++ compiler, CMake, and Git.",
        },
        {
          title: `Clone ${forkName}`,
          command: `git clone ${repoUrl}.git\ncd ${forkSlug}`,
          description: `Download the ${forkName} source code.`,
        },
        {
          title: "Build from source",
          command: "mkdir build && cd build\ncmake -DCMAKE_BUILD_TYPE=Release ..\nmake -j$(nproc)",
          description: `Compile ${forkName} with optimizations. On ARM devices, this may take several minutes.`,
        },
        {
          title: "Install and run",
          command: `sudo make install\n${forkSlug} --config /etc/${forkSlug}/config.toml`,
          description: `Install the binary system-wide and start ${forkName} with a configuration file.`,
        },
      ];

    case "Swift":
      return [
        {
          title: "Ensure Xcode is installed",
          command: "xcode-select --install\n# Or install Xcode from the App Store",
          description: "Swift requires Xcode Command Line Tools on macOS. Install via the command line or App Store.",
        },
        {
          title: `Clone ${forkName}`,
          command: `git clone ${repoUrl}.git\ncd ${forkSlug}`,
          description: `Download the ${forkName} source code.`,
        },
        {
          title: "Build with Swift Package Manager",
          command: "swift build -c release",
          description: "Compile the project in release mode using SwiftPM.",
        },
        {
          title: "Run the agent",
          command: `.build/release/${forkSlug}\n# Or open in Xcode:\nopen Package.swift`,
          description: `Run the compiled binary, or open in Xcode for development and debugging.`,
        },
      ];

    case "Elixir":
      return [
        {
          title: "Install Erlang/OTP and Elixir",
          command: "# Using asdf (recommended)\nasdf plugin add erlang\nasdf plugin add elixir\nasdf install erlang 27.0\nasdf install elixir 1.17.0-otp-27\nasdf global erlang 27.0\nasdf global elixir 1.17.0-otp-27",
          description: "Install Erlang/OTP and Elixir using asdf version manager. Elixir runs on the BEAM virtual machine.",
        },
        {
          title: `Clone ${forkName}`,
          command: `git clone ${repoUrl}.git\ncd ${forkSlug}`,
          description: `Download the ${forkName} source code.`,
        },
        {
          title: "Install dependencies and setup",
          command: "mix deps.get\nmix ecto.setup",
          description: "Fetch Elixir dependencies and initialize the database.",
        },
        {
          title: "Configure and start",
          command: `cp config/runtime.example.exs config/runtime.exs\n# Edit config/runtime.exs with your settings\nMIX_ENV=prod mix release\n_build/prod/rel/${forkSlug}/bin/${forkSlug} start`,
          description: `Build a production release and start ${forkName}. The BEAM VM provides hot code reloading and fault tolerance.`,
        },
      ];

    default:
      // Serverless (Moltworker) or unknown
      if (forkSlug === "moltworker") {
        return [
          {
            title: "Install Wrangler CLI",
            command: "npm install -g wrangler\nwrangler login",
            description: "Install Cloudflare's Wrangler CLI and authenticate with your Cloudflare account.",
          },
          {
            title: `Clone ${forkName}`,
            command: `git clone ${repoUrl}.git\ncd ${forkSlug}`,
            description: `Download the ${forkName} source code.`,
          },
          {
            title: "Configure Workers settings",
            command: "cp wrangler.example.toml wrangler.toml\n# Edit wrangler.toml with your account ID and settings",
            description: "Configure your Cloudflare account ID, KV namespaces, and environment variables.",
          },
          {
            title: "Deploy to Cloudflare Workers",
            command: "wrangler deploy",
            description: `Deploy ${forkName} to Cloudflare's global edge network. Your agent will be available in 300+ cities worldwide.`,
          },
        ];
      }
      return [
        {
          title: `Clone ${forkName}`,
          command: `git clone ${repoUrl}.git\ncd ${forkSlug}`,
          description: `Download the ${forkName} source code from GitHub.`,
        },
        {
          title: "Follow the README",
          command: `cat README.md`,
          description: `Check the project README for specific installation instructions.`,
        },
      ];
  }
}

function getCategoryTips(category: string): { tip: string; icon: "lightbulb" }[] {
  const tips: Record<string, string[]> = {
    SBC: [
      "Use an NVMe SSD instead of microSD for much better I/O performance.",
      "Add a heatsink or active cooling to prevent thermal throttling under load.",
      "Configure swap on a fast storage device for extra memory headroom.",
      "Use a quality USB-C power supply rated for the board's requirements.",
    ],
    Desktop: [
      "Run OpenClaw as a systemd service for automatic startup and recovery.",
      "Use Docker or Podman for easy updates and isolation.",
      "Monitor RAM usage and consider disabling unused integrations to save memory.",
    ],
    Laptop: [
      "Configure power management to prevent the system from sleeping when the lid is closed.",
      "Keep the laptop plugged in for always-on operation.",
      "Use a lightweight desktop environment to minimize background RAM usage.",
    ],
    Cloud: [
      "Use a reverse proxy like Caddy or nginx for HTTPS termination.",
      "Set up monitoring with tools like htop, Prometheus, or Grafana.",
      "Use cloud provider snapshots for easy backup and recovery.",
      "Consider spot/preemptible instances for cost savings on non-critical deployments.",
    ],
    Microcontroller: [
      "Use a serial monitor to debug firmware issues during initial setup.",
      "Flash firmware over USB first, then enable OTA updates for convenience.",
      "Keep GPIO pin assignments documented for your specific wiring setup.",
    ],
    Handheld: [
      "Run OpenClaw in desktop mode for full terminal access.",
      "Connect to WiFi rather than cellular for lower latency.",
      "Monitor battery drain and consider running only when plugged in.",
    ],
    NAS: [
      "Run OpenClaw in a Docker container to keep it isolated from NAS services.",
      "Allocate a dedicated CPU core and memory limit to prevent NAS performance impact.",
      "Use the NAS storage for persistent data and backups.",
    ],
    Appliance: [
      "Check if your appliance supports add-on containers or Docker before installing.",
      "Allocate limited resources to avoid impacting the primary appliance function.",
      "Use the appliance's built-in backup tools for data protection.",
    ],
    "Mini PC": [
      "Mount the mini PC behind a monitor or under a desk for a clean setup.",
      "Use the built-in WiFi or Ethernet for reliable connectivity.",
      "Configure BIOS to auto-power-on after power loss for unattended operation.",
    ],
    Phone: [
      "Use Termux for the best Linux-like experience on Android.",
      "Install Termux:Boot to auto-start services on device boot.",
      "Use a wake lock app to prevent the OS from killing background processes.",
    ],
    Tablet: [
      "For iPads, SwiftClaw is the only option without jailbreaking.",
      "Android tablets can use Termux for full Linux fork support.",
      "Use a keyboard accessory for easier terminal interaction.",
    ],
    Server: [
      "Configure RAID for data redundancy on production deployments.",
      "Use IPMI/iDRAC for remote management and monitoring.",
      "Set up automated backups of configuration and conversation data.",
    ],
    Router: [
      "Only install lightweight forks to avoid impacting routing performance.",
      "Use the router's LuCI interface to monitor resource usage.",
      "Keep the fork updated separately from OpenWrt firmware updates.",
    ],
  };

  return (tips[category] ?? tips.Desktop ?? []).map((tip) => ({ tip, icon: "lightbulb" as const }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const parsed = parseSlug(slug);
  if (!parsed) return { title: "Not Found" };

  const device = await getDeviceBySlugCached(parsed.deviceSlug);
  const fork = await getForkBySlugCached(parsed.forkSlug);
  if (!device || !fork) return { title: "Not Found" };

  const title = `How to Set Up ${fork.name} on ${device.name}`;
  const description = `Step-by-step guide to install and run ${fork.name} (${fork.language}) on ${device.name}. Prerequisites, install commands, expected performance, and tips for ${device.category} devices.`;

  const canonicalPath = guidePath(fork.slug, device.slug);
  const canonicalSlug = `${fork.slug}-on-${device.slug}`;
  const isCanonical = canonicalSlug === slug;
  const installSteps = getInstallSteps(fork.language, fork.name, fork.slug, fork.github_url);

  const guardrails = await evaluateSeoGuardrails({
    canonicalPath,
    requestedIndexable: isCanonical,
    content: {
      title,
      description,
      h1: title,
      headings: ["Prerequisites", "Install Steps", "Troubleshooting", "Tips"],
      body: installSteps.map((s) => s.title).join(" "),
    },
    policy: { minWords: 40 },
    duplicateDetector: createNeonDuplicateDetector("guides", { nearDistance: 3 }),
  });

  return createMetadata({
    title,
    description,
    canonicalPath: guardrails.canonicalPath,
    indexable: guardrails.indexable,
  });
}

export default async function SetupGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const parsed = parseSlug(slug);
  if (!parsed) notFound();

  const device = await getDeviceBySlugCached(parsed.deviceSlug);
  const fork = await getForkBySlugCached(parsed.forkSlug);
  if (!device || !fork) notFound();

  const canonicalSlug = `${fork.slug}-on-${device.slug}`;
  if (slug !== canonicalSlug) {
    redirect(`/guides/${canonicalSlug}`);
  }

  const verdict = await getVerdictForDeviceAndForkCached(parsed.deviceSlug, parsed.forkSlug);
  if (!verdict || verdict.verdict === "WONT_RUN") notFound();

  const installSteps = getInstallSteps(fork.language, fork.name, fork.slug, fork.github_url);
  const tips = getCategoryTips(device.category);
  const affiliateLinks = await getAffiliateLinks(device.id);

  const ramAvailableMb = device.ram_gb * 1024;
  const ramOk = fork.min_ram_mb === 0 || ramAvailableMb >= fork.min_ram_mb;
  const storageOk = true;

  const jsonLd = buildSchemaGraph([
    buildHowTo({
      name: `How to Set Up ${fork.name} on ${device.name}`,
      description: `Install and configure ${fork.name} on ${device.name}`,
      totalTime: `PT${installSteps.length * 5}M`,
      tools: [device.name],
      steps: installSteps.map((step, idx) => ({
        position: idx + 1,
        name: step.title,
        text: step.description,
        command: step.command,
      })),
    }),
    buildBreadcrumbList(breadcrumbsForGuide({ fork, device })),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <JsonLd data={jsonLd} />

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-navy-light mb-6">
        <Link href="/" className="hover:text-ocean-800">Home</Link>
        <ChevronRight size={14} />
        <Link href="/forks" className="hover:text-ocean-800">Forks</Link>
        <ChevronRight size={14} />
        <Link href={`/forks/${fork.slug}`} className="hover:text-ocean-800">{fork.name}</Link>
        <ChevronRight size={14} />
        <span className="text-navy">Setup on {device.name}</span>
      </nav>

      {/* Header */}
      <div className="rounded-xl border border-ocean-200 bg-white p-8 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <CategoryBadge category={device.category} />
          <span className="text-xs font-mono font-medium text-ocean-800 bg-ocean-200 px-2 py-0.5 rounded">
            {fork.language}
          </span>
          <VerdictBadge verdict={verdict.verdict} size="sm" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-navy">
          How to Set Up {fork.name} on {device.name}
        </h1>
        <p className="mt-2 text-navy-light">
          {fork.description}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prerequisites */}
          <div className="rounded-xl border border-ocean-200 bg-white p-8">
            <h2 className="font-heading text-lg font-semibold text-navy mb-4 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-ocean-600" />
              Prerequisites
            </h2>
            <div className="space-y-3">
              {/* RAM check */}
              <div className="flex items-center gap-3 rounded-lg border border-ocean-100 p-3">
                <MemoryStick size={18} className="text-ocean-600 shrink-0" />
                <div className="flex-1 text-sm">
                  <span className="font-medium text-navy">RAM: </span>
                  <span className="text-navy-light">
                    {formatRamMb(fork.min_ram_mb)} required, {formatRam(device.ram_gb)} available
                  </span>
                </div>
                {ramOk ? (
                  <CheckCircle2 size={18} className="text-verdict-great shrink-0" />
                ) : (
                  <XCircle size={18} className="text-verdict-wont shrink-0" />
                )}
              </div>

              {/* Storage check */}
              <div className="flex items-center gap-3 rounded-lg border border-ocean-100 p-3">
                <HardDrive size={18} className="text-ocean-600 shrink-0" />
                <div className="flex-1 text-sm">
                  <span className="font-medium text-navy">Storage: </span>
                  <span className="text-navy-light">
                    {fork.min_storage_mb}MB required, {device.storage ?? "varies"} available
                  </span>
                </div>
                {storageOk ? (
                  <CheckCircle2 size={18} className="text-verdict-great shrink-0" />
                ) : (
                  <XCircle size={18} className="text-verdict-wont shrink-0" />
                )}
              </div>

              {/* CPU check */}
              <div className="flex items-center gap-3 rounded-lg border border-ocean-100 p-3">
                <Cpu size={18} className="text-ocean-600 shrink-0" />
                <div className="flex-1 text-sm">
                  <span className="font-medium text-navy">CPU: </span>
                  <span className="text-navy-light">
                    {fork.min_cpu_cores ?? 1} core{(fork.min_cpu_cores ?? 1) > 1 ? "s" : ""} minimum
                  </span>
                </div>
                <CheckCircle2 size={18} className="text-verdict-great shrink-0" />
              </div>

              {/* Verdict warning */}
              {verdict.verdict === "BARELY_RUNS" && (
                <div className="flex items-start gap-3 rounded-lg border border-verdict-barely/30 bg-verdict-barely/5 p-3">
                  <AlertTriangle size={18} className="text-verdict-barely shrink-0 mt-0.5" />
                  <div className="text-sm text-navy-light">
                    <span className="font-medium text-navy">Warning: </span>
                    This device barely meets the requirements for {fork.name}. Expect reduced performance and potential stability issues.
                    {verdict.notes && ` ${verdict.notes}`}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Install Steps */}
          <div className="rounded-xl border border-ocean-200 bg-white p-8">
            <h2 className="font-heading text-lg font-semibold text-navy mb-6 flex items-center gap-2">
              <Download size={20} className="text-ocean-600" />
              Installation Steps
            </h2>
            <div className="space-y-6">
              {installSteps.map((step, idx) => (
                <div key={idx} className="relative pl-10">
                  <div className="absolute left-0 top-0 flex items-center justify-center w-7 h-7 rounded-full bg-ocean-800 text-white text-sm font-bold">
                    {idx + 1}
                  </div>
                  {idx < installSteps.length - 1 && (
                    <div className="absolute left-[13px] top-7 w-0.5 h-[calc(100%+8px)] bg-ocean-200" />
                  )}
                  <div>
                    <h3 className="font-medium text-navy">{step.title}</h3>
                    <p className="mt-1 text-sm text-navy-light">{step.description}</p>
                    {step.command && (
                      <div className="mt-3 rounded-lg bg-navy p-4 overflow-x-auto">
                        <pre className="text-sm text-ocean-200 font-mono whitespace-pre">
                          <code>{step.command}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expected Performance */}
          {(verdict.cold_start_sec || verdict.warm_response_sec) && (
            <div className="rounded-xl border border-ocean-200 bg-white p-8">
              <h2 className="font-heading text-lg font-semibold text-navy mb-4 flex items-center gap-2">
                <Terminal size={20} className="text-ocean-600" />
                Expected Performance
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {verdict.cold_start_sec && (
                  <div className="rounded-lg bg-ocean-50 p-4 text-center">
                    <Snowflake size={24} className="mx-auto text-ocean-600 mb-2" />
                    <div className="text-2xl font-bold text-navy">{verdict.cold_start_sec}s</div>
                    <div className="text-xs text-navy-light mt-1">Cold Start Time</div>
                    <p className="text-xs text-navy-light mt-2">
                      Time from process start to first response
                    </p>
                  </div>
                )}
                {verdict.warm_response_sec && (
                  <div className="rounded-lg bg-ocean-50 p-4 text-center">
                    <Flame size={24} className="mx-auto text-orange-500 mb-2" />
                    <div className="text-2xl font-bold text-navy">{verdict.warm_response_sec}s</div>
                    <div className="text-xs text-navy-light mt-1">Warm Response Time</div>
                    <p className="text-xs text-navy-light mt-2">
                      Average response time after startup
                    </p>
                  </div>
                )}
              </div>
              {verdict.notes && (
                <p className="mt-4 text-sm text-navy-light border-t border-ocean-100 pt-4">
                  {verdict.notes}
                </p>
              )}
            </div>
          )}

          {/* Tips */}
          {tips.length > 0 && (
            <div className="rounded-xl border border-ocean-200 bg-white p-8">
              <h2 className="font-heading text-lg font-semibold text-navy mb-4 flex items-center gap-2">
                <Lightbulb size={20} className="text-amber-500" />
                Tips for {device.category} Devices
              </h2>
              <div className="space-y-3">
                {tips.map((t, idx) => (
                  <div key={idx} className="flex items-start gap-3 rounded-lg border border-ocean-100 p-3">
                    <Lightbulb size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-navy-light">{t.tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick info */}
          <div className="rounded-xl border border-ocean-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-navy mb-3">Quick Info</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-navy-light">Device</dt>
                <dd>
                  <Link href={`/devices/${device.slug}`} className="font-medium text-ocean-600 hover:text-ocean-800">
                    {device.name}
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-light">Fork</dt>
                <dd>
                  <Link href={`/forks/${fork.slug}`} className="font-medium text-ocean-600 hover:text-ocean-800">
                    {fork.name}
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-light">Language</dt>
                <dd className="font-medium text-navy">{fork.language}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-light">Verdict</dt>
                <dd><VerdictBadge verdict={verdict.verdict} size="sm" /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-light">Price</dt>
                <dd className="font-medium text-ocean-800">
                  {device.price_usd
                    ? device.price_type === "monthly"
                      ? `$${device.price_usd}/mo`
                      : `$${device.price_usd}`
                    : "Free"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Related links */}
          <div className="rounded-xl border border-ocean-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-navy mb-3">Related Pages</h3>
            <div className="space-y-2 text-sm">
              {relatedLinksForGuide({ fork, device }).map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="block text-ocean-600 hover:text-ocean-800 transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* External links */}
          <div className="rounded-xl border border-ocean-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-navy mb-3">External Links</h3>
            <div className="space-y-2 text-sm">
              {fork.github_url && (
                <a
                  href={fork.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-ocean-600 hover:text-ocean-800 transition-colors"
                >
                  {fork.name} GitHub Repository
                </a>
              )}
              {affiliateLinks.length > 0 ? (
                affiliateLinks.map((link) => (
                  <a
                    key={link.id}
                    href={`/go/${device.slug}?network=${link.network}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-ocean-600 hover:text-ocean-800 transition-colors"
                  >
                    <ShoppingCart size={14} />
                    <span>Buy on {link.label ?? link.network}</span>
                    <ExternalLink size={10} className="text-ocean-400" />
                  </a>
                ))
              ) : device.buy_link ? (
                <a
                  href={`/go/${device.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-ocean-600 hover:text-ocean-800 transition-colors"
                >
                  <ShoppingCart size={14} />
                  <span>Buy {device.name}</span>
                  <ExternalLink size={10} className="text-ocean-400" />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
