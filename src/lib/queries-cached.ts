import { withNextCache } from "@/lib/seo/cache";

import {
  getAllForks,
  getAffiliateClickStats,
  getBenchmarkLeaderboard,
  getBenchmarkForkSummaries,
  getBenchmarkTotalRuns,
  getCategoryForkCombinationChunk,
  getCategoryForkCombinationCount,
  getComparisonPairCount,
  getComparisonPairsChunk,
  getCategories,
  getDeviceBySlug,
  getDeviceCount,
  getDeviceSlugsChunk,
  getDevicesRanked,
  getTopPages,
  getTopReferrers,
  getViewCount,
  getViewsByDay,
  getForkBySlug,
  getForkCount,
  getForkSlugsChunk,
  getNonWontRunVerdictChunk,
  getNonWontRunVerdictCount,
  getVerdictsByDevice,
  getVerdictForDeviceAndFork,
  getDevicesByCategoryForFork,
} from "@/lib/queries";

const DAY = 86400;
const HOUR = 3600;
const TEN_MINUTES = 600;

function normalizeTagPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export async function getDeviceBySlugCached(slug: string) {
  return withNextCache({
    keyParts: ["device", slug],
    options: { revalidate: DAY, tags: [`device:${slug}`] },
    fn: () => getDeviceBySlug(slug),
  });
}

export async function getDevicesRankedAllCached() {
  return withNextCache({
    keyParts: ["devices", "ranked", "all"],
    options: { revalidate: HOUR, tags: ["devices:ranked"] },
    fn: () => getDevicesRanked(),
  });
}

export async function getDevicesRankedFilteredCached(filters: {
  search?: string;
  category?: string;
  forkSlug?: string;
  maxPrice?: number;
}) {
  const search = filters.search?.trim();
  // Search-driven filters can be near-unbounded; avoid cache churn.
  if (search) {
    return getDevicesRanked({
      search,
      category: filters.category,
      forkSlug: filters.forkSlug,
      maxPrice: filters.maxPrice,
    });
  }

  const categoryKey = filters.category ? normalizeTagPart(filters.category) : "all";
  const forkKey = filters.forkSlug ? normalizeTagPart(filters.forkSlug) : "all";
  const priceKey = Number.isFinite(filters.maxPrice) ? String(filters.maxPrice) : "none";

  return withNextCache({
    keyParts: ["devices", "ranked", "filtered", categoryKey, forkKey, priceKey],
    options: {
      revalidate: HOUR,
      tags: ["devices:ranked", `devices:ranked:${categoryKey}:${forkKey}:${priceKey}`],
    },
    fn: () =>
      getDevicesRanked({
        category: filters.category,
        forkSlug: filters.forkSlug,
        maxPrice: filters.maxPrice,
      }),
  });
}

export async function getCategoriesCached() {
  return withNextCache({
    keyParts: ["devices", "categories"],
    options: { revalidate: DAY, tags: ["devices:categories"] },
    fn: () => getCategories(),
  });
}

export async function getForkBySlugCached(slug: string) {
  return withNextCache({
    keyParts: ["fork", slug],
    options: { revalidate: DAY, tags: [`fork:${slug}`] },
    fn: () => getForkBySlug(slug),
  });
}

export async function getAllForksCached() {
  return withNextCache({
    keyParts: ["forks", "all"],
    options: { revalidate: DAY, tags: ["forks:all"] },
    fn: () => getAllForks(),
  });
}

export async function getVerdictForDeviceAndForkCached(deviceSlug: string, forkSlug: string) {
  return withNextCache({
    keyParts: ["verdict", forkSlug, deviceSlug],
    options: { revalidate: DAY, tags: [`verdict:${forkSlug}:${deviceSlug}`] },
    fn: () => getVerdictForDeviceAndFork(deviceSlug, forkSlug),
  });
}

export async function getVerdictsByDeviceCached(deviceId: number) {
  return withNextCache({
    keyParts: ["verdicts", "device", String(deviceId)],
    options: { revalidate: HOUR, tags: [`verdicts:device:${deviceId}`] },
    fn: () => getVerdictsByDevice(deviceId),
  });
}

export async function getDevicesByCategoryForForkCached(category: string, forkSlug: string) {
  const categoryKey = normalizeTagPart(category);
  return withNextCache({
    keyParts: ["best", forkSlug, categoryKey],
    options: { revalidate: DAY, tags: [`best:${forkSlug}:${categoryKey}`] },
    fn: () => getDevicesByCategoryForFork(category, forkSlug),
  });
}

export async function getBenchmarkForkSummariesCached() {
  return withNextCache({
    keyParts: ["benchmarks", "fork-summaries"],
    options: { revalidate: TEN_MINUTES, tags: ["benchmarks:summaries"] },
    fn: () => getBenchmarkForkSummaries(),
  });
}

export async function getBenchmarkLeaderboardCached(filters?: { forkSlug?: string; category?: string; limit?: number }) {
  const forkKey = filters?.forkSlug ? normalizeTagPart(filters.forkSlug) : "all";
  const categoryKey = filters?.category ? normalizeTagPart(filters.category) : "all";
  const limit = filters?.limit ?? 100;

  return withNextCache({
    keyParts: ["benchmarks", "leaderboard", forkKey, categoryKey, String(limit)],
    options: {
      revalidate: TEN_MINUTES,
      tags: [
        "benchmarks:leaderboard",
        `benchmarks:leaderboard:${forkKey}`,
        `benchmarks:leaderboard:${forkKey}:${categoryKey}`,
      ],
    },
    fn: () => getBenchmarkLeaderboard(filters),
  });
}

export async function getBenchmarkTotalRunsCached() {
  return withNextCache({
    keyParts: ["benchmarks", "total-runs"],
    options: { revalidate: TEN_MINUTES, tags: ["benchmarks:total-runs"] },
    fn: () => getBenchmarkTotalRuns(),
  });
}

// --- Admin analytics helpers ---

export async function getViewCountCached(days: number) {
  const dayKey = String(Math.max(1, Math.floor(days)));
  return withNextCache({
    keyParts: ["analytics", "views", "count", dayKey],
    options: { revalidate: TEN_MINUTES, tags: ["analytics:views"] },
    fn: () => getViewCount(days),
  });
}

export async function getViewsByDayCached(days = 30) {
  const dayKey = String(Math.max(1, Math.floor(days)));
  return withNextCache({
    keyParts: ["analytics", "views", "by-day", dayKey],
    options: { revalidate: TEN_MINUTES, tags: ["analytics:views"] },
    fn: () => getViewsByDay(days),
  });
}

export async function getTopPagesCached(limit = 10, days = 30) {
  const limitKey = String(Math.max(1, Math.floor(limit)));
  const dayKey = String(Math.max(1, Math.floor(days)));
  return withNextCache({
    keyParts: ["analytics", "top-pages", limitKey, dayKey],
    options: { revalidate: TEN_MINUTES, tags: ["analytics:views"] },
    fn: () => getTopPages(limit, days),
  });
}

export async function getTopReferrersCached(limit = 10, days = 30) {
  const limitKey = String(Math.max(1, Math.floor(limit)));
  const dayKey = String(Math.max(1, Math.floor(days)));
  return withNextCache({
    keyParts: ["analytics", "top-referrers", limitKey, dayKey],
    options: { revalidate: TEN_MINUTES, tags: ["analytics:views"] },
    fn: () => getTopReferrers(limit, days),
  });
}

export async function getAffiliateClickStatsCached(days = 30) {
  const dayKey = String(Math.max(1, Math.floor(days)));
  return withNextCache({
    keyParts: ["analytics", "affiliate-clicks", dayKey],
    options: { revalidate: TEN_MINUTES, tags: ["analytics:affiliate-clicks"] },
    fn: () => getAffiliateClickStats(days),
  });
}

// --- Sitemap helpers ---

export async function getDeviceCountCached() {
  return withNextCache({
    keyParts: ["sitemap", "devices", "count"],
    options: { revalidate: DAY, tags: ["sitemap:devices"] },
    fn: () => getDeviceCount(),
  });
}

export async function getDeviceSitemapChunkCached(offset: number, limit: number) {
  return withNextCache({
    keyParts: ["sitemap", "devices", "chunk", String(offset), String(limit)],
    options: { revalidate: DAY, tags: ["sitemap:devices"] },
    fn: () => getDeviceSlugsChunk(offset, limit),
  });
}

export async function getForkCountCached() {
  return withNextCache({
    keyParts: ["sitemap", "forks", "count"],
    options: { revalidate: DAY, tags: ["sitemap:forks"] },
    fn: () => getForkCount(),
  });
}

export async function getForkSitemapChunkCached(offset: number, limit: number) {
  return withNextCache({
    keyParts: ["sitemap", "forks", "chunk", String(offset), String(limit)],
    options: { revalidate: DAY, tags: ["sitemap:forks"] },
    fn: () => getForkSlugsChunk(offset, limit),
  });
}

export async function getCanCountCached() {
  return withNextCache({
    keyParts: ["sitemap", "can", "count"],
    options: { revalidate: DAY, tags: ["sitemap:can"] },
    fn: () => getNonWontRunVerdictCount(),
  });
}

export async function getCanChunkCached(offset: number, limit: number) {
  return withNextCache({
    keyParts: ["sitemap", "can", "chunk", String(offset), String(limit)],
    options: { revalidate: DAY, tags: ["sitemap:can"] },
    fn: () => getNonWontRunVerdictChunk(offset, limit),
  });
}

export async function getBestCountCached() {
  return withNextCache({
    keyParts: ["sitemap", "best", "count"],
    options: { revalidate: DAY, tags: ["sitemap:best"] },
    fn: () => getCategoryForkCombinationCount(),
  });
}

export async function getBestChunkCached(offset: number, limit: number) {
  return withNextCache({
    keyParts: ["sitemap", "best", "chunk", String(offset), String(limit)],
    options: { revalidate: DAY, tags: ["sitemap:best"] },
    fn: () => getCategoryForkCombinationChunk(offset, limit),
  });
}

export async function getCompareCountCached() {
  return withNextCache({
    keyParts: ["sitemap", "compare", "count"],
    options: { revalidate: DAY, tags: ["sitemap:compare"] },
    fn: () => getComparisonPairCount(),
  });
}

export async function getCompareChunkCached(offset: number, limit: number) {
  return withNextCache({
    keyParts: ["sitemap", "compare", "chunk", String(offset), String(limit)],
    options: { revalidate: DAY, tags: ["sitemap:compare"] },
    fn: () => getComparisonPairsChunk(offset, limit),
  });
}

export async function getGuidesCountCached() {
  return withNextCache({
    keyParts: ["sitemap", "guides", "count"],
    options: { revalidate: DAY, tags: ["sitemap:guides"] },
    fn: () => getNonWontRunVerdictCount(),
  });
}

export async function getGuidesChunkCached(offset: number, limit: number) {
  return withNextCache({
    keyParts: ["sitemap", "guides", "chunk", String(offset), String(limit)],
    options: { revalidate: DAY, tags: ["sitemap:guides"] },
    fn: () => getNonWontRunVerdictChunk(offset, limit),
  });
}
