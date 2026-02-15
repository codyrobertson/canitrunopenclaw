import type { MetadataRoute } from "next";

import {
  getBestChunkCached,
  getCanChunkCached,
  getCompareChunkCached,
  getDeviceSitemapChunkCached,
  getForkSitemapChunkCached,
  getGuidesChunkCached,
} from "@/lib/queries-cached";
import { SITE_URL } from "@/lib/seo/site";
import { SITEMAP_CHUNK_SIZE } from "@/lib/seo/sitemaps";

const CHUNK_SIZE = SITEMAP_CHUNK_SIZE;

export type SitemapChunkType =
  | "static"
  | "devices"
  | "forks"
  | "can"
  | "best"
  | "compare"
  | "guides";

export type ParsedSitemapChunkId = { type: SitemapChunkType; index: number };

// Each sitemap type gets a range of numeric IDs:
// 0 = static
// 1000-1999 = devices chunks
// 2000-2999 = forks chunks
// 3000-3999 = can pages chunks
// 4000-4999 = best pages chunks
// 5000-5999 = compare chunks
// 6000-6999 = guides chunks
export function parseSitemapChunkId(id: number | string): ParsedSitemapChunkId | null {
  const idNum = typeof id === "string" ? Number(id) : id;
  if (!Number.isFinite(idNum)) return null;

  if (idNum === 0) return { type: "static", index: 0 };
  if (idNum >= 1000 && idNum < 2000) return { type: "devices", index: idNum - 1000 };
  if (idNum >= 2000 && idNum < 3000) return { type: "forks", index: idNum - 2000 };
  if (idNum >= 3000 && idNum < 4000) return { type: "can", index: idNum - 3000 };
  if (idNum >= 4000 && idNum < 5000) return { type: "best", index: idNum - 4000 };
  if (idNum >= 5000 && idNum < 6000) return { type: "compare", index: idNum - 5000 };
  if (idNum >= 6000 && idNum < 7000) return { type: "guides", index: idNum - 6000 };

  return null;
}

function categoryToSlug(category: string): string {
  return category.toLowerCase().replace(/\s+/g, "-");
}

export async function getSitemapChunkItems(id: number | string): Promise<MetadataRoute.Sitemap> {
  const parsed = parseSitemapChunkId(id);
  if (!parsed) return [];

  const baseUrl = SITE_URL.replace(/\/$/, "");
  const offset = parsed.index * CHUNK_SIZE;

  if (parsed.type === "static") {
    return [
      { url: baseUrl, changeFrequency: "weekly" as const, priority: 1.0 },
      { url: `${baseUrl}/devices`, changeFrequency: "weekly" as const, priority: 0.9 },
      { url: `${baseUrl}/forks`, changeFrequency: "weekly" as const, priority: 0.9 },
      { url: `${baseUrl}/benchmarks`, changeFrequency: "weekly" as const, priority: 0.7 },
      { url: `${baseUrl}/compare`, changeFrequency: "monthly" as const, priority: 0.7 },
    ];
  }

  if (parsed.type === "devices") {
    const rows = await getDeviceSitemapChunkCached(offset, CHUNK_SIZE);
    return rows.map((row) => ({
      url: `${baseUrl}/devices/${row.slug}`,
      lastModified: row.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  }

  if (parsed.type === "forks") {
    const rows = await getForkSitemapChunkCached(offset, CHUNK_SIZE);
    return rows.map((row) => ({
      url: `${baseUrl}/forks/${row.slug}`,
      lastModified: row.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  }

  if (parsed.type === "can") {
    const combos = await getCanChunkCached(offset, CHUNK_SIZE);
    return combos.map((c) => ({
      url: `${baseUrl}/can/${c.fork_slug}/run-on/${c.device_slug}`,
      lastModified: c.updated_at,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  }

  if (parsed.type === "best") {
    const combos = await getBestChunkCached(offset, CHUNK_SIZE);
    return combos.map((c) => ({
      url: `${baseUrl}/best/${categoryToSlug(c.category)}-for-${c.fork_slug}`,
      ...(c.lastmod ? { lastModified: c.lastmod } : {}),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  }

  if (parsed.type === "compare") {
    const pairs = await getCompareChunkCached(offset, CHUNK_SIZE);
    return pairs.map((p) => ({
      url: `${baseUrl}/compare/${p.slug1}-vs-${p.slug2}`,
      ...(p.lastmod ? { lastModified: p.lastmod } : {}),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  }

  // guides
  const combos = await getGuidesChunkCached(offset, CHUNK_SIZE);
  return combos.map((c) => ({
    url: `${baseUrl}/guides/${c.fork_slug}-on-${c.device_slug}`,
    lastModified: c.updated_at,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
}
