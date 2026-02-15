import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Star } from "lucide-react";
import { getForkBySlug, getDevicesByFork } from "@/lib/queries";
import { VerdictBadge } from "@/components/verdict-badge";
import { CategoryBadge } from "@/components/device-card";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const fork = getForkBySlug(slug);
  if (!fork) return { title: "Fork Not Found" };

  const devices = getDevicesByFork(fork.id);
  const title = `${fork.name} - OpenClaw Fork`;
  const minRamStr = fork.min_ram_mb === 0 ? "Serverless" : fork.min_ram_mb < 1024 ? `${fork.min_ram_mb}MB` : `${(fork.min_ram_mb / 1024).toFixed(0)}GB`;
  const description = `${fork.description ?? fork.name} Min ${minRamStr} RAM. Compatible with ${devices.length} devices.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

function formatRam(gb: number): string {
  if (gb < 0.001) return `${Math.round(gb * 1024 * 1024)}KB`;
  if (gb < 1) return `${Math.round(gb * 1024)}MB`;
  return `${gb}GB`;
}

function formatStars(stars: number): string {
  if (stars >= 1000) return `${(stars / 1000).toFixed(1)}k`;
  return String(stars);
}

const maturityConfig: Record<string, { label: string; color: string; desc: string }> = {
  stable: { label: "Stable", color: "bg-verdict-great/10 text-verdict-great border-verdict-great/20", desc: "Production-ready. Actively maintained." },
  beta: { label: "Beta", color: "bg-ocean-100 text-ocean-700 border-ocean-200", desc: "Functional but may have breaking changes." },
  alpha: { label: "Alpha", color: "bg-amber-50 text-amber-700 border-amber-200", desc: "Early development. Expect rough edges." },
  archived: { label: "Archived", color: "bg-gray-100 text-gray-500 border-gray-200", desc: "No longer maintained." },
};

export default async function ForkDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fork = getForkBySlug(slug);
  if (!fork) notFound();

  const devices = getDevicesByFork(fork.id);
  const features = JSON.parse(fork.features) as string[];
  const maturity = maturityConfig[fork.maturity] ?? maturityConfig.beta;

  const verdictCounts = {
    RUNS_GREAT: devices.filter(d => d.verdict === "RUNS_GREAT").length,
    RUNS_OK: devices.filter(d => d.verdict === "RUNS_OK").length,
    BARELY_RUNS: devices.filter(d => d.verdict === "BARELY_RUNS").length,
    WONT_RUN: devices.filter(d => d.verdict === "WONT_RUN").length,
  };
  const total = devices.length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: fork.name,
        description: fork.description ?? fork.name,
        applicationCategory: "AI Agent Framework",
        operatingSystem: "Cross-platform",
        ...(fork.license ? { license: fork.license } : {}),
        ...(fork.github_url ? { url: fork.github_url } : {}),
        ...(fork.creator ? { author: { "@type": "Person", name: fork.creator } } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://canitrunclaw.com",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Forks",
            item: "https://canitrunclaw.com/forks",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: fork.name,
            item: `https://canitrunclaw.com/forks/${fork.slug}`,
          },
        ],
      },
    ],
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="text-sm text-navy-light mb-6">
        <Link href="/forks" className="hover:text-ocean-800">Forks</Link>
        <span className="mx-2">/</span>
        <span className="text-navy">{fork.name}</span>
      </nav>

      {/* Header Card */}
      <div className="rounded-xl border border-ocean-200 bg-white p-8 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-heading text-3xl font-bold text-navy">{fork.name}</h1>
              <span className={`text-xs font-medium uppercase tracking-wider px-2 py-0.5 rounded border ${maturity.color}`}>
                {maturity.label}
              </span>
            </div>
            {fork.tagline && <p className="text-ocean-600 italic mb-2">{fork.tagline}</p>}
            <p className="text-navy-light">{fork.description}</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {fork.github_url && (
              <a href={fork.github_url} target="_blank" rel="noopener" className="flex items-center gap-1 rounded-lg border border-ocean-200 px-4 py-2 text-sm font-medium text-navy hover:bg-ocean-50 transition-colors">
                GitHub <ExternalLink size={14} />
              </a>
            )}
            {fork.github_stars > 0 && (
              <span className="text-sm text-navy-light flex items-center gap-1"><Star size={14} className="fill-amber-400 text-amber-400" /> {formatStars(fork.github_stars)} stars</span>
            )}
          </div>
        </div>

        {/* Creator info */}
        {fork.creator && (
          <div className="mt-4 flex items-center gap-4 text-sm text-navy-light border-t border-ocean-100 pt-4">
            <span>Created by <span className="font-medium text-navy">{fork.creator}</span></span>
            {fork.created_year && <span>&#183; Since {fork.created_year}</span>}
            {fork.last_commit_date && <span>&#183; Last updated {fork.last_commit_date}</span>}
          </div>
        )}

        {/* Specs grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-lg bg-ocean-50 p-3">
            <div className="text-xs text-ocean-600 font-medium">Min RAM</div>
            <div className="text-lg font-semibold text-navy">
              {fork.min_ram_mb === 0 ? "N/A" : fork.min_ram_mb < 1024 ? `${fork.min_ram_mb}MB` : `${(fork.min_ram_mb / 1024).toFixed(0)}GB`}
            </div>
          </div>
          <div className="rounded-lg bg-ocean-50 p-3">
            <div className="text-xs text-ocean-600 font-medium">Min CPU</div>
            <div className="text-lg font-semibold text-navy">{fork.min_cpu_cores} core{fork.min_cpu_cores > 1 ? "s" : ""}</div>
          </div>
          <div className="rounded-lg bg-ocean-50 p-3">
            <div className="text-xs text-ocean-600 font-medium">Language</div>
            <div className="text-lg font-semibold text-navy">{fork.language}</div>
          </div>
          {fork.codebase_size_lines && (
            <div className="rounded-lg bg-ocean-50 p-3">
              <div className="text-xs text-ocean-600 font-medium">Codebase</div>
              <div className="text-lg font-semibold text-navy">{(fork.codebase_size_lines / 1000).toFixed(0)}K LOC</div>
            </div>
          )}
          <div className="rounded-lg bg-ocean-50 p-3">
            <div className="text-xs text-ocean-600 font-medium">License</div>
            <div className="text-lg font-semibold text-navy">{fork.license}</div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-navy mb-2">Features</h3>
          <div className="flex flex-wrap gap-2">
            {features.map((f) => (
              <span key={f} className="text-sm text-ocean-700 bg-ocean-100 px-3 py-1 rounded-full">{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Compatibility Summary */}
      {total > 0 && (
        <div className="rounded-xl border border-ocean-200 bg-white p-8 mb-6">
          <h2 className="font-heading text-xl font-semibold text-navy mb-4">Compatibility Overview</h2>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="text-center rounded-lg bg-verdict-great/10 p-3">
              <div className="text-2xl font-bold text-verdict-great">{verdictCounts.RUNS_GREAT}</div>
              <div className="text-xs text-navy-light mt-0.5">Runs Great</div>
            </div>
            <div className="text-center rounded-lg bg-verdict-ok/10 p-3">
              <div className="text-2xl font-bold text-verdict-ok">{verdictCounts.RUNS_OK}</div>
              <div className="text-xs text-navy-light mt-0.5">Runs OK</div>
            </div>
            <div className="text-center rounded-lg bg-verdict-barely/10 p-3">
              <div className="text-2xl font-bold text-verdict-barely">{verdictCounts.BARELY_RUNS}</div>
              <div className="text-xs text-navy-light mt-0.5">Barely Runs</div>
            </div>
            <div className="text-center rounded-lg bg-verdict-wont/10 p-3">
              <div className="text-2xl font-bold text-verdict-wont">{verdictCounts.WONT_RUN}</div>
              <div className="text-xs text-navy-light mt-0.5">Won&apos;t Run</div>
            </div>
          </div>
          {/* Bar chart */}
          <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
            {verdictCounts.RUNS_GREAT > 0 && <div className="bg-verdict-great" style={{ width: `${(verdictCounts.RUNS_GREAT / total) * 100}%` }} />}
            {verdictCounts.RUNS_OK > 0 && <div className="bg-verdict-ok" style={{ width: `${(verdictCounts.RUNS_OK / total) * 100}%` }} />}
            {verdictCounts.BARELY_RUNS > 0 && <div className="bg-verdict-barely" style={{ width: `${(verdictCounts.BARELY_RUNS / total) * 100}%` }} />}
            {verdictCounts.WONT_RUN > 0 && <div className="bg-verdict-wont" style={{ width: `${(verdictCounts.WONT_RUN / total) * 100}%` }} />}
          </div>
          <p className="text-xs text-navy-light mt-2">{total} devices tested</p>
        </div>
      )}

      {/* Compatible Devices */}
      <div className="rounded-xl border border-ocean-200 bg-white p-8">
        <h2 className="font-heading text-xl font-semibold text-navy mb-4">Compatible Devices ({devices.length})</h2>
        <div className="space-y-3">
          {devices.map((d) => (
            <Link key={d.id} href={`/devices/${d.slug}`} className="flex items-center gap-4 rounded-lg border border-ocean-100 p-4 hover:border-ocean-300 transition-colors group">
              <VerdictBadge verdict={d.verdict} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-navy group-hover:text-ocean-800 transition-colors">{d.name}</span>
                  <CategoryBadge category={d.category} />
                </div>
                <div className="text-xs text-navy-light mt-0.5">
                  {formatRam(d.ram_gb)} RAM &#183; {d.price_usd ? (d.price_type === "monthly" ? `$${d.price_usd}/mo` : `$${d.price_usd}`) : "Free"}
                  {d.cpu && ` \u00B7 ${d.cpu}`}
                </div>
              </div>
              {d.notes && <p className="text-xs text-navy-light max-w-xs truncate hidden lg:block">{d.notes}</p>}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
