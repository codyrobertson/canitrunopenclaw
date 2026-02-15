import { describe, expect, test } from "vitest";

import { buildCanonicalPath, createMetadata } from "@/lib/seo/metadata";

describe("seo core", () => {
  test("buildCanonicalPath strips query parameters", () => {
    expect(buildCanonicalPath("/devices", { q: "pi", category: "SBC" })).toBe("/devices");
  });

  test("createMetadata sets canonical and noindex when requested", () => {
    const md = createMetadata({
      title: "All Devices",
      description: "Browse devices.",
      canonicalPath: "/devices",
      indexable: false,
    });

    expect(md.alternates?.canonical).toBe("/devices");
    expect(md.robots).toMatchObject({ index: false, follow: true });
  });
});
