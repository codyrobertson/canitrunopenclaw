import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  Clock,
  Cpu,
  HardDrive,
  MemoryStick,
  Trophy,
  Zap,
} from "lucide-react";
import {
  getBenchmarkLeaderboard,
  getBenchmarkForkSummaries,
  getBenchmarkTotalRuns,
  getCategories,
  getAllForks,
} from "@/lib/queries";

export function generateMetadata(): Metadata {
  const total = getBenchmarkTotalRuns();
  const summaries = getBenchmarkForkSummaries();
  return {
    title: "ClawBench Benchmarks | Hardware Performance Leaderboard",
    description: `ClawBench benchmark results for ${summaries.length} OpenClaw forks across ${total} device tests. Compare cold start times, memory usage, and capability scores.`,
    openGraph: {
      title: "ClawBench Benchmarks | Hardware Performance Leaderboard",
      description: `${total} benchmark runs across ${summaries.length} forks. See which hardware runs OpenClaw best.`,
    },
  };
}

function formatMs(ms: number | null): string {
  if (ms === null) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function scoreColor(score: number): string {
  if (score >= 85) return "text-verdict-great";
  if (score >= 60) return "text-verdict-ok";
  if (score >= 30) return "text-amber-600";
  return "text-verdict-wont";
}

function scoreBg(score: number): string {
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

  const summaries = getBenchmarkForkSummaries();
  const totalRuns = getBenchmarkTotalRuns();
  const leaderboard = getBenchmarkLeaderboard({
    forkSlug: forkFilter,
    category: categoryFilter,
    limit: 100,
  });
  const categories = getCategories();
  const allForks = getAllForks();

  return (
    <main>
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
                    key={`${entry.device_slug}-${entry.fork_slug}`}
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
                        {entry.overall_score}
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

        {/* Methodology note */}
        <section className="mt-12 rounded-xl border border-ocean-200 bg-white p-6">
          <h3 className="font-heading text-base font-bold text-navy mb-2 flex items-center gap-2">
            <HardDrive size={16} className="text-ocean-600" /> About ClawBench
          </h3>
          <div className="text-sm text-navy-light space-y-2">
            <p>
              ClawBench runs each OpenClaw fork inside a Docker container constrained to match
              the target device&apos;s CPU and memory profile. Scores are weighted: latency (30%),
              capabilities (40%), and binary size (30%).
            </p>
            <p>
              <strong>Score ranges:</strong>{" "}
              <span className="text-verdict-great font-medium">85-100 Runs Great</span> |{" "}
              <span className="text-blue-600 font-medium">60-84 Runs OK</span> |{" "}
              <span className="text-amber-600 font-medium">30-59 Barely Runs</span> |{" "}
              <span className="text-verdict-wont font-medium">0-29 Won&apos;t Run</span>
            </p>
            <p>
              Capability tests check: messaging, browser automation, code execution,
              persistent memory, file management, web search, MCP protocol, and tool use.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
