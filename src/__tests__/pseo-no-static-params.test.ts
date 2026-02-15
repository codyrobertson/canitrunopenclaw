import { describe, expect, test } from "vitest";

import * as canPage from "@/app/can/[fork]/run-on/[device]/page";
import * as bestPage from "@/app/best/[slug]/page";
import * as guidePage from "@/app/guides/[slug]/page";
import * as comparePage from "@/app/compare/[slugs]/page";

describe("pSEO should not enumerate static params", () => {
  test("/can/[fork]/run-on/[device] does not export generateStaticParams", () => {
    const mod = canPage as unknown as Record<string, unknown>;
    expect(mod.generateStaticParams).toBeUndefined();
  });

  test("/best/[slug] does not export generateStaticParams", () => {
    const mod = bestPage as unknown as Record<string, unknown>;
    expect(mod.generateStaticParams).toBeUndefined();
  });

  test("/guides/[slug] does not export generateStaticParams", () => {
    const mod = guidePage as unknown as Record<string, unknown>;
    expect(mod.generateStaticParams).toBeUndefined();
  });

  test("/compare/[slugs] does not export generateStaticParams", () => {
    const mod = comparePage as unknown as Record<string, unknown>;
    expect(mod.generateStaticParams).toBeUndefined();
  });
});
