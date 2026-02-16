import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  Clock,
  Cpu,
  MemoryStick,
  Trophy,
  Zap,
} from "lucide-react";
import {
  getAllForksCached,
  getBenchmarkLeaderboardCached,
  getBenchmarkForkSummariesCached,
  getBenchmarkTotalRunsCached,
  getCategoriesCached,
} from "@/lib/queries-cached";
import { createFilterAwareMetadata } from "@/lib/seo/listings";
import { buildBreadcrumbList, buildSchemaGraph } from "@/lib/seo/schema";
import { JsonLd } from "@/components/json-ld";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ fork?: string; category?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const total = await getBenchmarkTotalRunsCached();
  const summaries = await getBenchmarkForkSummariesCached();

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
  Go: "bg-ocean-200 text-ocean-800",
  TypeScript: "bg-blue-100 text-blue-700",
  Python: "bg-yellow-100 text-yellow-700",
  Rust: "bg-orange-100 text-orange-700",
  Elixir: "bg-ocean-200 text-ocean-800",
  "C++": "bg-gray-100 text-gray-700",
  C: "bg-gray-100 text-gray-700",
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
    getBenchmarkForkSummariesCached(),
    getBenchmarkTotalRunsCached(),
    getBenchmarkLeaderboardCached({
      forkSlug: forkFilter,
      category: categoryFilter,
      limit: 100,
    }),
    getCategoriesCached(),
    getAllForksCached(),
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

        {/* How ClawBench Works — full-bleed section */}
        <div className="mt-16 -mx-4 sm:-mx-6 lg:-mx-8" id="how-it-works">
          <section className="bg-gradient-to-b from-ocean-900 via-ocean-800 to-ocean-700 py-16 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {/* Section header */}
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-ocean-200 mb-4">
                  <Activity size={14} />
                  Open Source Benchmark Suite
                </div>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white">
                  How ClawBench Works
                </h2>
                <p className="mt-3 text-sm sm:text-base text-ocean-200 max-w-xl mx-auto">
                  A repeatable, containerized pipeline that tests every fork under real hardware constraints.
                </p>
              </div>

              {/* Pipeline: 4 steps */}
              <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-14">
                {/* Connector line (desktop) */}
                <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px border-t border-dashed border-ocean-400/40" />

                {[
                  { n: "01", title: "Containerize", desc: "Fork is cloned into a Docker container with CPU and RAM limits matching the target device." },
                  { n: "02", title: "Build", desc: "Dependencies installed via the native toolchain \u2014 Go, Rust, Python, TypeScript, or C." },
                  { n: "03", title: "Measure", desc: "Entry point detected, cold start timed, peak memory tracked via cgroup, disk usage measured." },
                  { n: "04", title: "Score", desc: "Results combined into a 0\u2013100 composite score weighted across four dimensions." },
                ].map((s) => (
                  <div key={s.n} className="relative rounded-xl bg-white/[0.06] backdrop-blur-sm border border-white/10 p-5">
                    <div className="flex items-baseline gap-2.5 mb-3">
                      <span className="font-mono text-2xl font-bold text-ocean-300/60">{s.n}</span>
                      <h3 className="font-heading text-base font-bold text-white">{s.title}</h3>
                    </div>
                    <p className="text-sm text-ocean-200 leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>

              {/* Scoring — two columns on desktop */}
              <div className="grid gap-6 lg:grid-cols-5">
                {/* Left: weight bars */}
                <div className="lg:col-span-3 rounded-xl bg-white/[0.06] backdrop-blur-sm border border-white/10 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-heading text-base font-bold text-white">Scoring Breakdown</h3>
                    <span className="text-xs text-ocean-300 font-mono">100 pts</span>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: "Capabilities", pts: 40, desc: "Messaging, browser, code exec, memory, files, search, MCP, tool use" },
                      { label: "Latency", pts: 30, desc: "Cold start time \u2014 clone + install + startup. Under 5s = full marks" },
                      { label: "Size", pts: 20, desc: "Disk footprint after install. Under 20MB = full marks" },
                      { label: "Build Success", pts: 10, desc: "5 pts for dependency install, 5 pts for successful startup" },
                    ].map((s) => (
                      <div key={s.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-white">{s.label}</span>
                          <span className="text-sm font-bold font-mono text-ocean-300">{s.pts}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-ocean-300 to-ocean-400"
                            style={{ width: `${s.pts}%` }}
                          />
                        </div>
                        <p className="text-xs text-ocean-300/80">{s.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: verdicts + capabilities */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Verdicts */}
                  <div className="rounded-xl bg-white/[0.06] backdrop-blur-sm border border-white/10 p-6">
                    <h3 className="font-heading text-base font-bold text-white mb-4">Verdicts</h3>
                    <div className="space-y-2.5">
                      {[
                        { range: "85\u2013100", label: "Runs Great", bar: "w-full", color: "bg-verdict-great" },
                        { range: "60\u201384", label: "Runs OK", bar: "w-[84%]", color: "bg-ocean-400" },
                        { range: "30\u201359", label: "Barely Runs", bar: "w-[59%]", color: "bg-amber-400" },
                        { range: "0\u201329", label: "Won\u2019t Run", bar: "w-[29%]", color: "bg-red-400" },
                      ].map((v) => (
                        <div key={v.range} className="flex items-center gap-3">
                          <div className="w-14 text-right">
                            <span className="text-xs font-mono text-ocean-200">{v.range}</span>
                          </div>
                          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                            <div className={`h-full rounded-full ${v.color} ${v.bar}`} />
                          </div>
                          <span className="text-xs font-medium text-ocean-200 w-20">{v.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 8 Capabilities */}
                  <div className="rounded-xl bg-white/[0.06] backdrop-blur-sm border border-white/10 p-6">
                    <h3 className="font-heading text-base font-bold text-white mb-4">8 Capability Tests</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        "Messaging", "Browser", "Code Exec", "Memory",
                        "Files", "Web Search", "MCP", "Tool Use",
                      ].map((cap) => (
                        <div key={cap} className="flex items-center gap-2 rounded-lg bg-white/[0.05] px-3 py-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-ocean-300" />
                          <span className="text-xs font-medium text-ocean-100">{cap}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] text-ocean-300/70 leading-relaxed">
                      Detected via static source analysis and runtime module probing. Each passed test contributes 5 pts to the capabilities score.
                    </p>
                  </div>
                </div>
              </div>

              {/* Open source CTA */}
              <div className="mt-10 text-center">
                <a
                  href="https://github.com/codyrobertson/canitrunopenclaw/tree/main/clawbench"
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-colors"
                >
                  View ClawBench on GitHub &rarr;
                </a>
                <p className="mt-2 text-xs text-ocean-300/60">
                  Run benchmarks locally or contribute improvements
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
