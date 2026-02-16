import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

import { generateSitemapChunkIds } from "@/lib/seo/sitemaps";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type RevalidateBody = {
  secret?: string;
  paths?: string[];
  tags?: string[];
  mode?: "sitemaps";
};

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function normalizePath(value: string): string {
  if (!value) return "/";
  if (!value.startsWith("/")) return `/${value}`;
  return value;
}

function isAllowedPath(path: string): boolean {
  // Prevent accidental/global invalidations; keep to our SEO surfaces.
  return (
    path === "/" ||
    path.startsWith("/devices") ||
    path.startsWith("/forks") ||
    path.startsWith("/can/") ||
    path.startsWith("/best/") ||
    path.startsWith("/guides/") ||
    path.startsWith("/compare") ||
    path.startsWith("/sitemap")
  );
}

function getProvidedSecret(req: NextRequest, body: RevalidateBody): string | null {
  const header = req.headers.get("x-revalidate-secret");
  if (header) return header;
  if (body.secret) return body.secret;
  return null;
}

export async function POST(req: NextRequest): Promise<Response> {
  const ip = getClientIp(req);
  const rl = rateLimit(`revalidate:${ip}`, 20, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as RevalidateBody;
  const expected = process.env.REVALIDATE_SECRET;

  if (!expected) {
    return NextResponse.json({ error: "REVALIDATE_SECRET is not configured" }, { status: 500 });
  }

  const provided = getProvidedSecret(req, body);
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const revalidatedPaths: string[] = [];
  const revalidatedTags: string[] = [];

  const paths = Array.isArray(body.paths) ? body.paths : [];
  const tags = Array.isArray(body.tags) ? body.tags : [];

  for (const rawPath of paths) {
    const path = normalizePath(rawPath);
    if (!isAllowedPath(path)) continue;
    revalidatePath(path);
    revalidatedPaths.push(path);
  }

  for (const tag of tags) {
    const t = String(tag || "").trim();
    if (!t) continue;
    revalidateTag(t, "max");
    revalidatedTags.push(t);
  }

  if (body.mode === "sitemaps") {
    // Ensure any `unstable_cache`-wrapped sitemap queries are refreshed too.
    const sitemapTags = [
      "sitemap:devices",
      "sitemap:forks",
      "sitemap:can",
      "sitemap:best",
      "sitemap:compare",
      "sitemap:guides",
    ];
    for (const tag of sitemapTags) {
      revalidateTag(tag, "max");
      revalidatedTags.push(tag);
    }

    // Revalidate index + every chunk. Chunk counts are small even at 100k pages.
    revalidatePath("/sitemap.xml");
    revalidatedPaths.push("/sitemap.xml");

    const chunks = await generateSitemapChunkIds();
    for (const { id } of chunks) {
      const path = `/sitemap/${id}.xml`;
      revalidatePath(path);
      revalidatedPaths.push(path);
    }
  }

  return NextResponse.json({
    ok: true,
    revalidated: {
      paths: revalidatedPaths,
      tags: revalidatedTags,
    },
    now: new Date().toISOString(),
  });
}
