import { describe, expect, test } from "vitest";

import { generateMetadata } from "@/app/compare/page";

describe("/compare metadata", () => {
  test("query-param /compare is noindex and canonicals to /compare", async () => {
    const md = await generateMetadata({
      searchParams: Promise.resolve({ devices: "raspberry-pi-5,raspberry-pi-4" }),
    });

    expect(md.alternates?.canonical).toBe("/compare");
    expect(md.robots).toMatchObject({ index: false, follow: true });
  });
});
