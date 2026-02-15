import { describe, expect, test } from "vitest";

import { generateMetadata } from "@/app/benchmarks/page";

describe("/benchmarks metadata", () => {
  test("filtered /benchmarks is noindex and canonicals to /benchmarks", async () => {
    const md = await generateMetadata({
      searchParams: Promise.resolve({ fork: "openclaw" }),
    });

    expect(md.alternates?.canonical).toBe("/benchmarks");
    expect(md.robots).toMatchObject({ index: false, follow: true });
  });
});
