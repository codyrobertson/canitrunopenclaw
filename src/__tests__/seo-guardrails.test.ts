import { describe, expect, test } from "vitest";

import { evaluateSeoGuardrails } from "@/lib/seo/guardrails";

describe("seo guardrails", () => {
  test("marks thin content as noindex", async () => {
    const res = await evaluateSeoGuardrails({
      canonicalPath: "/thin",
      requestedIndexable: true,
      content: {
        title: "Thin Page",
        description: "Too short.",
      },
      policy: { minWords: 10 },
    });

    expect(res.indexable).toBe(false);
    expect(res.canonicalPath).toBe("/thin");
    expect(res.reasons).toContain("thin_content");
  });

  test("allows indexable when content meets word threshold", async () => {
    const long = "word ".repeat(50).trim();
    const res = await evaluateSeoGuardrails({
      canonicalPath: "/ok",
      requestedIndexable: true,
      content: {
        title: "Okay Page",
        description: long,
      },
      policy: { minWords: 10 },
    });

    expect(res.indexable).toBe(true);
    expect(res.reasons).toEqual([]);
  });

  test("applies duplicate detector (canonical + noindex)", async () => {
    const res = await evaluateSeoGuardrails({
      canonicalPath: "/dupe",
      requestedIndexable: true,
      content: {
        title: "Duplicate-ish Page",
        description: "word ".repeat(50).trim(),
      },
      policy: { minWords: 10 },
      duplicateDetector: {
        async findDuplicate() {
          return { canonicalPath: "/canonical", type: "exact" as const };
        },
      },
    });

    expect(res.indexable).toBe(false);
    expect(res.canonicalPath).toBe("/canonical");
    expect(res.reasons).toContain("duplicate_exact");
  });
});

