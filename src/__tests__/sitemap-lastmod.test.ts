import { describe, expect, test } from "vitest";

import { getSitemapChunkItems } from "@/lib/seo/sitemap-chunks";

describe("sitemap lastmod", () => {
  test("devices chunk includes lastModified when items exist", async () => {
    const items = await getSitemapChunkItems(1000);
    if (items.length === 0) {
      expect(true).toBe(true);
      return;
    }

    expect(items[0]!.lastModified).toBeTruthy();
  });
});

