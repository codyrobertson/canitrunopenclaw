import Link from "next/link";
import { getAllForks } from "@/lib/queries";

export default function ForksPage() {
  const forks = getAllForks();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-heading text-3xl font-bold text-navy mb-2">OpenClaw Forks</h1>
      <p className="text-navy-light mb-8">From the full 430K-line original to a 10MB Go binary for RISC-V boards.</p>
      <div className="grid gap-6 lg:grid-cols-2">
        {forks.map((fork) => {
          const features = JSON.parse(fork.features) as string[];
          return (
            <Link key={fork.id} href={`/forks/${fork.slug}`} className="group rounded-xl border border-ocean-200 bg-white p-6 hover:border-ocean-400 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading text-xl font-semibold text-navy group-hover:text-ocean-800 transition-colors">{fork.name}</h2>
                <span className="text-xs font-mono text-ocean-600 bg-ocean-100 px-2 py-1 rounded">{fork.language}</span>
              </div>
              <p className="text-sm text-navy-light mb-4">{fork.description}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs rounded bg-ocean-50 border border-ocean-200 px-2 py-1">{fork.min_ram_mb < 1024 ? `${fork.min_ram_mb}MB` : `${(fork.min_ram_mb / 1024).toFixed(0)}GB`} min RAM</span>
                <span className="text-xs rounded bg-ocean-50 border border-ocean-200 px-2 py-1">{fork.min_cpu_cores} CPU core{fork.min_cpu_cores > 1 ? "s" : ""}</span>
                {fork.codebase_size_lines && <span className="text-xs rounded bg-ocean-50 border border-ocean-200 px-2 py-1">{fork.codebase_size_lines.toLocaleString()} LOC</span>}
                <span className="text-xs rounded bg-ocean-50 border border-ocean-200 px-2 py-1">{fork.license}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {features.slice(0, 4).map((f) => (<span key={f} className="text-xs text-ocean-700 bg-ocean-100 px-2 py-0.5 rounded-full">{f}</span>))}
                {features.length > 4 && <span className="text-xs text-navy-light px-2 py-0.5">+{features.length - 4} more</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
