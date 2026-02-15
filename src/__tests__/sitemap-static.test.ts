import { describe, expect, test } from "vitest";

import { getSitemapChunkItems } from "@/lib/seo/sitemap-chunks";

describe("sitemap static", () => {
  test("id=0 includes core hub pages", async () => {
    const items = await getSitemapChunkItems("0");
    const urls = items.map((x) => x.url);

    expect(urls).toContain("https://canitrunclaw.com");
    expect(urls).toContain("https://canitrunclaw.com/devices");
    expect(urls).toContain("https://canitrunclaw.com/forks");
  });
});
