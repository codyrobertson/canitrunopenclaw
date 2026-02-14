import { notFound } from "next/navigation";
import Link from "next/link";
import { getForkBySlug, getDevicesByFork } from "@/lib/queries";
import { VerdictBadge } from "@/components/verdict-badge";

function formatRam(gb: number): string {
  if (gb < 0.001) return `${Math.round(gb * 1024 * 1024)}KB`;
  if (gb < 1) return `${Math.round(gb * 1024)}MB`;
  return `${gb}GB`;
}

export default async function ForkDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fork = getForkBySlug(slug);
  if (!fork) notFound();

  const devices = getDevicesByFork(fork.id);
  const features = JSON.parse(fork.features) as string[];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <nav className="text-sm text-navy-light mb-6">
        <Link href="/forks" className="hover:text-ocean-800">Forks</Link>
        <span className="mx-2">/</span>
        <span className="text-navy">{fork.name}</span>
      </nav>

      <div className="rounded-xl border border-ocean-200 bg-white p-8 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-navy">{fork.name}</h1>
            <p className="mt-2 text-navy-light">{fork.description}</p>
          </div>
          {fork.github_url && <a href={fork.github_url} target="_blank" rel="noopener" className="shrink-0 rounded-lg border border-ocean-200 px-4 py-2 text-sm font-medium text-navy hover:bg-ocean-50 transition-colors">GitHub →</a>}
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg bg-ocean-50 p-3"><div className="text-xs text-ocean-600 font-medium">Min RAM</div><div className="text-lg font-semibold text-navy">{fork.min_ram_mb < 1024 ? `${fork.min_ram_mb}MB` : `${(fork.min_ram_mb / 1024).toFixed(0)}GB`}</div></div>
          <div className="rounded-lg bg-ocean-50 p-3"><div className="text-xs text-ocean-600 font-medium">Min CPU</div><div className="text-lg font-semibold text-navy">{fork.min_cpu_cores} core{fork.min_cpu_cores > 1 ? "s" : ""}</div></div>
          <div className="rounded-lg bg-ocean-50 p-3"><div className="text-xs text-ocean-600 font-medium">Language</div><div className="text-lg font-semibold text-navy">{fork.language}</div></div>
          {fork.codebase_size_lines && <div className="rounded-lg bg-ocean-50 p-3"><div className="text-xs text-ocean-600 font-medium">Codebase</div><div className="text-lg font-semibold text-navy">{fork.codebase_size_lines.toLocaleString()} LOC</div></div>}
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-navy mb-2">Features</h3>
          <div className="flex flex-wrap gap-2">
            {features.map((f) => (<span key={f} className="text-sm text-ocean-700 bg-ocean-100 px-3 py-1 rounded-full">{f}</span>))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-ocean-200 bg-white p-8">
        <h2 className="font-heading text-xl font-semibold text-navy mb-4">Compatible Devices ({devices.length})</h2>
        <div className="space-y-3">
          {devices.map((d) => (
            <Link key={d.id} href={`/devices/${d.slug}`} className="flex items-center gap-4 rounded-lg border border-ocean-100 p-4 hover:border-ocean-300 transition-colors">
              <VerdictBadge verdict={d.verdict} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-navy">{d.name}</div>
                <div className="text-xs text-navy-light">{formatRam(d.ram_gb)} RAM · {d.category} · {d.price_usd ? (d.price_type === "monthly" ? `$${d.price_usd}/mo` : `$${d.price_usd}`) : "Free"}</div>
              </div>
              {d.notes && <p className="text-xs text-navy-light max-w-xs truncate hidden sm:block">{d.notes}</p>}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
