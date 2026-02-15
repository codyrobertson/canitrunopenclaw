import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Trophy,
  Minus,
} from "lucide-react";
import {
  getVerdictsByDevice,
} from "@/lib/queries";
import type { Device, Verdict } from "@/lib/queries";
import { getDeviceBySlugCached } from "@/lib/queries-cached";
import { createMetadata } from "@/lib/seo/metadata";
import { evaluateSeoGuardrails } from "@/lib/seo/guardrails";
import { createNeonDuplicateDetector } from "@/lib/seo/neon-duplicate-detector";
import { breadcrumbsForCompare, relatedLinksForCompare } from "@/lib/seo/links";
import { buildBreadcrumbList, buildSchemaGraph, buildTechArticle } from "@/lib/seo/schema";
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

function parseSlugs(slugs: string): { slug1: string; slug2: string } | null {
  const match = slugs.match(/^(.+)-vs-(.+)$/);
  if (!match) return null;

  // Try all possible split points since slugs themselves may contain hyphens
  const parts = slugs.split("-vs-");
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { slug1: parts[0], slug2: parts[1] };
  }
  return null;
}

function verdictScore(verdict: string): number {
  const scores: Record<string, number> = {
    RUNS_GREAT: 4,
    RUNS_OK: 3,
    BARELY_RUNS: 2,
    WONT_RUN: 1,
  };
  return scores[verdict] ?? 0;
}

function formatPrice(d: Device): string {
  if (!d.price_usd) return "Free";
  return d.price_type === "monthly" ? `$${d.price_usd}/mo` : `$${d.price_usd}`;
}

function computeWinner(
  device1: Device,
  device2: Device,
  verdicts1: (Verdict & { fork_name: string; fork_slug: string })[],
  verdicts2: (Verdict & { fork_name: string; fork_slug: string })[]
): { winner: Device | null; reason: string } {
  let score1 = 0;
  let score2 = 0;

  const allForkNames = [...new Set([...verdicts1.map((v) => v.fork_name), ...verdicts2.map((v) => v.fork_name)])];

  for (const forkName of allForkNames) {
    const v1 = verdicts1.find((v) => v.fork_name === forkName);
    const v2 = verdicts2.find((v) => v.fork_name === forkName);
    if (v1) score1 += verdictScore(v1.verdict);
    if (v2) score2 += verdictScore(v2.verdict);
  }

  if (score1 > score2) {
    return { winner: device1, reason: `${device1.name} has better overall fork compatibility` };
  } else if (score2 > score1) {
    return { winner: device2, reason: `${device2.name} has better overall fork compatibility` };
  }
  return { winner: null, reason: "Both devices have equal overall compatibility" };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slugs: string }>;
}): Promise<Metadata> {
  const { slugs } = await params;
  const parsed = parseSlugs(slugs);
  if (!parsed) return { title: "Not Found" };

  const device1 = await getDeviceBySlugCached(parsed.slug1);
  const device2 = await getDeviceBySlugCached(parsed.slug2);
  if (!device1 || !device2) return { title: "Not Found" };

  const canonicalSlugs =
    device1.id < device2.id
      ? `${device1.slug}-vs-${device2.slug}`
      : `${device2.slug}-vs-${device1.slug}`;
  const isCanonical = canonicalSlugs === slugs;
  const canonicalPath = `/compare/${canonicalSlugs}`;

  const title = `${device1.name} vs ${device2.name} for OpenClaw`;
  const description = `Side-by-side comparison of ${device1.name} (${formatRam(device1.ram_gb)} RAM, ${formatPrice(device1)}) and ${device2.name} (${formatRam(device2.ram_gb)} RAM, ${formatPrice(device2)}) for running OpenClaw forks. See specs, verdicts, and which one wins.`;

  const guardrails = await evaluateSeoGuardrails({
    canonicalPath,
    requestedIndexable: isCanonical,
    content: { title, description, h1: title },
    policy: { minWords: 30 },
    duplicateDetector: createNeonDuplicateDetector("compare", { nearDistance: 0 }),
  });

  return createMetadata({
    title,
    description,
    canonicalPath: guardrails.canonicalPath,
    indexable: guardrails.indexable,
  });
}

export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ slugs: string }>;
}) {
  const { slugs } = await params;
  const parsed = parseSlugs(slugs);
  if (!parsed) notFound();

  const device1 = await getDeviceBySlugCached(parsed.slug1);
  const device2 = await getDeviceBySlugCached(parsed.slug2);
  if (!device1 || !device2) notFound();

  const canonicalSlugs =
    device1.id < device2.id
      ? `${device1.slug}-vs-${device2.slug}`
      : `${device2.slug}-vs-${device1.slug}`;
  if (canonicalSlugs !== slugs) {
    redirect(`/compare/${canonicalSlugs}`);
  }

  const verdicts1 = await getVerdictsByDevice(device1.id);
  const verdicts2 = await getVerdictsByDevice(device2.id);

  const allForkNames = [
    ...new Set([...verdicts1.map((v) => v.fork_name), ...verdicts2.map((v) => v.fork_name)]),
  ];

  const { winner, reason } = computeWinner(device1, device2, verdicts1, verdicts2);

  const specRows: { label: string; val1: string; val2: string; compare?: "higher" | "lower" }[] = [
    { label: "Category", val1: device1.category, val2: device2.category },
    { label: "CPU", val1: device1.cpu ?? "--", val2: device2.cpu ?? "--" },
    { label: "RAM", val1: formatRam(device1.ram_gb), val2: formatRam(device2.ram_gb), compare: "higher" },
    { label: "Storage", val1: device1.storage ?? "--", val2: device2.storage ?? "--" },
    { label: "GPU", val1: device1.gpu ?? "--", val2: device2.gpu ?? "--" },
    {
      label: "Power",
      val1: device1.power_watts ? `${device1.power_watts}W` : "--",
      val2: device2.power_watts ? `${device2.power_watts}W` : "--",
      compare: "lower",
    },
    {
      label: "Price",
      val1: device1.price_usd
        ? device1.price_type === "monthly"
          ? `$${device1.price_usd}/mo`
          : `$${device1.price_usd}`
        : "Free",
      val2: device2.price_usd
        ? device2.price_type === "monthly"
          ? `$${device2.price_usd}/mo`
          : `$${device2.price_usd}`
        : "Free",
    },
  ];

  function getRamHighlight(d1: Device, d2: Device): { highlight1: boolean; highlight2: boolean } {
    if (d1.ram_gb > d2.ram_gb) return { highlight1: true, highlight2: false };
    if (d2.ram_gb > d1.ram_gb) return { highlight1: false, highlight2: true };
    return { highlight1: false, highlight2: false };
  }

  const ramHighlight = getRamHighlight(device1, device2);

  const description = `Side-by-side comparison of ${device1.name} (${formatRam(device1.ram_gb)} RAM, ${formatPrice(device1)}) and ${device2.name} (${formatRam(device2.ram_gb)} RAM, ${formatPrice(device2)}) for running OpenClaw forks.`;
  const jsonLd = buildSchemaGraph([
    buildTechArticle({
      headline: `${device1.name} vs ${device2.name} for OpenClaw`,
      description,
      about: [
        { "@type": "Product", name: device1.name },
        { "@type": "Product", name: device2.name },
      ],
    }),
    buildBreadcrumbList(breadcrumbsForCompare({ device1, device2 })),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <JsonLd data={jsonLd} />
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-navy-light mb-6">
        <Link href="/" className="hover:text-ocean-800">Home</Link>
        <ChevronRight size={14} />
        <Link href="/compare" className="hover:text-ocean-800">Compare</Link>
        <ChevronRight size={14} />
        <span className="text-navy">{device1.name} vs {device2.name}</span>
      </nav>

      {/* Header */}
      <div className="rounded-xl border border-ocean-200 bg-white p-8 mb-6">
        <h1 className="font-heading text-3xl font-bold text-navy text-center">
          {device1.name} vs {device2.name}
        </h1>
        <p className="mt-2 text-center text-navy-light">
          for OpenClaw fork compatibility
        </p>
        <div className="mt-4 flex items-center justify-center gap-4">
          <CategoryBadge category={device1.category} />
          {device1.category !== device2.category && <CategoryBadge category={device2.category} />}
        </div>
      </div>

      {/* Winner callout */}
      {winner && (
        <div className="rounded-xl border-2 border-verdict-great/30 bg-verdict-great/5 p-6 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={20} className="text-amber-500" />
            <span className="font-heading font-semibold text-navy">Winner: {winner.name}</span>
          </div>
          <p className="text-sm text-navy-light">{reason}</p>
        </div>
      )}
      {!winner && (
        <div className="rounded-xl border border-ocean-200 bg-ocean-50 p-6 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Minus size={20} className="text-ocean-600" />
            <span className="font-heading font-semibold text-navy">Tie</span>
          </div>
          <p className="text-sm text-navy-light">{reason}</p>
        </div>
      )}

      {/* Specs Table */}
      <div className="rounded-xl border border-ocean-200 bg-white overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ocean-200">
              <th className="p-4 text-left font-medium text-ocean-600 bg-ocean-50 w-32">Spec</th>
              <th className="p-4 text-left font-heading font-semibold text-navy bg-ocean-50">
                <Link href={`/devices/${device1.slug}`} className="hover:text-ocean-800">{device1.name}</Link>
              </th>
              <th className="p-4 text-left font-heading font-semibold text-navy bg-ocean-50">
                <Link href={`/devices/${device2.slug}`} className="hover:text-ocean-800">{device2.name}</Link>
              </th>
            </tr>
          </thead>
          <tbody>
            {specRows.map((row) => (
              <tr key={row.label} className="border-b border-ocean-100">
                <td className="p-4 font-medium text-navy-light">{row.label}</td>
                <td className={`p-4 ${row.label === "RAM" && ramHighlight.highlight1 ? "font-bold text-verdict-great" : ""}`}>
                  {row.val1}
                </td>
                <td className={`p-4 ${row.label === "RAM" && ramHighlight.highlight2 ? "font-bold text-verdict-great" : ""}`}>
                  {row.val2}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Fork Verdicts */}
      <div className="rounded-xl border border-ocean-200 bg-white overflow-hidden mb-6">
        <div className="p-4 bg-ocean-50 border-b border-ocean-200">
          <h2 className="font-heading font-semibold text-navy">Fork Compatibility</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ocean-200">
              <th className="p-4 text-left font-medium text-ocean-600 w-32">Fork</th>
              <th className="p-4 text-left font-semibold text-navy">{device1.name}</th>
              <th className="p-4 text-left font-semibold text-navy">{device2.name}</th>
            </tr>
          </thead>
          <tbody>
            {allForkNames.map((forkName) => {
              const v1 = verdicts1.find((v) => v.fork_name === forkName);
              const v2 = verdicts2.find((v) => v.fork_name === forkName);
              return (
                <tr key={forkName} className="border-b border-ocean-100">
                  <td className="p-4 font-medium text-navy-light">
                    {v1 ? (
                      <Link href={`/forks/${v1.fork_slug}`} className="hover:text-ocean-800">{forkName}</Link>
                    ) : v2 ? (
                      <Link href={`/forks/${v2.fork_slug}`} className="hover:text-ocean-800">{forkName}</Link>
                    ) : (
                      forkName
                    )}
                  </td>
                  <td className="p-4">
                    {v1 ? <VerdictBadge verdict={v1.verdict} size="sm" /> : <span className="text-navy-light">--</span>}
                  </td>
                  <td className="p-4">
                    {v2 ? <VerdictBadge verdict={v2.verdict} size="sm" /> : <span className="text-navy-light">--</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Links to device detail pages */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href={`/devices/${device1.slug}`}
          className="rounded-xl border border-ocean-200 bg-white p-6 hover:border-ocean-400 transition-colors group"
        >
          <h3 className="font-heading font-semibold text-navy group-hover:text-ocean-800 transition-colors">
            {device1.name}
          </h3>
          <p className="mt-1 text-sm text-navy-light line-clamp-2">{device1.description}</p>
          <div className="mt-3 text-sm text-ocean-600">View full details &rarr;</div>
        </Link>
        <Link
          href={`/devices/${device2.slug}`}
          className="rounded-xl border border-ocean-200 bg-white p-6 hover:border-ocean-400 transition-colors group"
        >
          <h3 className="font-heading font-semibold text-navy group-hover:text-ocean-800 transition-colors">
            {device2.name}
          </h3>
          <p className="mt-1 text-sm text-navy-light line-clamp-2">{device2.description}</p>
          <div className="mt-3 text-sm text-ocean-600">View full details &rarr;</div>
        </Link>
      </div>

      {/* Related links */}
      <div className="mt-6 rounded-xl border border-ocean-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-navy mb-3">Related Pages</h3>
        <div className="space-y-2 text-sm">
          {relatedLinksForCompare({ device1, device2 }).map((l) => (
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
