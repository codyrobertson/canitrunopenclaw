import { withNextCache } from "@/lib/seo/cache";

import {
  getCategoryForkCombinationChunk,
  getCategoryForkCombinationCount,
  getComparisonPairCount,
  getComparisonPairsChunk,
  getDeviceBySlug,
  getDeviceCount,
  getDeviceSlugsChunk,
  getForkBySlug,
  getForkCount,
  getForkSlugsChunk,
  getNonWontRunVerdictChunk,
  getNonWontRunVerdictCount,
  getVerdictForDeviceAndFork,
  getDevicesByCategoryForFork,
} from "@/lib/queries";

const DAY = 86400;

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

export async function getForkBySlugCached(slug: string) {
  return withNextCache({
    keyParts: ["fork", slug],
    options: { revalidate: DAY, tags: [`fork:${slug}`] },
    fn: () => getForkBySlug(slug),
  });
}

export async function getVerdictForDeviceAndForkCached(deviceSlug: string, forkSlug: string) {
  return withNextCache({
    keyParts: ["verdict", forkSlug, deviceSlug],
    options: { revalidate: DAY, tags: [`verdict:${forkSlug}:${deviceSlug}`] },
    fn: () => getVerdictForDeviceAndFork(deviceSlug, forkSlug),
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
