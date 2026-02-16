import { getRecentDevices } from "@/lib/queries";

export const dynamic = "force-static";
export const revalidate = 3600; // 1h

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const recent = await getRecentDevices(50);

  const siteUrl = "https://canitrunopenclaw.com";
  const now = new Date().toUTCString();

  const items = recent
    .map((device) => {
      const link = `${siteUrl}/devices/${device.slug}`;
      const pubDate = device.updated_at ? new Date(device.updated_at).toUTCString() : now;
      const description = device.description
        ? escapeXml(device.description)
        : escapeXml(`${device.name} — ${device.category}, ${device.ram_gb}GB RAM${device.price_usd ? `, $${device.price_usd}` : ""}`);

      return `    <item>
      <title>${escapeXml(device.name)}</title>
      <description>${description}</description>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <category>${escapeXml(device.category)}</category>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Can it run OpenClaw? — Latest Devices &amp; Benchmarks</title>
    <link>${siteUrl}</link>
    <description>Find out if your hardware can run OpenClaw and its forks. Latest devices and compatibility verdicts.</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=3600",
    },
  });
}
