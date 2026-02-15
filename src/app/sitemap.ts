import type { MetadataRoute } from "next";
import {
  getDevicesRanked,
  getAllForks,
  getAllVerdictCombinations,
  getCategoryForkCombinations,
  getComparisonPairs,
  getNonWontRunVerdicts,
} from "@/lib/queries";

function categoryToSlug(category: string): string {
  return category.toLowerCase().replace(/\s+/g, "-");
}

export default function sitemap(): MetadataRoute.Sitemap {
  const devices = getDevicesRanked();
  const forks = getAllForks();
  const baseUrl = "https://canitrunclaw.com";

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "weekly" as const, priority: 1.0 },
    { url: `${baseUrl}/devices`, changeFrequency: "weekly" as const, priority: 0.9 },
    { url: `${baseUrl}/forks`, changeFrequency: "weekly" as const, priority: 0.9 },
    { url: `${baseUrl}/compare`, changeFrequency: "monthly" as const, priority: 0.7 },
  ];

  const devicePages: MetadataRoute.Sitemap = devices.map((d) => ({
    url: `${baseUrl}/devices/${d.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const forkPages: MetadataRoute.Sitemap = forks.map((f) => ({
    url: `${baseUrl}/forks/${f.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // pSEO: Fork+Device combo pages
  const comboPages: MetadataRoute.Sitemap = getAllVerdictCombinations().map((c) => ({
    url: `${baseUrl}/can/${c.fork_slug}/run-on/${c.device_slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // pSEO: Category landing pages
  const categoryPages: MetadataRoute.Sitemap = getCategoryForkCombinations().map((c) => ({
    url: `${baseUrl}/best/${categoryToSlug(c.category)}-for-${c.fork_slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // pSEO: Auto-comparison pages
  const comparisonPages: MetadataRoute.Sitemap = getComparisonPairs().map((p) => ({
    url: `${baseUrl}/compare/${p.slug1}-vs-${p.slug2}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // pSEO: Setup guide pages
  const guidePages: MetadataRoute.Sitemap = getNonWontRunVerdicts().map((c) => ({
    url: `${baseUrl}/guides/${c.fork_slug}-on-${c.device_slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    ...staticPages,
    ...devicePages,
    ...forkPages,
    ...comboPages,
    ...categoryPages,
    ...comparisonPages,
    ...guidePages,
  ];
}
