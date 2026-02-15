import { describe, expect, test } from "vitest";

import { generateSitemaps } from "@/app/sitemap";

describe("sitemap chunking", () => {
  test("generateSitemaps returns typed sitemap ids", async () => {
    const ids = await generateSitemaps();
    const idStrings = ids.map((x) => String((x as any).id));

    expect(idStrings).toContain("static");
    expect(idStrings).toContain("devices-0");
    expect(idStrings).toContain("forks-0");
    expect(idStrings).toContain("can-0");
  });
});
