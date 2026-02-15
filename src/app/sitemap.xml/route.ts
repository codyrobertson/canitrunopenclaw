import { SITE_URL } from "@/lib/seo/site";
import { generateSitemapChunkIds } from "@/lib/seo/sitemaps";

export const dynamic = "force-static";
export const revalidate = 86400; // 24h; keeps index fresh without frequent regeneration.

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

// Sitemap index that points to our chunked sitemap endpoints at /sitemap/{id}.xml
export async function GET(): Promise<Response> {
  const baseUrl = SITE_URL.replace(/\/$/, "");
  const chunks = await generateSitemapChunkIds();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    chunks
      .map(({ id }) => `  <sitemap><loc>${escapeXml(`${baseUrl}/sitemap/${id}.xml`)}</loc></sitemap>`)
      .join("\n") +
    `\n</sitemapindex>\n`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Allow CDNs/browsers to cache; Next ISR handles refresh via `revalidate`.
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
