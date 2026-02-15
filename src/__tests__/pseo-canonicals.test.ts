import { describe, expect, test } from "vitest";

import {
  getAllForks,
  getCategoryForkCombinations,
  getComparisonPairs,
  getNonWontRunVerdicts,
} from "@/lib/queries";

import { generateMetadata as generateForkMetadata } from "@/app/forks/[slug]/page";
import { generateMetadata as generateBestMetadata } from "@/app/best/[slug]/page";
import { generateMetadata as generateGuideMetadata } from "@/app/guides/[slug]/page";
import { generateMetadata as generateCompareMetadata } from "@/app/compare/[slugs]/page";

function categoryToSlug(category: string): string {
  return category.toLowerCase().replace(/\s+/g, "-");
}

describe("pSEO canonicals", () => {
  test("/forks/[slug] sets canonical", async () => {
    const forks = await getAllForks();
    if (forks.length === 0) {
      expect(true).toBe(true);
      return;
    }
    const fork = forks[0];
    const md = await generateForkMetadata({ params: Promise.resolve({ slug: fork.slug }) });
    expect(md.alternates?.canonical).toBe(`/forks/${fork.slug}`);
  });

  test("/best/[slug] sets canonical", async () => {
    const combos = await getCategoryForkCombinations();
    if (combos.length === 0) {
      expect(true).toBe(true);
      return;
    }
    const combo = combos[0];
    const slug = `${categoryToSlug(combo.category)}-for-${combo.fork_slug}`;
    const md = await generateBestMetadata({ params: Promise.resolve({ slug }) });
    expect(md.alternates?.canonical).toBe(`/best/${slug}`);
  });

  test("/guides/[slug] sets canonical", async () => {
    const combos = await getNonWontRunVerdicts();
    if (combos.length === 0) {
      expect(true).toBe(true);
      return;
    }
    const combo = combos[0];
    const slug = `${combo.fork_slug}-on-${combo.device_slug}`;
    const md = await generateGuideMetadata({ params: Promise.resolve({ slug }) });
    expect(md.alternates?.canonical).toBe(`/guides/${slug}`);
  });

  test("/compare/[slugs] sets canonical", async () => {
    const pairs = await getComparisonPairs();
    if (pairs.length === 0) {
      expect(true).toBe(true);
      return;
    }
    const pair = pairs[0];
    const slugs = `${pair.slug1}-vs-${pair.slug2}`;
    const md = await generateCompareMetadata({ params: Promise.resolve({ slugs }) });
    expect(md.alternates?.canonical).toBe(`/compare/${slugs}`);
  });
});
