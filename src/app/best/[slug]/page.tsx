import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Trophy,
  Snowflake,
  Flame,
  ArrowRight,
} from "lucide-react";
import { getDevicesByCategoryForForkCached, getForkBySlugCached } from "@/lib/queries-cached";
import { createMetadata } from "@/lib/seo/metadata";
import { evaluateSeoGuardrails } from "@/lib/seo/guardrails";
import { createNeonDuplicateDetector } from "@/lib/seo/neon-duplicate-detector";
import { breadcrumbsForBest, relatedLinksForBest } from "@/lib/seo/links";
import { bestPath, canPath } from "@/lib/seo/routes";
import { buildBreadcrumbList, buildFAQPage, buildSchemaGraph, buildTechArticle } from "@/lib/seo/schema";
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

function parseSlug(slug: string): { category: string; forkSlug: string } | null {
  const match = slug.match(/^(.+)-for-(.+)$/);
  if (!match) return null;
  return { category: match[1], forkSlug: match[2] };
}

function categoryFromSlug(slug: string): string {
  const map: Record<string, string> = {
    sbc: "SBC",
    desktop: "Desktop",
    laptop: "Laptop",
    server: "Server",
    cloud: "Cloud",
    microcontroller: "Microcontroller",
    handheld: "Handheld",
    appliance: "Appliance",
    nas: "NAS",
    phone: "Phone",
    tablet: "Tablet",
    "mini-pc": "Mini PC",
    router: "Router",
  };
  return map[slug] ?? slug;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const parsed = parseSlug(slug);
  if (!parsed) return { title: "Not Found" };

  const fork = await getForkBySlugCached(parsed.forkSlug);
  const category = categoryFromSlug(parsed.category);
  if (!fork) return { title: "Not Found" };

  const devices = await getDevicesByCategoryForForkCached(category, fork.slug);
  const great = devices.filter((d) => d.verdict === "RUNS_GREAT").length;
  const canonicalPath = bestPath(category, fork.slug);
  const isCanonical = canonicalPath === `/best/${slug}`;
  const hasAnyRunnable = devices.some((d) => d.verdict !== "WONT_RUN");

  const title = `Best ${category} for ${fork.name} in 2026`;
  const description = `Find the best ${category} hardware for running ${fork.name}. ${devices.length} devices tested, ${great} run great. Ranked by compatibility with performance benchmarks.`;

  const guardrails = await evaluateSeoGuardrails({
    canonicalPath,
    requestedIndexable: isCanonical && hasAnyRunnable,
    content: {
      title,
      description,
      h1: title,
      headings: [
        "Top Pick",
        "All Devices Ranked",
        "Compatibility verdict breakdown",
      ],
      body: devices.slice(0, 12).map((d) => d.name).join(" "),
    },
    policy: { minWords: 40 },
    duplicateDetector: createNeonDuplicateDetector("best", { nearDistance: 3 }),
  });

  return createMetadata({
    title,
    description,
    canonicalPath: guardrails.canonicalPath,
    indexable: guardrails.indexable,
  });
}

export default async function CategoryLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const parsed = parseSlug(slug);
  if (!parsed) notFound();

  const fork = await getForkBySlugCached(parsed.forkSlug);
  const category = categoryFromSlug(parsed.category);
  if (!fork) notFound();

  const canonicalPath = bestPath(category, fork.slug);
  if (canonicalPath !== `/best/${slug}`) {
    redirect(canonicalPath);
  }

  const devices = await getDevicesByCategoryForForkCached(category, fork.slug);
  if (devices.length === 0) notFound();
  if (!devices.some((d) => d.verdict !== "WONT_RUN")) notFound();

  const verdictCounts = {
    RUNS_GREAT: devices.filter((d) => d.verdict === "RUNS_GREAT").length,
    RUNS_OK: devices.filter((d) => d.verdict === "RUNS_OK").length,
    BARELY_RUNS: devices.filter((d) => d.verdict === "BARELY_RUNS").length,
    WONT_RUN: devices.filter((d) => d.verdict === "WONT_RUN").length,
  };

  const topPick = devices.find((d) => d.verdict === "RUNS_GREAT") ?? devices[0];

  const faqItems = [
    {
      question: `What is the best ${category} for running ${fork.name}?`,
      answer: `${topPick.name} is a top pick based on compatibility verdicts and benchmark performance across tested devices in this category.`,
    },
    {
      question: `How many ${category} devices have been tested with ${fork.name}?`,
      answer: `${devices.length} ${category.toLowerCase()} device${devices.length === 1 ? "" : "s"} have official compatibility verdicts for ${fork.name}.`,
    },
    {
      question: `Where can I see the detailed compatibility verdict for ${topPick.name}?`,
      answer: `See /can/${fork.slug}/run-on/${topPick.slug} for specs, requirements, and benchmarks.`,
    },
  ];

  const jsonLd = buildSchemaGraph([
    buildTechArticle({
      headline: `Best ${category} for ${fork.name}`,
      description: `Ranked ${category} devices for running ${fork.name}, based on compatibility verdicts and performance benchmarks.`,
      about: [
        { "@type": "SoftwareApplication", name: fork.name },
        { "@type": "Thing", name: category },
      ],
    }),
    buildBreadcrumbList(breadcrumbsForBest({ fork, category })),
    buildFAQPage(faqItems),
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
        <span className="text-navy">Best {category}</span>
      </nav>

      {/* Header */}
      <div className="rounded-xl border border-ocean-200 bg-white p-8 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <CategoryBadge category={category} />
          <span className="text-xs text-navy-light font-medium uppercase tracking-wider">
            {fork.language} fork
          </span>
        </div>
        <h1 className="font-heading text-3xl font-bold text-navy">
          Best {category} for {fork.name} in 2026
        </h1>
        <p className="mt-2 text-navy-light">
          {devices.length} {category.toLowerCase()} devices tested with {fork.name}.
          See which ones run it best.
        </p>

        {/* Summary stats */}
        <div className="mt-6 grid grid-cols-4 gap-3">
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

        {/* Bar */}
        <div className="mt-4 flex h-2.5 rounded-full overflow-hidden bg-gray-100">
          {verdictCounts.RUNS_GREAT > 0 && (
            <div className="bg-verdict-great" style={{ width: `${(verdictCounts.RUNS_GREAT / devices.length) * 100}%` }} />
          )}
          {verdictCounts.RUNS_OK > 0 && (
            <div className="bg-verdict-ok" style={{ width: `${(verdictCounts.RUNS_OK / devices.length) * 100}%` }} />
          )}
          {verdictCounts.BARELY_RUNS > 0 && (
            <div className="bg-verdict-barely" style={{ width: `${(verdictCounts.BARELY_RUNS / devices.length) * 100}%` }} />
          )}
          {verdictCounts.WONT_RUN > 0 && (
            <div className="bg-verdict-wont" style={{ width: `${(verdictCounts.WONT_RUN / devices.length) * 100}%` }} />
          )}
        </div>
      </div>

      {/* Top Pick */}
      {topPick && (
        <div className="rounded-xl border-2 border-verdict-great/30 bg-verdict-great/5 p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={18} className="text-amber-500" />
            <span className="text-sm font-semibold text-navy">Top Pick</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-heading text-xl font-bold text-navy">{topPick.name}</h3>
              <p className="mt-1 text-sm text-navy-light">{topPick.description}</p>
              <div className="mt-3 flex items-center gap-3 text-sm">
                <VerdictBadge verdict={topPick.verdict} size="sm" />
                <span className="text-navy-light">{formatRam(topPick.ram_gb)} RAM</span>
                {topPick.cold_start_sec && (
                  <span className="flex items-center gap-1 text-navy-light">
                    <Snowflake size={12} className="text-ocean-600" />
                    {topPick.cold_start_sec}s cold start
                  </span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xl font-bold text-ocean-800">
                {topPick.price_usd
                  ? topPick.price_type === "monthly"
                    ? `$${topPick.price_usd}/mo`
                    : `$${topPick.price_usd}`
                  : "Free"}
              </div>
              <Link
                href={`/devices/${topPick.slug}`}
                className="mt-2 inline-flex items-center gap-1 text-sm text-ocean-600 hover:text-ocean-800 transition-colors"
              >
                View details <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Ranked List */}
      <div className="rounded-xl border border-ocean-200 bg-white p-8">
        <h2 className="font-heading text-lg font-semibold text-navy mb-4">
          All {category} Devices Ranked
        </h2>
        <div className="space-y-4">
          {devices.map((d, idx) => (
            <div
              key={d.id}
              className="flex items-start gap-4 rounded-lg border border-ocean-100 p-4 hover:border-ocean-300 transition-colors"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-ocean-50 text-sm font-bold text-ocean-600 shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/devices/${d.slug}`}
                    className="font-medium text-navy hover:text-ocean-800 transition-colors"
                  >
                    {d.name}
                  </Link>
                  <VerdictBadge verdict={d.verdict} size="sm" />
                </div>
                <div className="mt-1 text-xs text-navy-light">
                  {formatRam(d.ram_gb)} RAM
                  {d.cpu ? ` / ${d.cpu}` : ""}
                  {d.price_usd
                    ? ` / ${d.price_type === "monthly" ? `$${d.price_usd}/mo` : `$${d.price_usd}`}`
                    : " / Free"}
                </div>
                {d.notes && (
                  <p className="mt-1 text-sm text-navy-light line-clamp-2">{d.notes}</p>
                )}
                <div className="mt-2 flex gap-4 text-xs text-navy-light">
                  {d.cold_start_sec && (
                    <span className="flex items-center gap-1">
                      <Snowflake size={12} className="text-ocean-600" />
                      {d.cold_start_sec}s cold start
                    </span>
                  )}
                  {d.warm_response_sec && (
                    <span className="flex items-center gap-1">
                      <Flame size={12} className="text-orange-500" />
                      {d.warm_response_sec}s warm
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold text-ocean-800">
                  {d.price_usd
                    ? d.price_type === "monthly"
                      ? `$${d.price_usd}/mo`
                      : `$${d.price_usd}`
                    : "Free"}
                </div>
                <Link
                  href={canPath(fork.slug, d.slug)}
                  className="mt-1 inline-block text-xs text-ocean-600 hover:text-ocean-800 transition-colors"
                >
                  Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-6 rounded-xl border border-ocean-200 bg-white p-6">
        <h2 className="font-heading text-lg font-semibold text-navy mb-4">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqItems.map((item) => (
            <div key={item.question}>
              <h3 className="font-medium text-navy">{item.question}</h3>
              <p className="mt-1 text-sm text-navy-light">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Related links */}
      <div className="mt-6 rounded-xl border border-ocean-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-navy mb-3">Related Pages</h3>
        <div className="space-y-2 text-sm">
          {relatedLinksForBest({
            fork,
            category,
            topDevices: devices.slice(0, 3),
          }).map((l) => (
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
    </main>
  );
}
