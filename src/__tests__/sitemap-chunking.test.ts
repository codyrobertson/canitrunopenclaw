import { describe, expect, test } from "vitest";

import { generateSitemaps } from "@/app/sitemap";

describe("sitemap chunking", () => {
  test("generateSitemaps returns numeric sitemap ids", async () => {
    const ids = await generateSitemaps();
    const idNums = ids.map((x) => x.id);

    expect(idNums).toContain(0);       // static
    expect(idNums).toContain(1000);    // devices-0
    expect(idNums).toContain(2000);    // forks-0
    expect(idNums).toContain(3000);    // can-0
  });
});
