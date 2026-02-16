import { describe, expect, test } from "vitest";

import { getSitemapChunkItems } from "@/lib/seo/sitemap-chunks";

describe("sitemap static", () => {
  test("id=0 includes core hub pages", async () => {
    const items = await getSitemapChunkItems("0");
    const urls = items.map((x) => x.url);

    expect(urls).toContain("https://canitrunopenclaw.com");
    expect(urls).toContain("https://canitrunopenclaw.com/devices");
    expect(urls).toContain("https://canitrunopenclaw.com/forks");
  });
});
