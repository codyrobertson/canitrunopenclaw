import { describe, expect, test } from "vitest";

import { createFilterAwareMetadata } from "@/lib/seo/listings";

describe("SEO listings", () => {
  test("filtered listing is noindex with canonical to base path", () => {
    const md = createFilterAwareMetadata({
      title: "SBC Devices for OpenClaw",
      description: "Browse devices.",
      basePath: "/devices",
      hasFilters: true,
    });

    expect(md.alternates?.canonical).toBe("/devices");
    expect(md.robots).toMatchObject({ index: false, follow: true });
  });

  test("unfiltered listing is indexable", () => {
    const md = createFilterAwareMetadata({
      title: "All Devices for OpenClaw",
      description: "Browse devices.",
      basePath: "/devices",
      hasFilters: false,
    });

    expect(md.alternates?.canonical).toBe("/devices");
    expect(md.robots).toMatchObject({ index: true, follow: true });
  });
});
