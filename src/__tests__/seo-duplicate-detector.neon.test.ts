import { describe, expect, test } from "vitest";
import crypto from "node:crypto";

import { evaluateSeoGuardrails } from "@/lib/seo/guardrails";
import { createNeonDuplicateDetector } from "@/lib/seo/neon-duplicate-detector";

describe("Neon duplicate detector (integration)", () => {
  test("exact-duplicate content becomes noindex + canonicalizes to first seen", async () => {
    const pageType = `vitest-${crypto.randomUUID()}`;
    const detector = createNeonDuplicateDetector(pageType, { nearDistance: 0 });

    const content = {
      title: "Same Content",
      description: "word ".repeat(100).trim(),
      h1: "Same Content",
      headings: ["A", "B"],
      body: "word ".repeat(100).trim(),
    };

    const first = await evaluateSeoGuardrails({
      canonicalPath: "/__vitest__/a",
      requestedIndexable: true,
      content,
      policy: { minWords: 10 },
      duplicateDetector: detector,
    });
    expect(first.indexable).toBe(true);
    expect(first.canonicalPath).toBe("/__vitest__/a");

    const second = await evaluateSeoGuardrails({
      canonicalPath: "/__vitest__/b",
      requestedIndexable: true,
      content,
      policy: { minWords: 10 },
      duplicateDetector: detector,
    });
    expect(second.indexable).toBe(false);
    expect(second.canonicalPath).toBe("/__vitest__/a");
    expect(second.reasons).toContain("duplicate_exact");
  });
});

