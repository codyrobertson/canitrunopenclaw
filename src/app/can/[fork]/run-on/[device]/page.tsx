import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Snowflake,
  Flame,
  ExternalLink,
  ChevronRight,
  Cpu,
  HardDrive,
  MemoryStick,
  Zap,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { BuyButton, BuyButtonFallback } from "@/components/buy-button";
import {
  getSimilarDevicesForFork,
  getAffiliateLinks,
} from "@/lib/queries";
import {
  getDeviceBySlugCached,
  getForkBySlugCached,
  getVerdictForDeviceAndForkCached,
} from "@/lib/queries-cached";
import { createMetadata } from "@/lib/seo/metadata";
import { evaluateSeoGuardrails } from "@/lib/seo/guardrails";
import { createNeonDuplicateDetector } from "@/lib/seo/neon-duplicate-detector";
import { breadcrumbsForCan, relatedLinksForCan } from "@/lib/seo/links";
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

function formatRamMb(mb: number): string {
  if (mb === 0) return "N/A";
  if (mb < 1024) return `${mb}MB`;
  return `${(mb / 1024).toFixed(0)}GB`;
}

function meetsRequirement(available: number, required: number): boolean {
  return available >= required;
}

type VerdictCode = "RUNS_GREAT" | "RUNS_OK" | "BARELY_RUNS" | "WONT_RUN";

function verdictSentenceFor(code: VerdictCode): string {
  return (
    {
      RUNS_GREAT: "Yes. It runs great.",
      RUNS_OK: "Yes, mostly. It runs OK with some tradeoffs.",
      BARELY_RUNS: "Barely. It may run, but it's not a great experience.",
      WONT_RUN: "No. It won't run on this device.",
    }[code] ?? "Unknown."
  );
}

function buildCanFaqItems(args: {
  fork: {
    name: string;
    slug: string;
    min_ram_mb: number;
    min_cpu_cores: number | null;
    min_storage_mb: number | null;
  };
  device: { name: string; slug: string };
  verdict: { verdict: VerdictCode; notes: string | null };
}) {
  const verdictSentence = verdictSentenceFor(args.verdict.verdict);
  const storageRequirement =
    args.fork.min_storage_mb === null ? "unknown storage" : `${args.fork.min_storage_mb}MB storage`;

  return [
    {
      question: `Can ${args.fork.name} run on ${args.device.name}?`,
      answer: `${verdictSentence}${args.verdict.notes ? ` ${args.verdict.notes}` : ""}`,
    },
    {
      question: `What are the minimum requirements for ${args.fork.name}?`,
      answer:
        args.fork.min_ram_mb === 0
          ? `${args.fork.name} is serverless or does not require local hardware resources.`
          : `Minimum: ${formatRamMb(args.fork.min_ram_mb)} RAM, ${args.fork.min_cpu_cores ?? 1} CPU core(s), ${storageRequirement}.`,
    },
    {
      question: `Where can I find a setup guide for ${args.fork.name} on ${args.device.name}?`,
      answer: `See the setup guide at /guides/${args.fork.slug}-on-${args.device.slug}.`,
    },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ fork: string; device: string }>;
}): Promise<Metadata> {
  const { fork: forkSlug, device: deviceSlug } = await params;
  const device = await getDeviceBySlugCached(deviceSlug);
  const fork = await getForkBySlugCached(forkSlug);

  if (!device || !fork) return { title: "Not Found" };

  const verdict = await getVerdictForDeviceAndForkCached(deviceSlug, forkSlug);
  if (!verdict) return { title: "Not Found" };

  const verdictLabel =
    ({ RUNS_GREAT: "Yes!", RUNS_OK: "Yes, mostly", BARELY_RUNS: "Barely", WONT_RUN: "No" } as const)[verdict.verdict] ??
    "Unknown";

  const title = `Can ${fork.name} Run on ${device.name}? ${verdictLabel}`;
  const description = `${verdictLabel} - See if ${fork.name} (${fork.language}) runs on ${device.name} (${formatRam(device.ram_gb)} RAM). Compatibility verdict, performance benchmarks, and setup info.`;

  const faqItems = buildCanFaqItems({ fork, device, verdict: { verdict: verdict.verdict as VerdictCode, notes: verdict.notes } });

  const guardrails = await evaluateSeoGuardrails({
    canonicalPath: `/can/${fork.slug}/run-on/${device.slug}`,
    requestedIndexable: verdict.verdict !== "WONT_RUN",
    content: {
      title,
      description,
      h1: `Can ${fork.name} Run on ${device.name}?`,
      faqs: faqItems,
    },
    policy: { minWords: 40 },
    duplicateDetector: createNeonDuplicateDetector("can", { nearDistance: 3 }),
  });

  return createMetadata({
    title,
    description,
    canonicalPath: guardrails.canonicalPath,
    indexable: guardrails.indexable,
  });
}

export default async function ForkDeviceComboPage({
  params,
}: {
  params: Promise<{ fork: string; device: string }>;
}) {
  const { fork: forkSlug, device: deviceSlug } = await params;
  const device = await getDeviceBySlugCached(deviceSlug);
  const fork = await getForkBySlugCached(forkSlug);

  if (!device || !fork) notFound();

  const verdict = await getVerdictForDeviceAndForkCached(deviceSlug, forkSlug);
  if (!verdict) notFound();

  const similarDevices = await getSimilarDevicesForFork(device, fork.id, 6);
  const affiliateLinks = await getAffiliateLinks(device.id);

  const ramAvailableMb = device.ram_gb * 1024;
  const ramMeetsReq = meetsRequirement(ramAvailableMb, fork.min_ram_mb);

  const faqItems = buildCanFaqItems({ fork, device, verdict: { verdict: verdict.verdict as VerdictCode, notes: verdict.notes } });

  const jsonLd = buildSchemaGraph([
    buildTechArticle({
      headline: `Can ${fork.name} Run on ${device.name}?`,
      description: verdict.notes ?? `Compatibility information for ${fork.name} on ${device.name}`,
      about: [
        { "@type": "SoftwareApplication", name: fork.name },
        { "@type": "Product", name: device.name },
      ],
    }),
    buildBreadcrumbList(breadcrumbsForCan({ fork, device })),
    buildFAQPage(faqItems),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <JsonLd data={jsonLd} />

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-xs sm:text-sm text-navy-light mb-4 sm:mb-6 flex-wrap">
        <Link href="/" className="hover:text-ocean-800">Home</Link>
        <ChevronRight size={14} className="shrink-0" />
        <Link href="/forks" className="hover:text-ocean-800">Forks</Link>
        <ChevronRight size={14} className="shrink-0" />
        <Link href={`/forks/${fork.slug}`} className="hover:text-ocean-800 truncate max-w-[100px] sm:max-w-none">{fork.name}</Link>
        <ChevronRight size={14} className="shrink-0" />
        <span className="text-navy truncate max-w-[100px] sm:max-w-none">{device.name}</span>
      </nav>

      {/* Hero */}
      <div className="rounded-xl border border-ocean-200 bg-white p-5 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="font-heading text-xl sm:text-3xl font-bold text-navy">
              Can {fork.name} Run on {device.name}?
            </h1>
            <div className="mt-2 flex items-center gap-3">
              <CategoryBadge category={device.category} />
              <span className="text-sm text-navy-light">{fork.language} fork</span>
            </div>
          </div>
          <div className="shrink-0">
            <VerdictBadge verdict={verdict.verdict} size="lg" />
          </div>
        </div>
        {verdict.notes && (
          <p className="mt-4 text-navy-light">{verdict.notes}</p>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Specs Comparison */}
          <div className="rounded-xl border border-ocean-200 bg-white p-5 sm:p-8">
            <h2 className="font-heading text-lg font-semibold text-navy mb-4">
              Specs vs Requirements
            </h2>
            <div className="space-y-4">
              {/* RAM */}
              <div className="flex items-center gap-3 sm:gap-4 rounded-lg border border-ocean-100 p-3 sm:p-4">
                <MemoryStick size={20} className="text-ocean-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-navy">RAM</div>
                  <div className="flex flex-wrap items-center gap-1 sm:gap-3 mt-1 text-xs sm:text-sm">
                    <span className="text-navy-light">
                      Needs <span className="font-semibold text-navy">{formatRamMb(fork.min_ram_mb)}</span>
                    </span>
                    <span className="text-navy-light">/</span>
                    <span className="text-navy-light">
                      Has <span className="font-semibold text-navy">{formatRam(device.ram_gb)}</span>
                    </span>
                  </div>
                </div>
                {ramMeetsReq ? (
                  <CheckCircle2 size={20} className="text-verdict-great shrink-0" />
                ) : (
                  <XCircle size={20} className="text-verdict-wont shrink-0" />
                )}
              </div>

              {/* CPU Cores */}
              <div className="flex items-center gap-3 sm:gap-4 rounded-lg border border-ocean-100 p-3 sm:p-4">
                <Cpu size={20} className="text-ocean-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-navy">CPU</div>
                  <div className="flex flex-wrap items-center gap-1 sm:gap-3 mt-1 text-xs sm:text-sm">
                    <span className="text-navy-light">
                      Needs <span className="font-semibold text-navy">{fork.min_cpu_cores ?? 1} core{(fork.min_cpu_cores ?? 1) > 1 ? "s" : ""}</span>
                    </span>
                    <span className="text-navy-light">/</span>
                    <span className="text-navy-light truncate">
                      Has <span className="font-semibold text-navy">{device.cpu ?? "Unknown"}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Storage */}
              <div className="flex items-center gap-3 sm:gap-4 rounded-lg border border-ocean-100 p-3 sm:p-4">
                <HardDrive size={20} className="text-ocean-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-navy">Storage</div>
                  <div className="flex flex-wrap items-center gap-1 sm:gap-3 mt-1 text-xs sm:text-sm">
                    <span className="text-navy-light">
                      Needs <span className="font-semibold text-navy">{fork.min_storage_mb}MB</span>
                    </span>
                    <span className="text-navy-light">/</span>
                    <span className="text-navy-light">
                      Has <span className="font-semibold text-navy">{device.storage ?? "Unknown"}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Power */}
              {device.power_watts && (
                <div className="flex items-center gap-3 sm:gap-4 rounded-lg border border-ocean-100 p-3 sm:p-4">
                  <Zap size={20} className="text-ocean-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-navy">Power Draw</div>
                    <div className="mt-1 text-xs sm:text-sm text-navy-light">
                      <span className="font-semibold text-navy">{device.power_watts}W</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Performance Data */}
          {(verdict.cold_start_sec || verdict.warm_response_sec) && (
            <div className="rounded-xl border border-ocean-200 bg-white p-5 sm:p-8">
              <h2 className="font-heading text-lg font-semibold text-navy mb-4">Performance</h2>
              <div className="grid grid-cols-2 gap-4">
                {verdict.cold_start_sec && (
                  <div className="rounded-lg bg-ocean-50 p-4 text-center">
                    <Snowflake size={24} className="mx-auto text-ocean-600 mb-2" />
                    <div className="text-2xl font-bold text-navy">{verdict.cold_start_sec}s</div>
                    <div className="text-xs text-navy-light mt-1">Cold Start</div>
                  </div>
                )}
                {verdict.warm_response_sec && (
                  <div className="rounded-lg bg-ocean-50 p-4 text-center">
                    <Flame size={24} className="mx-auto text-orange-500 mb-2" />
                    <div className="text-2xl font-bold text-navy">{verdict.warm_response_sec}s</div>
                    <div className="text-xs text-navy-light mt-1">Warm Response</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Similar Devices */}
          {similarDevices.length > 0 && (
            <div className="rounded-xl border border-ocean-200 bg-white p-5 sm:p-8">
              <h2 className="font-heading text-base sm:text-lg font-semibold text-navy mb-4">
                Other {device.category} devices that run {fork.name}
              </h2>
              <div className="space-y-3">
                {similarDevices.map((d) => (
                  <Link
                    key={d.id}
                    href={`/can/${fork.slug}/run-on/${d.slug}`}
                    className="flex items-center gap-3 rounded-lg border border-ocean-100 p-3 hover:border-ocean-300 transition-colors group"
                  >
                    <VerdictBadge verdict={d.verdict} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-navy group-hover:text-ocean-800 transition-colors truncate">
                        {d.name}
                      </div>
                      <div className="text-xs text-navy-light">
                        {formatRam(d.ram_gb)} RAM
                        {d.price_usd ? ` / ${d.price_type === "monthly" ? `$${d.price_usd}/mo` : `$${d.price_usd}`}` : ""}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* FAQ (keep in sync with FAQPage schema) */}
          <div className="rounded-xl border border-ocean-200 bg-white p-5 sm:p-8">
            <h2 className="font-heading text-base sm:text-lg font-semibold text-navy mb-4">
              FAQ
            </h2>
            <div className="space-y-3">
              {faqItems.map((item) => (
                <details key={item.question} className="rounded-lg border border-ocean-100 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-navy">
                    {item.question}
                  </summary>
                  <p className="mt-2 text-sm text-navy-light">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Try it yourself */}
          <div className="rounded-xl border border-ocean-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-navy mb-4">Try It Yourself</h3>
            <div className="space-y-3">
              {affiliateLinks.length > 0 ? (
                affiliateLinks.map((link, i) => (
                  <BuyButton
                    key={link.id}
                    href={`/go/${device.slug}?network=${link.network}`}
                    network={link.network}
                    label={link.label}
                    variant={i === 0 ? "primary" : "secondary"}
                    size="sm"
                  />
                ))
              ) : device.buy_link ? (
                <BuyButtonFallback href={`/go/${device.slug}`} name={device.name} />
              ) : null}
              {fork.github_url && (
                <a
                  href={fork.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border border-ocean-200 p-3 text-sm font-medium text-navy hover:bg-ocean-50 transition-colors"
                >
                  <span>{fork.name} on GitHub</span>
                  <ExternalLink size={14} className="text-ocean-600" />
                </a>
              )}
              <Link
                href={`/guides/${fork.slug}-on-${device.slug}`}
                className="flex items-center justify-between rounded-lg border border-ocean-800 bg-ocean-800 p-3 text-sm font-medium text-white hover:bg-ocean-700 transition-colors"
              >
                <span>Setup Guide</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          {/* Device quick specs */}
          <div className="rounded-xl border border-ocean-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-navy mb-3">Device Specs</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-navy-light">Category</dt>
                <dd><CategoryBadge category={device.category} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-light">RAM</dt>
                <dd className="font-medium text-navy">{formatRam(device.ram_gb)}</dd>
              </div>
              {device.cpu && (
                <div className="flex justify-between">
                  <dt className="text-navy-light">CPU</dt>
                  <dd className="font-medium text-navy text-right max-w-[160px] text-xs">{device.cpu}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-navy-light">Price</dt>
                <dd className="font-medium text-ocean-800">
                  {device.price_usd
                    ? device.price_type === "monthly"
                      ? `$${device.price_usd}/mo`
                      : `$${device.price_usd}`
                    : "Free"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Fork quick specs */}
          <div className="rounded-xl border border-ocean-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-navy mb-3">Fork Requirements</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-navy-light">Language</dt>
                <dd className="font-medium text-navy">{fork.language}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-light">Min RAM</dt>
                <dd className="font-medium text-navy">{formatRamMb(fork.min_ram_mb)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-light">Min CPU</dt>
                <dd className="font-medium text-navy">{fork.min_cpu_cores ?? 1} core{(fork.min_cpu_cores ?? 1) > 1 ? "s" : ""}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-light">Min Storage</dt>
                <dd className="font-medium text-navy">{fork.min_storage_mb}MB</dd>
              </div>
            </dl>
          </div>

          {/* Related links */}
          <div className="rounded-xl border border-ocean-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-navy mb-3">Related Pages</h3>
            <div className="space-y-2 text-sm">
              {relatedLinksForCan({ fork, device }).map((l) => (
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
        </div>
      </div>
    </main>
  );
}
