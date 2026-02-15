import { describe, expect, test } from "vitest";

import { toAbsoluteUrl } from "@/lib/seo/url";
import { buildBreadcrumbList, buildSchemaGraph } from "@/lib/seo/schema";

describe("SEO schema builders", () => {
  test("toAbsoluteUrl prefixes SITE_URL", () => {
    expect(toAbsoluteUrl("/devices")).toBe("https://canitrunclaw.com/devices");
  });

  test("buildBreadcrumbList emits schema.org BreadcrumbList", () => {
    const node = buildBreadcrumbList([
      { name: "Home", path: "/" },
      { name: "Devices", path: "/devices" },
    ]);

    expect(node["@type"]).toBe("BreadcrumbList");
    const itemListElement = (node as unknown as { itemListElement?: unknown }).itemListElement;
    expect(itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: "https://canitrunclaw.com/" },
      { "@type": "ListItem", position: 2, name: "Devices", item: "https://canitrunclaw.com/devices" },
    ]);
  });

  test("buildSchemaGraph wraps nodes", () => {
    const graph = buildSchemaGraph([{ "@type": "Thing", name: "Example" }]);
    expect(graph["@context"]).toBe("https://schema.org");
    const nodes = (graph as unknown as { "@graph"?: unknown })["@graph"] as unknown[];
    expect(nodes).toHaveLength(1);
  });
});
