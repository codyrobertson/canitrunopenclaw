import { describe, expect, test } from "vitest";

import { generateMetadata } from "@/app/devices/page";

describe("/devices metadata", () => {
  test("filtered /devices is noindex and canonicals to /devices", async () => {
    const md = await generateMetadata({
      searchParams: Promise.resolve({ category: "SBC" }),
    });

    expect(md.alternates?.canonical).toBe("/devices");
    expect(md.robots).toMatchObject({ index: false, follow: true });
  });
});
