import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: [
      "https://canitrunclaw.com/sitemap.xml",
      "https://canitrunclaw.com/feed.xml",
    ],
  };
}
