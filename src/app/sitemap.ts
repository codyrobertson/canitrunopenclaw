import type { MetadataRoute } from "next";
import {
  getAllDevices,
  getAllForks,
  getCategoryForkCombinations,
  getComparisonPairs,
  getNonWontRunVerdicts,
} from "@/lib/queries";

function categoryToSlug(category: string): string {
  return category.toLowerCase().replace(/\s+/g, "-");
}

const CHUNK_SIZE = 45_000;

type SitemapId =
  | "static"
  | `devices-${number}`
  | `forks-${number}`
  | `can-${number}`
  | `best-${number}`
  | `compare-${number}`
  | `guides-${number}`;

function chunkCount(total: number): number {
  return Math.max(1, Math.ceil(total / CHUNK_SIZE));
}

function parseSitemapId(id: string): { type: SitemapId extends `${infer T}-${number}` ? T : never; index: number } | null {
  if (id === "static") return { type: "static" as any, index: 0 };
  const match = id.match(/^(devices|forks|can|best|compare|guides)-(\\d+)$/);
  if (!match) return null;
  return { type: match[1] as any, index: Number(match[2]) };
}

function sliceChunk<T>(items: T[], index: number): T[] {
  const start = index * CHUNK_SIZE;
  return items.slice(start, start + CHUNK_SIZE);
}

export async function generateSitemaps(): Promise<{ id: SitemapId }[]> {
  const devices = getAllDevices();
  const forks = getAllForks();
  const canPages = getNonWontRunVerdicts();
  const bestPages = getCategoryForkCombinations();
  const comparePages = getComparisonPairs();
  const guidesPages = getNonWontRunVerdicts();

  const ids: { id: SitemapId }[] = [{ id: "static" }];

  for (let i = 0; i < chunkCount(devices.length); i++) ids.push({ id: `devices-${i}` });
  for (let i = 0; i < chunkCount(forks.length); i++) ids.push({ id: `forks-${i}` });
  for (let i = 0; i < chunkCount(canPages.length); i++) ids.push({ id: `can-${i}` });
  for (let i = 0; i < chunkCount(bestPages.length); i++) ids.push({ id: `best-${i}` });
  for (let i = 0; i < chunkCount(comparePages.length); i++) ids.push({ id: `compare-${i}` });
  for (let i = 0; i < chunkCount(guidesPages.length); i++) ids.push({ id: `guides-${i}` });

  return ids;
}

export default function sitemap({ id }: { id: SitemapId }): MetadataRoute.Sitemap {
  const parsed = parseSitemapId(id);
  if (!parsed) return [];

  const baseUrl = "https://canitrunclaw.com";

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
    return sliceChunk(getAllDevices(), parsed.index).map((d) => ({
      url: `${baseUrl}/devices/${d.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  }

  if (parsed.type === "forks") {
    return sliceChunk(getAllForks(), parsed.index).map((f) => ({
      url: `${baseUrl}/forks/${f.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  }

  if (parsed.type === "can") {
    return sliceChunk(getNonWontRunVerdicts(), parsed.index).map((c) => ({
      url: `${baseUrl}/can/${c.fork_slug}/run-on/${c.device_slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  }

  if (parsed.type === "best") {
    return sliceChunk(getCategoryForkCombinations(), parsed.index).map((c) => ({
      url: `${baseUrl}/best/${categoryToSlug(c.category)}-for-${c.fork_slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  }

  if (parsed.type === "compare") {
    return sliceChunk(getComparisonPairs(), parsed.index).map((p) => ({
      url: `${baseUrl}/compare/${p.slug1}-vs-${p.slug2}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  }

  if (parsed.type === "guides") {
    return sliceChunk(getNonWontRunVerdicts(), parsed.index).map((c) => ({
      url: `${baseUrl}/guides/${c.fork_slug}-on-${c.device_slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  }

  return [];
}
