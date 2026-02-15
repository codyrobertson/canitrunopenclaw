import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";
import { getAllForks } from "@/lib/queries";

export function generateMetadata(): Metadata {
  const forks = getAllForks();
  const title = `OpenClaw Forks - All ${forks.length} Forks Compared`;
  const description = `Compare all ${forks.length} OpenClaw forks. From lightweight microcontroller builds to full cloud deployments. Find the right fork for your hardware.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

const maturityColors: Record<string, string> = {
  stable: "bg-verdict-great/10 text-verdict-great border-verdict-great/20",
  beta: "bg-ocean-100 text-ocean-700 border-ocean-200",
  alpha: "bg-amber-50 text-amber-700 border-amber-200",
  archived: "bg-gray-100 text-gray-500 border-gray-200",
};

const languageColors: Record<string, string> = {
  TypeScript: "bg-blue-100 text-blue-700",
  Python: "bg-yellow-100 text-yellow-800",
  Go: "bg-cyan-100 text-cyan-700",
  C: "bg-gray-100 text-gray-700",
  Rust: "bg-orange-100 text-orange-700",
  JavaScript: "bg-amber-100 text-amber-700",
  Swift: "bg-rose-100 text-rose-700",
  Elixir: "bg-purple-100 text-purple-700",
  "C++": "bg-indigo-100 text-indigo-700",
};

function formatStars(stars: number): string {
  if (stars >= 1000) return `${(stars / 1000).toFixed(1)}k`;
  return String(stars);
}

export default function ForksPage() {
  const forks = getAllForks();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-navy">OpenClaw Forks</h1>
        <p className="mt-2 text-navy-light max-w-2xl">
          From the full 430K-line original to a 10MB Go binary for RISC-V boards.
          {forks.length} forks covering every platform from ESP32 microcontrollers to serverless edge.
        </p>
      </div>

      {/* Quick comparison bar */}
      <div className="mb-8 overflow-x-auto">
        <div className="flex gap-3 min-w-max pb-2">
          {forks.map((fork) => (
            <Link
              key={fork.id}
              href={`/forks/${fork.slug}`}
              className="flex items-center gap-2 rounded-full border border-ocean-200 bg-white px-3 py-1.5 text-sm hover:border-ocean-400 transition-colors whitespace-nowrap"
            >
              <span className={`inline-block w-2 h-2 rounded-full ${fork.maturity === "stable" ? "bg-verdict-great" : fork.maturity === "beta" ? "bg-ocean-500" : "bg-amber-400"}`} />
              <span className="font-medium text-navy">{fork.name}</span>
              <span className="text-navy-light">{fork.min_ram_mb === 0 ? "Serverless" : fork.min_ram_mb < 1024 ? `${fork.min_ram_mb}MB` : `${(fork.min_ram_mb / 1024).toFixed(0)}GB`}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {forks.map((fork) => {
          const features = JSON.parse(fork.features) as string[];
          return (
            <Link key={fork.id} href={`/forks/${fork.slug}`} className="group rounded-xl border border-ocean-200 bg-white p-6 hover:border-ocean-400 hover:shadow-md transition-all">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-heading text-xl font-semibold text-navy group-hover:text-ocean-800 transition-colors">{fork.name}</h2>
                    <span className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border ${maturityColors[fork.maturity] ?? maturityColors.beta}`}>
                      {fork.maturity}
                    </span>
                  </div>
                  {fork.tagline && <p className="text-xs text-ocean-600 italic">{fork.tagline}</p>}
                </div>
                <span className={`text-xs font-mono font-medium px-2 py-1 rounded ${languageColors[fork.language ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                  {fork.language}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-navy-light mb-4 line-clamp-2">{fork.description}</p>

              {/* Stats row */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs rounded bg-ocean-50 border border-ocean-200 px-2 py-1">
                  {fork.min_ram_mb === 0 ? "Serverless" : fork.min_ram_mb < 1024 ? `${fork.min_ram_mb}MB` : `${(fork.min_ram_mb / 1024).toFixed(0)}GB`} min RAM
                </span>
                <span className="text-xs rounded bg-ocean-50 border border-ocean-200 px-2 py-1">
                  {fork.min_cpu_cores} CPU core{fork.min_cpu_cores > 1 ? "s" : ""}
                </span>
                {fork.codebase_size_lines && (
                  <span className="text-xs rounded bg-ocean-50 border border-ocean-200 px-2 py-1">
                    {fork.codebase_size_lines.toLocaleString()} LOC
                  </span>
                )}
                <span className="text-xs rounded bg-ocean-50 border border-ocean-200 px-2 py-1">{fork.license}</span>
                {fork.github_stars > 0 && (
                  <span className="text-xs rounded bg-ocean-50 border border-ocean-200 px-2 py-1 flex items-center gap-1">
                    <Star size={12} className="fill-amber-400 text-amber-400" /> {formatStars(fork.github_stars)}
                  </span>
                )}
              </div>

              {/* Creator + date */}
              <div className="flex items-center justify-between text-xs text-navy-light mb-3">
                {fork.creator && <span>by {fork.creator}</span>}
                {fork.last_commit_date && <span>Updated {fork.last_commit_date}</span>}
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-1.5">
                {features.slice(0, 4).map((f) => (
                  <span key={f} className="text-xs text-ocean-700 bg-ocean-100 px-2 py-0.5 rounded-full">{f}</span>
                ))}
                {features.length > 4 && (
                  <span className="text-xs text-navy-light px-2 py-0.5">+{features.length - 4} more</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
