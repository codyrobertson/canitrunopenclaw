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

// Each sitemap type gets a range of numeric IDs:
// 0 = static
// 1000-1999 = devices chunks
// 2000-2999 = forks chunks
// 3000-3999 = can pages chunks
// 4000-4999 = best pages chunks
// 5000-5999 = compare chunks
// 6000-6999 = guides chunks

function chunkCount(total: number): number {
  return Math.max(1, Math.ceil(total / CHUNK_SIZE));
}

function decodeId(id: number): { type: string; index: number } {
  if (id === 0) return { type: "static", index: 0 };
  if (id >= 1000 && id < 2000) return { type: "devices", index: id - 1000 };
  if (id >= 2000 && id < 3000) return { type: "forks", index: id - 2000 };
  if (id >= 3000 && id < 4000) return { type: "can", index: id - 3000 };
  if (id >= 4000 && id < 5000) return { type: "best", index: id - 4000 };
  if (id >= 5000 && id < 6000) return { type: "compare", index: id - 5000 };
  if (id >= 6000 && id < 7000) return { type: "guides", index: id - 6000 };
  return { type: "unknown", index: 0 };
}

function sliceChunk<T>(items: T[], index: number): T[] {
  const start = index * CHUNK_SIZE;
  return items.slice(start, start + CHUNK_SIZE);
}

export async function generateSitemaps(): Promise<{ id: number }[]> {
  const devices = getAllDevices();
  const forks = getAllForks();
  const canPages = getNonWontRunVerdicts();
  const bestPages = getCategoryForkCombinations();
  const comparePages = getComparisonPairs();
  const guidesPages = getNonWontRunVerdicts();

  const ids: { id: number }[] = [{ id: 0 }]; // static

  for (let i = 0; i < chunkCount(devices.length); i++) ids.push({ id: 1000 + i });
  for (let i = 0; i < chunkCount(forks.length); i++) ids.push({ id: 2000 + i });
  for (let i = 0; i < chunkCount(canPages.length); i++) ids.push({ id: 3000 + i });
  for (let i = 0; i < chunkCount(bestPages.length); i++) ids.push({ id: 4000 + i });
  for (let i = 0; i < chunkCount(comparePages.length); i++) ids.push({ id: 5000 + i });
  for (let i = 0; i < chunkCount(guidesPages.length); i++) ids.push({ id: 6000 + i });

  return ids;
}

export default function sitemap({ id }: { id: number }): MetadataRoute.Sitemap {
  const parsed = decodeId(id);

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
