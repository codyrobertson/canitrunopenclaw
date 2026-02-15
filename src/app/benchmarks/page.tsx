import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  Box,
  Brain,
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  FileText,
  Globe,
  HardDrive,
  type LucideIcon,
  MemoryStick,
  MessageSquare,
  Monitor,
  Puzzle,
  Search,
  Trophy,
  Wrench,
  Zap,
} from "lucide-react";
import {
  getBenchmarkLeaderboard,
  getBenchmarkForkSummaries,
  getBenchmarkTotalRuns,
  getCategories,
  getAllForks,
} from "@/lib/queries";
import { createFilterAwareMetadata } from "@/lib/seo/listings";
import { buildBreadcrumbList, buildSchemaGraph } from "@/lib/seo/schema";
import { JsonLd } from "@/components/json-ld";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ fork?: string; category?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const total = await getBenchmarkTotalRuns();
  const summaries = await getBenchmarkForkSummaries();

  const title = "ClawBench Benchmarks | Hardware Performance Leaderboard";
  const description = `ClawBench benchmark results for ${summaries.length} OpenClaw forks across ${total} device tests. Compare cold start times, memory usage, and capability scores.`;

  const hasFilters = Boolean(params.fork || params.category);
  return createFilterAwareMetadata({
    title,
    description,
    basePath: "/benchmarks",
    hasFilters,
  });
}

function formatMs(ms: number | null): string {
  if (ms === null) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-navy-light";
  if (score >= 85) return "text-verdict-great";
  if (score >= 60) return "text-verdict-ok";
  if (score >= 30) return "text-amber-600";
  return "text-verdict-wont";
}

function scoreBg(score: number | null): string {
  if (score === null) return "bg-gray-50 border-gray-200";
  if (score >= 85) return "bg-green-50 border-green-200";
  if (score >= 60) return "bg-blue-50 border-blue-200";
  if (score >= 30) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

const langColors: Record<string, string> = {
  Go: "bg-cyan-100 text-cyan-700",
  TypeScript: "bg-blue-100 text-blue-700",
  Python: "bg-yellow-100 text-yellow-700",
  Rust: "bg-orange-100 text-orange-700",
  Elixir: "bg-purple-100 text-purple-700",
  "C++": "bg-rose-100 text-rose-700",
  C: "bg-slate-100 text-slate-700",
  Swift: "bg-orange-100 text-orange-700",
};

export default async function BenchmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ fork?: string; category?: string }>;
}) {
  const params = await searchParams;
  const forkFilter = params.fork;
  const categoryFilter = params.category;

  const [summaries, totalRuns, leaderboard, categories, allForks] = await Promise.all([
    getBenchmarkForkSummaries(),
    getBenchmarkTotalRuns(),
    getBenchmarkLeaderboard({
      forkSlug: forkFilter,
      category: categoryFilter,
      limit: 100,
    }),
    getCategories(),
    getAllForks(),
  ]);

  const jsonLd = buildSchemaGraph([
    buildBreadcrumbList([
      { name: "Home", path: "/" },
      { name: "Benchmarks", path: "/benchmarks" },
    ]),
  ]);

  return (
    <main>
      <JsonLd data={jsonLd} />
      {/* Hero */}
      <section className="bg-gradient-to-b from-ocean-900 to-ocean-700 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-3 mb-3">
            <Activity size={28} className="text-ocean-300" />
            <h1 className="font-heading text-2xl sm:text-4xl font-bold text-white">
              ClawBench
            </h1>
          </div>
          <p className="text-ocean-200 text-sm sm:text-base max-w-2xl">
            Standardized benchmarks for OpenClaw forks running on real hardware
            constraints. Each test runs in a Docker container matching the
            device&apos;s CPU and memory profile.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <div className="rounded-lg bg-white/10 px-3 py-2 text-white">
              <span className="text-ocean-300 text-xs block">Total Runs</span>
              <span className="font-bold">{totalRuns}</span>
            </div>
            <div className="rounded-lg bg-white/10 px-3 py-2 text-white">
              <span className="text-ocean-300 text-xs block">Forks Tested</span>
              <span className="font-bold">{summaries.length}</span>
            </div>
            <div className="rounded-lg bg-white/10 px-3 py-2 text-white">
              <span className="text-ocean-300 text-xs block">Best Avg Score</span>
              <span className="font-bold">{summaries[0]?.avg_score ?? "-"}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* Fork Summary Cards */}
        <section className="mb-12">
          <h2 className="font-heading text-lg sm:text-xl font-bold text-navy mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" /> Fork Performance Summary
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaries.map((s, i) => (
              <Link
                key={s.fork_slug}
                href={`/benchmarks?fork=${s.fork_slug}`}
                className={`group rounded-xl border p-4 transition-all hover:shadow-md ${
                  forkFilter === s.fork_slug
                    ? "border-ocean-400 bg-ocean-50 shadow-md"
                    : "border-ocean-200 bg-white hover:border-ocean-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {i === 0 && <Trophy size={14} className="text-amber-500" />}
                    <h3 className="font-heading font-semibold text-navy">
                      {s.fork_name}
                    </h3>
                  </div>
                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded ${
                      langColors[s.fork_language ?? ""] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {s.fork_language}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className={`text-2xl font-bold ${scoreColor(s.avg_score)}`}>
                    {s.avg_score}
                  </span>
                  <span className="text-xs text-navy-light">avg score</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-navy-light">
                  <div className="flex items-center gap-1">
                    <Clock size={10} />
                    <span>{formatMs(s.avg_cold_start_ms)} avg cold start</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MemoryStick size={10} />
                    <span>{s.avg_memory_mb}MB avg memory</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Cpu size={10} />
                    <span>{s.devices_tested} devices</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap size={10} />
                    <span>{s.min_score}-{s.max_score} range</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-sm font-medium text-navy">Filter:</span>
          <Link
            href="/benchmarks"
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !forkFilter && !categoryFilter
                ? "bg-ocean-800 text-white"
                : "bg-ocean-100 text-ocean-700 hover:bg-ocean-200"
            }`}
          >
            All
          </Link>
          {allForks
            .filter((f) => summaries.some((s) => s.fork_slug === f.slug))
            .map((f) => (
              <Link
                key={f.slug}
                href={`/benchmarks?fork=${f.slug}${categoryFilter ? `&category=${categoryFilter}` : ""}`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  forkFilter === f.slug
                    ? "bg-ocean-800 text-white"
                    : "bg-ocean-100 text-ocean-700 hover:bg-ocean-200"
                }`}
              >
                {f.name}
              </Link>
            ))}
          <span className="text-navy-light">|</span>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/benchmarks?category=${cat}${forkFilter ? `&fork=${forkFilter}` : ""}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? "bg-ocean-800 text-white"
                  : "bg-ocean-100 text-ocean-700 hover:bg-ocean-200"
              }`}
            >
              {cat}
            </Link>
          ))}
        </div>

        {/* Leaderboard Table */}
        <section>
          <h2 className="font-heading text-lg sm:text-xl font-bold text-navy mb-4 flex items-center gap-2">
            <Activity size={18} className="text-ocean-600" />
            {forkFilter || categoryFilter ? "Filtered Results" : "Full Leaderboard"}
            <span className="text-sm font-normal text-navy-light ml-1">
              ({leaderboard.length} results)
            </span>
          </h2>

          <div className="overflow-x-auto rounded-xl border border-ocean-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ocean-100 bg-ocean-50/50">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-navy-light w-10">#</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-navy-light">Device</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-navy-light">Fork</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-navy-light">Score</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-navy-light hidden sm:table-cell">Cold Start</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-navy-light hidden md:table-cell">Memory</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-navy-light hidden md:table-cell">Disk</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-navy-light hidden lg:table-cell">Caps</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => (
                  <tr
                    key={`${entry.device_slug}-${entry.fork_slug}-${i}`}
                    className="border-b border-ocean-50 hover:bg-ocean-50/30 transition-colors"
                  >
                    <td className="px-3 py-2.5 text-navy-light font-mono text-xs">
                      {i + 1}
                    </td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/devices/${entry.device_slug}`}
                        className="font-medium text-navy hover:text-ocean-800 transition-colors"
                      >
                        {entry.device_name}
                      </Link>
                      <span className="ml-1.5 text-[10px] text-navy-light">
                        {entry.device_category}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/forks/${entry.fork_slug}`}
                        className="inline-flex items-center gap-1"
                      >
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            langColors[entry.fork_language ?? ""] ?? "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {entry.fork_language}
                        </span>
                        <span className="text-navy-light text-xs">
                          {entry.fork_name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold ${scoreBg(entry.overall_score)} ${scoreColor(entry.overall_score)}`}
                      >
                        {entry.overall_score ?? "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-navy-light font-mono text-xs hidden sm:table-cell">
                      {formatMs(entry.cold_start_ms)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-navy-light font-mono text-xs hidden md:table-cell">
                      {entry.peak_memory_mb ? `${entry.peak_memory_mb}MB` : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-right text-navy-light font-mono text-xs hidden md:table-cell">
                      {entry.disk_mb ? `${entry.disk_mb}MB` : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs hidden lg:table-cell">
                      <span className={entry.capabilities_passed === entry.capabilities_total ? "text-verdict-great" : "text-navy-light"}>
                        {entry.capabilities_passed}/{entry.capabilities_total}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* How ClawBench Works */}
        <section className="mt-16" id="how-it-works">
          <div className="text-center mb-10">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-navy mb-2">
              How ClawBench Works
            </h2>
            <p className="text-sm text-navy-light max-w-xl mx-auto">
              A repeatable, containerized pipeline that benchmarks every fork under real hardware constraints.
            </p>
          </div>

          {/* Pipeline steps — connected with line */}
          <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-12">
            {/* Connector line (desktop only) */}
            <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-ocean-300 via-ocean-400 to-ocean-300" />

            {([
              {
                step: "1",
                icon: Box as LucideIcon,
                title: "Containerize",
                desc: "Clone the fork into a Docker container with CPU and RAM limits matching the target device.",
                accent: "from-blue-500 to-cyan-500",
                bg: "bg-blue-50",
                ring: "ring-blue-200",
                iconColor: "text-blue-600",
              },
              {
                step: "2",
                icon: Wrench as LucideIcon,
                title: "Build & Install",
                desc: "Install dependencies using the native toolchain \u2014 Go, Rust, Python, TypeScript, or C.",
                accent: "from-violet-500 to-purple-500",
                bg: "bg-violet-50",
                ring: "ring-violet-200",
                iconColor: "text-violet-600",
              },
              {
                step: "3",
                icon: Activity as LucideIcon,
                title: "Probe & Measure",
                desc: "Detect entry points, time cold start, track peak memory via cgroup, measure disk usage.",
                accent: "from-amber-500 to-orange-500",
                bg: "bg-amber-50",
                ring: "ring-amber-200",
                iconColor: "text-amber-600",
              },
              {
                step: "4",
                icon: Trophy as LucideIcon,
                title: "Score",
                desc: "Combine results into a 0\u2013100 composite score across latency, capabilities, size, and build.",
                accent: "from-emerald-500 to-green-500",
                bg: "bg-emerald-50",
                ring: "ring-emerald-200",
                iconColor: "text-emerald-600",
              },
            ] as const).map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  className="relative rounded-2xl border border-ocean-200 bg-white p-6 hover:shadow-lg transition-shadow"
                >
                  {/* Step number badge */}
                  <div className="relative z-10 mb-4 flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg} ring-1 ${s.ring}`}>
                      <Icon size={20} className={s.iconColor} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-navy-light">Step {s.step}</span>
                      <h3 className="font-heading text-base font-bold text-navy leading-tight">{s.title}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-navy-light leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Scoring breakdown — visual weight bars */}
          <div className="rounded-2xl border border-ocean-200 bg-white overflow-hidden mb-6">
            <div className="border-b border-ocean-100 bg-gradient-to-r from-ocean-50 to-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-navy">Scoring Breakdown</h3>
              <span className="text-xs text-navy-light font-mono">100 pts total</span>
            </div>
            <div className="p-6 space-y-5">
              {([
                { label: "Capabilities", weight: 40, icon: Brain as LucideIcon, color: "bg-violet-500", desc: "8 capability checks: messaging, browser, code exec, memory, files, search, MCP, tool use" },
                { label: "Latency", weight: 30, icon: Zap as LucideIcon, color: "bg-blue-500", desc: "Cold start time (clone + install + startup). Under 5 seconds = full marks" },
                { label: "Size", weight: 20, icon: HardDrive as LucideIcon, color: "bg-amber-500", desc: "Total disk footprint after install. Under 20MB = full marks" },
                { label: "Build", weight: 10, icon: CheckCircle2 as LucideIcon, color: "bg-emerald-500", desc: "5 points for successful dependency install, 5 for successful startup" },
              ] as const).map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="group">
                    <div className="flex items-center gap-3 mb-1.5">
                      <Icon size={16} className="text-navy-light shrink-0" />
                      <span className="text-sm font-semibold text-navy flex-1">{s.label}</span>
                      <span className="text-sm font-bold font-mono text-navy">{s.weight}<span className="text-navy-light font-normal text-xs"> pts</span></span>
                    </div>
                    <div className="ml-7">
                      <div className="h-2 rounded-full bg-ocean-100 overflow-hidden mb-1.5">
                        <div className={`h-full rounded-full ${s.color} transition-all`} style={{ width: `${s.weight}%` }} />
                      </div>
                      <p className="text-xs text-navy-light">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Score ranges */}
            <div className="border-t border-ocean-100 px-6 py-4 flex flex-wrap items-center gap-4 bg-ocean-50/30">
              <span className="text-xs font-semibold text-navy">Verdicts:</span>
              {([
                { range: "85\u2013100", label: "Runs Great", color: "bg-verdict-great/10 text-verdict-great ring-verdict-great/20" },
                { range: "60\u201384", label: "Runs OK", color: "bg-blue-50 text-blue-600 ring-blue-200" },
                { range: "30\u201359", label: "Barely Runs", color: "bg-amber-50 text-amber-600 ring-amber-200" },
                { range: "0\u201329", label: "Won\u2019t Run", color: "bg-red-50 text-verdict-wont ring-red-200" },
              ] as const).map((v) => (
                <span key={v.range} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${v.color}`}>
                  {v.range} {v.label}
                </span>
              ))}
            </div>
          </div>

          {/* Capability tests — icon grid */}
          <div className="rounded-2xl border border-ocean-200 bg-white overflow-hidden">
            <div className="border-b border-ocean-100 bg-gradient-to-r from-ocean-50 to-white px-6 py-4">
              <h3 className="font-heading text-base font-bold text-navy">8 Capability Tests</h3>
              <p className="text-xs text-navy-light mt-0.5">Static source analysis + runtime module probing (Python)</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4">
              {([
                { name: "Messaging", desc: "WhatsApp, Telegram, Discord, Slack", icon: MessageSquare as LucideIcon, color: "text-blue-500 bg-blue-50" },
                { name: "Browser", desc: "Puppeteer, Playwright, Selenium", icon: Monitor as LucideIcon, color: "text-purple-500 bg-purple-50" },
                { name: "Code Exec", desc: "subprocess, child_process, spawn", icon: Code2 as LucideIcon, color: "text-orange-500 bg-orange-50" },
                { name: "Memory", desc: "SQLite, Redis, ChromaDB, RocksDB", icon: Brain as LucideIcon, color: "text-pink-500 bg-pink-50" },
                { name: "Files", desc: "Read/write filesystem access", icon: FileText as LucideIcon, color: "text-teal-500 bg-teal-50" },
                { name: "Web Search", desc: "Google, DuckDuckGo, Tavily", icon: Search as LucideIcon, color: "text-cyan-500 bg-cyan-50" },
                { name: "MCP", desc: "Model Context Protocol support", icon: Puzzle as LucideIcon, color: "text-indigo-500 bg-indigo-50" },
                { name: "Tool Use", desc: "Function calling, tool definitions", icon: Globe as LucideIcon, color: "text-emerald-500 bg-emerald-50" },
              ] as const).map((cap, i) => {
                const Icon = cap.icon;
                return (
                  <div
                    key={cap.name}
                    className={`p-4 flex items-start gap-3 ${
                      i < 4 ? "border-b border-ocean-100" : ""
                    } ${i % 4 !== 3 ? "border-r border-ocean-100" : ""}`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cap.color}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-navy">{cap.name}</div>
                      <div className="text-[11px] text-navy-light mt-0.5 leading-snug">{cap.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Open source CTA */}
          <div className="mt-6 flex items-center justify-between rounded-2xl bg-gradient-to-r from-ocean-800 to-ocean-900 px-6 py-4">
            <div>
              <p className="text-sm font-medium text-white">ClawBench is fully open source</p>
              <p className="text-xs text-ocean-300 mt-0.5">Run benchmarks on your own hardware or contribute improvements.</p>
            </div>
            <a
              href="https://github.com/codyrobertson/canitrunopenclaw/tree/main/clawbench"
              target="_blank"
              rel="noopener"
              className="shrink-0 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
            >
              View on GitHub &rarr;
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
