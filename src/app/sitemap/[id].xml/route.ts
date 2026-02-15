import type { MetadataRoute } from "next";
import type { NextRequest } from "next/server";

import { getSitemapChunkItems, parseSitemapChunkId } from "@/lib/seo/sitemap-chunks";

export const dynamic = "force-static";
export const revalidate = 86400; // 24h; keep crawlable without frequent regeneration.

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function formatLastMod(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function buildSitemapXml(items: MetadataRoute.Sitemap): string {
  const urlEntries = items
    .map((item) => {
      const parts: string[] = [];
      parts.push("  <url>");
      parts.push(`    <loc>${escapeXml(item.url)}</loc>`);
      if (item.lastModified) parts.push(`    <lastmod>${escapeXml(formatLastMod(item.lastModified))}</lastmod>`);
      if (item.changeFrequency) parts.push(`    <changefreq>${escapeXml(item.changeFrequency)}</changefreq>`);
      if (typeof item.priority === "number") parts.push(`    <priority>${item.priority.toFixed(1)}</priority>`);
      parts.push("  </url>");
      return parts.join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urlEntries}\n` +
    `</urlset>\n`;
}

export async function GET(
  _request: NextRequest,
  context?: { params?: unknown }
): Promise<Response> {
  const resolvedParams = (await context?.params) as unknown;
  const id =
    resolvedParams &&
    typeof resolvedParams === "object" &&
    "id" in resolvedParams &&
    typeof (resolvedParams as Record<string, unknown>).id === "string"
      ? ((resolvedParams as Record<string, unknown>).id as string)
      : undefined;
  if (!id || !parseSitemapChunkId(id)) {
    return new Response("Not Found", { status: 404 });
  }

  const items = await getSitemapChunkItems(id);
  const xml = buildSitemapXml(items);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Allow CDNs/browsers to cache; Next ISR handles refresh via `revalidate`.
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
