import { describe, expect, test } from "vitest";

import { buildFAQPage, buildHowTo, buildSoftwareApplication, buildTechArticle } from "@/lib/seo/schema";

describe("SEO schema builders - common types", () => {
  test("buildSoftwareApplication includes author when provided", () => {
    const node = buildSoftwareApplication({
      name: "OpenClaw",
      description: "AI agent framework",
      applicationCategory: "AI Agent Framework",
      operatingSystem: "Cross-platform",
      url: "https://github.com/openclaw/openclaw",
      license: "MIT",
      authorName: "Jane Doe",
    });

    expect(node["@type"]).toBe("SoftwareApplication");
    const author = (node as unknown as { author?: unknown }).author;
    expect(author).toEqual({ "@type": "Person", name: "Jane Doe" });
  });

  test("buildTechArticle includes about entities", () => {
    const node = buildTechArticle({
      headline: "Can OpenClaw run on Raspberry Pi 5?",
      description: "Yes.",
      about: [
        { "@type": "SoftwareApplication", name: "OpenClaw" },
        { "@type": "Product", name: "Raspberry Pi 5" },
      ],
    });

    expect(node["@type"]).toBe("TechArticle");
    const about = (node as unknown as { about?: unknown }).about as unknown[];
    expect(about).toHaveLength(2);
  });

  test("buildHowTo includes totalTime and steps", () => {
    const node = buildHowTo({
      name: "How to Set Up OpenClaw on Raspberry Pi 5",
      description: "Step-by-step guide.",
      totalTime: "PT20M",
      steps: [
        { name: "Install Node.js", text: "Use nvm." },
        { name: "Clone repo", text: "git clone ..." },
      ],
    });

    expect(node["@type"]).toBe("HowTo");
    const howTo = node as unknown as { totalTime?: unknown; step?: unknown };
    expect(howTo.totalTime).toBe("PT20M");
    expect(howTo.step as unknown[]).toHaveLength(2);
  });

  test("buildHowTo supports tools and command directions", () => {
    const node = buildHowTo({
      name: "How to Set Up OpenClaw on Raspberry Pi 5",
      description: "Step-by-step guide.",
      tools: ["Raspberry Pi 5"],
      steps: [{ name: "Clone repo", text: "Clone the repository.", command: "git clone ..." }],
    });

    const howTo = node as unknown as { tool?: unknown; step?: unknown };
    expect(howTo.tool).toEqual([{ "@type": "HowToTool", name: "Raspberry Pi 5" }]);
    const steps = howTo.step as unknown[] as Array<Record<string, unknown>>;
    expect(steps[0]!.itemListElement).toEqual({
      "@type": "HowToDirection",
      text: "git clone ...",
    });
  });

  test("buildFAQPage emits FAQPage with Questions + Answers", () => {
    const node = buildFAQPage([
      { question: "Can it run?", answer: "Yes." },
      { question: "  ", answer: "ignored" },
    ]);

    expect(node["@type"]).toBe("FAQPage");
    const mainEntity = (node as unknown as { mainEntity?: unknown }).mainEntity as unknown[];
    expect(mainEntity).toHaveLength(1);
    expect(mainEntity[0] as Record<string, unknown>).toMatchObject({
      "@type": "Question",
      name: "Can it run?",
      acceptedAnswer: { "@type": "Answer", text: "Yes." },
    });
  });
});
