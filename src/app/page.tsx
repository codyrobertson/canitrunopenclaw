import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  Anchor,
  GitFork,
  Github,
  Scale,
  Settings,
  Trophy,
  Waves,
} from "lucide-react";
import { getDevicesRanked, getAllForks } from "@/lib/queries";
import { DeviceCard } from "@/components/device-card";
import { SearchBar } from "@/components/search-bar";

export function generateMetadata(): Metadata {
  const devices = getDevicesRanked();
  const forks = getAllForks();
  return {
    title: "Can it run OpenClaw? | Hardware Compatibility for AI Agents",
    description: `Find out if your hardware can run OpenClaw and its forks. Browse ${devices.length}+ devices across ${forks.length} forks — from $4 microcontrollers to cloud GPUs. Community-tested compatibility verdicts.`,
    openGraph: {
      title: "Can it run OpenClaw? | Hardware Compatibility for AI Agents",
      description: `Browse ${devices.length}+ devices across ${forks.length} OpenClaw forks with community-tested compatibility verdicts.`,
    },
  };
}

export default function Home() {
  const allDevices = getDevicesRanked();
  const topDevices = allDevices.slice(0, 6);
  const forks = getAllForks();

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-ocean-900 via-ocean-700 to-ocean-400 py-28 sm:py-36">
        {/* Deep water gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-ocean-900/30 via-transparent to-ocean-800/20" />

        {/* Underwater light rays */}
        <div className="absolute inset-0 overflow-hidden opacity-[0.08]">
          <div className="absolute top-0 left-1/4 w-[2px] h-full bg-gradient-to-b from-white via-white/50 to-transparent rotate-[15deg] origin-top" />
          <div className="absolute top-0 left-1/3 w-[1px] h-[80%] bg-gradient-to-b from-white via-white/30 to-transparent rotate-[8deg] origin-top" />
          <div className="absolute top-0 left-1/2 w-[3px] h-full bg-gradient-to-b from-white via-white/40 to-transparent rotate-[-5deg] origin-top" />
          <div className="absolute top-0 left-2/3 w-[1px] h-[70%] bg-gradient-to-b from-white via-white/30 to-transparent rotate-[-12deg] origin-top" />
          <div className="absolute top-0 right-1/4 w-[2px] h-[90%] bg-gradient-to-b from-white via-white/40 to-transparent rotate-[-8deg] origin-top" />
        </div>

        {/* Floating nautical elements */}
        <div className="absolute top-12 left-[10%] text-ocean-300 opacity-20 animate-float" style={{ animationDelay: "0s" }}><Anchor size={28} /></div>
        <div className="absolute bottom-32 left-[20%] text-ocean-300 opacity-15 animate-float" style={{ animationDelay: "2s" }}><Settings size={24} /></div>
        <div className="absolute top-16 left-[60%] text-ocean-300 opacity-10 animate-drift" style={{ animationDelay: "0.5s" }}><Waves size={28} /></div>

        {/* Layered wave divider */}
        <div className="absolute bottom-0 left-0 w-full" style={{ height: "220px" }}>
          {/* Wave 1 - deepest, most transparent */}
          <svg
            className="absolute bottom-0 w-[115%] -left-[7%]"
            style={{ height: "220px", animation: "sway 12s ease-in-out infinite" }}
            viewBox="0 0 1440 220"
            preserveAspectRatio="none"
          >
            <path
              d="M0,120 C80,160 180,80 320,110 C460,140 520,60 680,100 C840,140 920,70 1080,95 C1240,120 1340,160 1440,130 L1440,220 L0,220 Z"
              fill="#0096C7"
              opacity="0.25"
            />
          </svg>
          {/* Wave 2 - mid-deep */}
          <svg
            className="absolute bottom-0 w-[112%] -left-[6%]"
            style={{ height: "180px", animation: "sway-reverse 9s ease-in-out infinite" }}
            viewBox="0 0 1440 180"
            preserveAspectRatio="none"
          >
            <path
              d="M0,80 C160,130 300,40 480,90 C660,140 780,50 960,80 C1140,110 1280,40 1440,70 L1440,180 L0,180 Z"
              fill="#48CAE4"
              opacity="0.35"
            />
          </svg>
          {/* Wave 3 - middle layer */}
          <svg
            className="absolute bottom-0 w-[110%] -left-[5%]"
            style={{ height: "150px", animation: "sway 7s ease-in-out infinite" }}
            viewBox="0 0 1440 150"
            preserveAspectRatio="none"
          >
            <path
              d="M0,70 C200,110 380,30 580,75 C780,120 900,40 1100,65 C1300,90 1400,50 1440,60 L1440,150 L0,150 Z"
              fill="#90E0EF"
              opacity="0.55"
            />
          </svg>
          {/* Wave 4 - lighter foreground */}
          <svg
            className="absolute bottom-0 w-[106%] -left-[3%]"
            style={{ height: "110px", animation: "sway-reverse 11s ease-in-out infinite" }}
            viewBox="0 0 1440 110"
            preserveAspectRatio="none"
          >
            <path
              d="M0,50 C240,80 420,20 660,55 C900,90 1080,30 1320,60 C1400,70 1440,45 1440,50 L1440,110 L0,110 Z"
              fill="#CAF0F8"
              opacity="0.75"
            />
          </svg>
          {/* Wave 5 - front, matches page bg */}
          <svg
            className="absolute bottom-0 w-[103%] -left-[1.5%]"
            style={{ height: "70px" }}
            viewBox="0 0 1440 70"
            preserveAspectRatio="none"
          >
            <path
              d="M0,35 C180,55 420,15 660,40 C900,65 1140,20 1440,38 L1440,70 L0,70 Z"
              fill="#F8F9FA"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="relative mx-auto max-w-4xl px-4 text-center z-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-ocean-200 backdrop-blur-sm">
            <span>&#x1F980;</span>
            <span>Hardware compatibility for the AI agent era</span>
          </div>
          <h1 className="font-heading text-5xl font-bold text-white sm:text-6xl lg:text-7xl drop-shadow-lg">
            Can it run{" "}
            <span className="bg-gradient-to-r from-ocean-300 via-ocean-200 to-white bg-clip-text text-transparent">
              OpenClaw
            </span>
            <span className="text-ocean-300">?</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-ocean-200 sm:text-xl">
            Find out if your hardware can handle the claw. Browse {allDevices.length}+ devices
            across {forks.length} OpenClaw forks — from $4 microcontrollers to cloud GPUs.
          </p>
          <div className="mt-10 flex justify-center">
            <Suspense fallback={<div className="w-full max-w-xl h-[52px] rounded-xl bg-white/20 animate-pulse" />}>
              <SearchBar placeholder="Search devices by name, CPU, or description..." />
            </Suspense>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-ocean-300">
            <Link href="/devices?category=SBC" className="rounded-full border border-ocean-400/30 px-3 py-1 hover:bg-white/10 transition-colors">
              SBCs
            </Link>
            <Link href="/devices?category=Desktop" className="rounded-full border border-ocean-400/30 px-3 py-1 hover:bg-white/10 transition-colors">
              Desktops
            </Link>
            <Link href="/devices?category=Laptop" className="rounded-full border border-ocean-400/30 px-3 py-1 hover:bg-white/10 transition-colors">
              Laptops
            </Link>
            <Link href="/devices?category=Cloud" className="rounded-full border border-ocean-400/30 px-3 py-1 hover:bg-white/10 transition-colors">
              Cloud
            </Link>
            <Link href="/devices?category=Microcontroller" className="rounded-full border border-ocean-400/30 px-3 py-1 hover:bg-white/10 transition-colors">
              Microcontrollers
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="relative -mt-6 z-20 mx-auto max-w-5xl px-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white p-4 text-center shadow-lg border border-ocean-100">
            <div className="text-2xl font-bold text-ocean-800">{allDevices.length}</div>
            <div className="text-xs text-navy-light mt-1">Devices Tested</div>
          </div>
          <div className="rounded-xl bg-white p-4 text-center shadow-lg border border-ocean-100">
            <div className="text-2xl font-bold text-ocean-800">{forks.length}</div>
            <div className="text-xs text-navy-light mt-1">OpenClaw Forks</div>
          </div>
          <div className="rounded-xl bg-white p-4 text-center shadow-lg border border-ocean-100">
            <div className="text-2xl font-bold text-verdict-great">$4</div>
            <div className="text-xs text-navy-light mt-1">Cheapest Device</div>
          </div>
          <div className="rounded-xl bg-white p-4 text-center shadow-lg border border-ocean-100">
            <div className="text-2xl font-bold text-ocean-800">8MB</div>
            <div className="text-xs text-navy-light mt-1">Min RAM (MimiClaw)</div>
          </div>
        </div>
      </section>

      {/* Top Rated Devices */}
      <section className="mx-auto max-w-7xl px-4 py-16 pt-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-heading text-2xl font-bold text-navy flex items-center gap-2">
              <Trophy size={20} className="text-amber-500" /> Top Rated Devices
            </h2>
            <p className="mt-1 text-sm text-navy-light">Ranked by community ratings and compatibility verdicts</p>
          </div>
          <Link href="/devices" className="rounded-lg bg-ocean-100 px-4 py-2 text-sm font-medium text-ocean-800 hover:bg-ocean-200 transition-colors">
            View all &rarr;
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topDevices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      </section>

      {/* Fork Overview */}
      <section className="bg-gradient-to-b from-white to-ocean-100/30 border-y border-ocean-200">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-8">
            <h2 className="font-heading text-2xl font-bold text-navy flex items-center gap-2">
              <GitFork size={20} className="text-ocean-600" /> OpenClaw Forks
            </h2>
            <p className="mt-1 text-sm text-navy-light">From 8MB microcontrollers to serverless edge — there&apos;s a fork for every device</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {forks.map((fork) => {
              const features = JSON.parse(fork.features) as string[];
              return (
                <Link
                  key={fork.id}
                  href={`/forks/${fork.slug}`}
                  className="group rounded-xl border border-ocean-200 bg-white p-5 hover:border-ocean-400 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono font-medium text-ocean-600 bg-ocean-100 px-2 py-0.5 rounded">
                      {fork.language}
                    </span>
                    <span className="text-xs text-navy-light">
                      {fork.min_ram_mb === 0 ? "Serverless" : fork.min_ram_mb < 1024 ? `${fork.min_ram_mb}MB` : `${(fork.min_ram_mb / 1024).toFixed(0)}GB`} min
                    </span>
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-navy group-hover:text-ocean-800 transition-colors">
                    {fork.name}
                  </h3>
                  <p className="mt-1 text-sm text-navy-light line-clamp-2">
                    {fork.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {features.slice(0, 3).map((f) => (
                      <span key={f} className="text-[10px] text-ocean-600 bg-ocean-100/60 px-1.5 py-0.5 rounded">
                        {f}
                      </span>
                    ))}
                    {features.length > 3 && (
                      <span className="text-[10px] text-navy-light px-1.5 py-0.5">
                        +{features.length - 3} more
                      </span>
                    )}
                  </div>
                  {fork.codebase_size_lines && (
                    <p className="mt-2 text-xs text-ocean-600">
                      {fork.codebase_size_lines.toLocaleString()} lines of code
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-ocean-900 via-ocean-800 to-ocean-700 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="font-heading text-3xl font-bold text-white">
            Not sure which device to pick?
          </h2>
          <p className="mt-3 text-ocean-300 text-lg">
            Compare up to 3 devices side-by-side to find your perfect OpenClaw host.
          </p>
          <Link
            href="/compare"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-ocean-800 hover:bg-ocean-100 transition-colors"
          >
            <Scale size={18} /> Compare Devices
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ocean-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">&#x1F980;</span>
              <span className="font-heading font-bold text-navy">Can it run OpenClaw?</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-navy-light">
              <Link href="/devices" className="hover:text-ocean-800 transition-colors">Devices</Link>
              <Link href="/forks" className="hover:text-ocean-800 transition-colors">Forks</Link>
              <Link href="/compare" className="hover:text-ocean-800 transition-colors">Compare</Link>
              <a href="https://github.com/openclaw/openclaw" className="inline-flex items-center gap-1 hover:text-ocean-800 transition-colors" target="_blank" rel="noopener">
                <Github size={14} /> GitHub
              </a>
            </div>
          </div>
          <div className="mt-6 border-t border-ocean-100 pt-6 text-center text-xs text-navy-light">
            <p>An open hardware compatibility directory. Not affiliated with OpenClaw.</p>
            <p className="mt-1">Data sourced from community benchmarks and official documentation.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
