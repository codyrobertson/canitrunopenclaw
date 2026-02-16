import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cache } from "react";
import { Snowflake, Flame } from "lucide-react";
import { BuyButton, BuyButtonFallback } from "@/components/buy-button";
import { getDeviceBySlug, getVerdictsByDevice, getCommentsByDevice, getDeviceRatings, getSimilarDevices, getVerdictCountsByDevice, getAffiliateLinks, getUserVerdictsByDevice, getBenchmarksByDevice, getBenchmarksByDeviceAndFork } from "@/lib/queries";
import { getAllForksCached } from "@/lib/queries-cached";
import { JsonLd } from "@/components/json-ld";
import { VerdictBadge } from "@/components/verdict-badge";
import { StarRating } from "@/components/star-rating";
import { CommentSection } from "@/components/comment-section";
import { UserVerdictSection } from "@/components/user-verdict-section";
import { CategoryBadge } from "@/components/device-card";
import { BenchmarkResults } from "@/components/benchmark-results";
import { ShareButton } from "@/components/share-button";
import { createMetadata } from "@/lib/seo/metadata";
import { breadcrumbsForDevice } from "@/lib/seo/links";
import { bestPath, canPath, guidePath } from "@/lib/seo/routes";
import { buildBreadcrumbList, buildProduct, buildSchemaGraph } from "@/lib/seo/schema";

export const dynamic = "force-static";
export const revalidate = 86400; // 24h ISR; avoids build-time param explosions at scale.

// React cache deduplicates this across generateMetadata + page render
const getDevice = cache((slug: string) => getDeviceBySlug(slug));
const getDeviceVerdicts = cache((deviceId: number) => getVerdictsByDevice(deviceId));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const device = await getDevice(slug);
  if (!device) return { title: "Device Not Found" };

  const verdicts = await getDeviceVerdicts(device.id);

  const title = `${device.name} - Can it run OpenClaw?`;
  const descParts = [device.description ?? device.name];
  descParts.push(`${formatRam(device.ram_gb)} RAM`);
  if (device.cpu) descParts.push(device.cpu);
  descParts.push(`See compatibility with ${verdicts.length} OpenClaw forks.`);
  const description = descParts.join(". ");

  return createMetadata({
    title,
    description,
    canonicalPath: `/devices/${device.slug}`,
  });
}

function formatRam(gb: number): string {
  if (gb < 0.001) return `${Math.round(gb * 1024 * 1024)}KB`;
  if (gb < 1) return `${Math.round(gb * 1024)}MB`;
  return `${gb}GB`;
}

export default async function DeviceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const device = await getDevice(slug);
  if (!device) notFound();

  // Fire all independent queries in parallel
  const [
    verdicts,
    comments,
    ratings,
    similar,
    verdictCounts,
    affiliateLinks,
    forks,
    userVerdicts,
    benchmarks,
  ] = await Promise.all([
    getDeviceVerdicts(device.id),
    getCommentsByDevice(device.id),
    getDeviceRatings(device.id),
    getSimilarDevices(device, 4),
    getVerdictCountsByDevice(device.id),
    getAffiliateLinks(device.id),
    getAllForksCached(),
    getUserVerdictsByDevice(device.id),
    getBenchmarksByDevice(device.id),
  ]);

  // Benchmark details — parallel fetch for all unique forks
  const forkSlugsInBenchmarks = [...new Set(benchmarks.map(b => b.fork_slug))];
  const detailEntries = await Promise.all(
    forkSlugsInBenchmarks.map(async (forkSlug) => {
      const fork = forks.find(f => f.slug === forkSlug);
      if (!fork) return null;
      const details = await getBenchmarksByDeviceAndFork(device.id, fork.id);
      // Map run_ids for this fork back to details
      return benchmarks
        .filter(b => b.fork_slug === forkSlug)
        .map(b => [b.run_id, details] as const);
    })
  );
  const detailsByRunId: Record<number, import("@/lib/queries").BenchmarkResult[]> = {};
  for (const entries of detailEntries) {
    if (!entries) continue;
    for (const [runId, details] of entries) {
      detailsByRunId[runId] = details;
    }
  }

  const bestVerdict = verdicts.find(v => v.verdict === "RUNS_GREAT") ?? verdicts[0];
  const totalVerdicts = Object.values(verdictCounts).reduce((a, b) => a + b, 0);

  const aggregateRating =
    ratings.avg !== null && ratings.count > 0
      ? {
          ratingValue: Number(ratings.avg.toFixed(1)),
          ratingCount: ratings.count,
        }
      : undefined;

  const jsonLd = buildSchemaGraph([
    buildProduct({
      name: device.name,
      description: device.description ?? device.name,
      category: device.category,
      aggregateRating,
    }),
    buildBreadcrumbList(breadcrumbsForDevice(device)),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <JsonLd data={jsonLd} />
      <div className="flex items-center justify-between mb-6">
        <nav className="text-sm text-navy-light">
          <Link href="/devices" className="hover:text-ocean-800">Devices</Link>
          <span className="mx-2">/</span>
          <span className="text-navy">{device.name}</span>
        </nav>
        <ShareButton title={`${device.name} — Can it run OpenClaw?`} text={`Check out ${device.name} on Can it run OpenClaw?`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content - 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="rounded-xl border border-ocean-200 bg-white p-5 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
              <div>
                <CategoryBadge category={device.category} />
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-navy mt-2">{device.name}</h1>
                <p className="mt-2 text-sm sm:text-base text-navy-light">{device.description}</p>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <div className="text-xl sm:text-2xl font-bold text-ocean-800">
                  {device.price_usd ? (device.price_type === "monthly" ? `$${device.price_usd}/mo` : `$${device.price_usd}`) : "Free"}
                </div>
              </div>
            </div>

            <div className="mt-6"><StarRating rating={ratings.avg ?? 0} count={ratings.count} /></div>

            {/* Affiliate Buy Links */}
            {affiliateLinks.length > 0 ? (
              <div className="mt-4 sm:mt-6 border-t border-ocean-100 pt-4 sm:pt-5">
                <h3 className="text-sm font-semibold text-navy mb-3">Where to Buy</h3>
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                  {affiliateLinks.map((link, i) => (
                    <BuyButton
                      key={link.id}
                      href={`/go/${device.slug}?network=${link.network}`}
                      network={link.network}
                      label={link.label}
                      variant={i === 0 ? "primary" : "secondary"}
                    />
                  ))}
                </div>
              </div>
            ) : device.buy_link ? (
              <div className="mt-6 border-t border-ocean-100 pt-5">
                <BuyButtonFallback href={device.buy_link} name={device.name} />
              </div>
            ) : null}
          </div>

          {/* Specs */}
          <div className="rounded-xl border border-ocean-200 bg-white p-5 sm:p-8">
            <h2 className="font-heading text-lg font-semibold text-navy mb-4">Specifications</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="rounded-lg bg-ocean-50 p-3">
                <div className="text-xs text-ocean-600 font-medium">RAM</div>
                <div className="text-lg font-semibold text-navy">{formatRam(device.ram_gb)}</div>
              </div>
              {device.cpu && (
                <div className="rounded-lg bg-ocean-50 p-3 col-span-2 sm:col-span-2">
                  <div className="text-xs text-ocean-600 font-medium">CPU</div>
                  <div className="text-sm font-semibold text-navy break-words">{device.cpu}</div>
                </div>
              )}
              {device.gpu && (
                <div className="rounded-lg bg-ocean-50 p-3 col-span-2 sm:col-span-2">
                  <div className="text-xs text-ocean-600 font-medium">GPU</div>
                  <div className="text-sm font-semibold text-navy break-words">{device.gpu}</div>
                </div>
              )}
              {device.storage && (
                <div className="rounded-lg bg-ocean-50 p-3">
                  <div className="text-xs text-ocean-600 font-medium">Storage</div>
                  <div className="text-sm font-semibold text-navy">{device.storage}</div>
                </div>
              )}
              {device.power_watts && (
                <div className="rounded-lg bg-ocean-50 p-3">
                  <div className="text-xs text-ocean-600 font-medium">Power Draw</div>
                  <div className="text-lg font-semibold text-navy">{device.power_watts}W</div>
                </div>
              )}
            </div>
          </div>

          {/* Official Compatibility Verdicts */}
          <div className="rounded-xl border border-ocean-200 bg-white p-5 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-heading text-lg font-semibold text-navy">Official Compatibility</h2>
                <p className="text-xs text-navy-light mt-0.5">Verified benchmark results from the OpenClaw team.</p>
              </div>
              {totalVerdicts > 0 && (
                <span className="text-xs text-navy-light">{totalVerdicts} forks tested</span>
              )}
            </div>

            {/* Verdict summary bar */}
            {totalVerdicts > 0 && (
              <div className="mb-6">
                <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 mb-2">
                  {verdictCounts.RUNS_GREAT > 0 && <div className="bg-verdict-great" style={{ width: `${(verdictCounts.RUNS_GREAT / totalVerdicts) * 100}%` }} />}
                  {verdictCounts.RUNS_OK > 0 && <div className="bg-verdict-ok" style={{ width: `${(verdictCounts.RUNS_OK / totalVerdicts) * 100}%` }} />}
                  {verdictCounts.BARELY_RUNS > 0 && <div className="bg-verdict-barely" style={{ width: `${(verdictCounts.BARELY_RUNS / totalVerdicts) * 100}%` }} />}
                  {verdictCounts.WONT_RUN > 0 && <div className="bg-verdict-wont" style={{ width: `${(verdictCounts.WONT_RUN / totalVerdicts) * 100}%` }} />}
                </div>
                <div className="flex gap-4 text-xs text-navy-light">
                  {verdictCounts.RUNS_GREAT > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-verdict-great" />{verdictCounts.RUNS_GREAT} Great</span>}
                  {verdictCounts.RUNS_OK > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-verdict-ok" />{verdictCounts.RUNS_OK} OK</span>}
                  {verdictCounts.BARELY_RUNS > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-verdict-barely" />{verdictCounts.BARELY_RUNS} Barely</span>}
                  {verdictCounts.WONT_RUN > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-verdict-wont" />{verdictCounts.WONT_RUN} Won&apos;t</span>}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {verdicts.map((v) => (
                <div key={v.id} className="flex items-start gap-3 sm:gap-4 rounded-lg border border-ocean-100 p-3 sm:p-4">
                  <VerdictBadge verdict={v.verdict} />
                  <div className="flex-1 min-w-0">
                    <Link href={`/forks/${v.fork_slug}`} className="font-medium text-navy hover:text-ocean-800">{v.fork_name}</Link>
                    {v.notes && <p className="mt-1 text-sm text-navy-light">{v.notes}</p>}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs">
                      {v.verdict !== "WONT_RUN" && (
                        <>
                          <Link
                            href={canPath(v.fork_slug, device.slug)}
                            className="text-ocean-600 hover:text-ocean-800 transition-colors"
                          >
                            Verdict page
                          </Link>
                          <Link
                            href={guidePath(v.fork_slug, device.slug)}
                            className="text-ocean-600 hover:text-ocean-800 transition-colors"
                          >
                            Setup guide
                          </Link>
                        </>
                      )}
                      <Link
                        href={bestPath(device.category, v.fork_slug)}
                        className="text-navy-light hover:text-ocean-800 transition-colors"
                      >
                        Best {device.category}
                      </Link>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-navy-light">
                      {v.cold_start_sec && <span className="flex items-center gap-1"><Snowflake size={14} className="text-ocean-600" /> {v.cold_start_sec}s cold start</span>}
                      {v.warm_response_sec && <span className="flex items-center gap-1"><Flame size={14} className="text-orange-500" /> {v.warm_response_sec}s warm</span>}
                    </div>
                  </div>
                </div>
              ))}
              {verdicts.length === 0 && <p className="text-sm text-navy-light text-center py-4">No compatibility data yet.</p>}
            </div>
          </div>

          {/* ClawBench Results */}
          <div className="rounded-xl border border-ocean-200 bg-white p-5 sm:p-8">
            <BenchmarkResults benchmarks={benchmarks} detailsByRunId={detailsByRunId} />
          </div>

          {/* Community Reports */}
          <div className="rounded-xl border border-ocean-200 bg-white p-5 sm:p-8">
            <UserVerdictSection
              deviceId={device.id}
              forks={forks}
              verdicts={userVerdicts}
            />
          </div>

          {/* Comments */}
          <div className="rounded-xl border border-ocean-200 bg-white p-5 sm:p-8">
            <CommentSection comments={comments} deviceId={device.id} />
          </div>
        </div>

        {/* Sidebar - 1 col */}
        <div className="space-y-6">
          {/* Best Fork Recommendation */}
          {bestVerdict && (
            <div className="rounded-xl border border-ocean-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-navy mb-3">Best Fork for This Device</h3>
              <Link
                href={
                  bestVerdict.verdict !== "WONT_RUN"
                    ? canPath(bestVerdict.fork_slug, device.slug)
                    : `/forks/${bestVerdict.fork_slug}`
                }
                className="block rounded-lg border border-verdict-great/30 bg-verdict-great/5 p-4 hover:border-verdict-great/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <VerdictBadge verdict={bestVerdict.verdict} size="sm" />
                  <span className="font-medium text-navy">{bestVerdict.fork_name}</span>
                </div>
                {bestVerdict.notes && <p className="text-xs text-navy-light mt-1 line-clamp-2">{bestVerdict.notes}</p>}
                {bestVerdict.cold_start_sec && <p className="flex items-center gap-1 text-xs text-ocean-600 mt-1"><Snowflake size={12} /> {bestVerdict.cold_start_sec}s cold start</p>}
              </Link>
            </div>
          )}

          {/* Quick Specs */}
          <div className="rounded-xl border border-ocean-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-navy mb-3">At a Glance</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-navy-light">Category</dt>
                <dd><CategoryBadge category={device.category} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-light">Price</dt>
                <dd className="font-medium text-navy">{device.price_usd ? (device.price_type === "monthly" ? `$${device.price_usd}/mo` : `$${device.price_usd}`) : "Free"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-light">RAM</dt>
                <dd className="font-medium text-navy">{formatRam(device.ram_gb)}</dd>
              </div>
              {device.power_watts && (
                <div className="flex justify-between">
                  <dt className="text-navy-light">Power</dt>
                  <dd className="font-medium text-navy">{device.power_watts}W</dd>
                </div>
              )}
              {device.storage && (
                <div className="flex justify-between">
                  <dt className="text-navy-light">Storage</dt>
                  <dd className="font-medium text-navy text-right max-w-[160px] truncate">{device.storage}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-navy-light">Forks Tested</dt>
                <dd className="font-medium text-navy">{verdicts.length}</dd>
              </div>
            </dl>
          </div>

          {/* Similar Devices */}
          {similar.length > 0 && (
            <div className="rounded-xl border border-ocean-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-navy mb-3">Similar Devices</h3>
              <div className="space-y-2">
                {similar.map((d) => (
                  <Link key={d.id} href={`/devices/${d.slug}`} className="flex items-center justify-between gap-2 rounded-lg border border-ocean-100 p-3 hover:border-ocean-300 transition-colors text-sm">
                    <div className="min-w-0">
                      <div className="font-medium text-navy truncate">{d.name}</div>
                      <div className="text-xs text-navy-light">{formatRam(d.ram_gb)} &#183; {d.category}</div>
                    </div>
                    <span className="shrink-0 text-ocean-800 font-medium">
                      {d.price_usd ? (d.price_type === "monthly" ? `$${d.price_usd}/mo` : `$${d.price_usd}`) : "Free"}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
