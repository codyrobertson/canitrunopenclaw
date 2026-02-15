import { describe, expect, test } from "vitest";

import { buildProduct } from "@/lib/seo/schema";

describe("SEO schema builders - Product", () => {
  test("buildProduct emits Product with optional aggregateRating", () => {
    const node = buildProduct({
      name: "Raspberry Pi 5",
      description: "A small SBC.",
      category: "SBC",
      aggregateRating: { ratingValue: 4.6, ratingCount: 12 },
    });

    expect(node["@type"]).toBe("Product");
    const aggregateRating = (node as unknown as { aggregateRating?: unknown }).aggregateRating as Record<string, unknown>;
    expect(aggregateRating).toMatchObject({
      "@type": "AggregateRating",
      ratingValue: 4.6,
      ratingCount: 12,
      bestRating: 5,
      worstRating: 1,
    });
  });
});
