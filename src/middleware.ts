import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isHtmlPageRequest(request: NextRequest): boolean {
  if (request.method !== "GET") return false;
  const accept = request.headers.get("accept") ?? "";
  if (!accept.includes("text/html")) return false;

  // Resource hints / RSC fetches / assets should not count as page views.
  const dest = request.headers.get("sec-fetch-dest");
  if (dest && dest !== "document") return false;

  return true;
}

function isBotUserAgent(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  if (!ua) return false;

  // Intentionally broad: page view analytics should reflect humans.
  return (
    ua.includes("bot") ||
    ua.includes("crawler") ||
    ua.includes("spider") ||
    ua.includes("headless") ||
    ua.includes("lighthouse") ||
    ua.includes("slackbot") ||
    ua.includes("discordbot") ||
    ua.includes("whatsapp") ||
    ua.includes("telegram") ||
    ua.includes("facebookexternalhit") ||
    ua.includes("linkedinbot") ||
    ua.includes("twitterbot")
  );
}

function isTrackablePath(pathname: string): boolean {
  if (!pathname || pathname === "/") return true;

  // Skip common non-page routes even if they slip through matcher.
  const skipPrefixes = [
    "/api/",
    "/_next/",
    "/opengraph-image",
    "/icon",
    "/apple-icon",
    "/favicon",
    "/robots",
    "/sitemap",
    "/feed",
    "/mockServiceWorker",
  ];
  if (skipPrefixes.some((p) => pathname.startsWith(p))) return false;

  // Static assets (ex: /logo.svg, /homepage.png) should not be tracked as "page views".
  if (/\.[a-z0-9]+$/i.test(pathname)) return false;

  return true;
}

export function middleware(request: NextRequest) {
  // Skip tracking in development to reduce noise
  if (process.env.NODE_ENV === "development") return NextResponse.next();

  // Skip tracking for prefetch requests (Next.js router prefetching)
  if (request.headers.get("purpose") === "prefetch" || request.headers.get("x-middleware-prefetch")) {
    return NextResponse.next();
  }

  if (!isHtmlPageRequest(request)) return NextResponse.next();

  const url = new URL("/api/track", request.url);
  const path = request.nextUrl.pathname;
  if (!isTrackablePath(path)) return NextResponse.next();

  const referrer = request.headers.get("referer") ?? "";
  const userAgent = request.headers.get("user-agent") ?? "";
  if (isBotUserAgent(userAgent)) return NextResponse.next();

  const response = NextResponse.next();

  // Use waitUntil if available (Vercel Edge), otherwise fire-and-forget
  const trackPromise = fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, referrer, userAgent }),
  }).catch(() => {});

  const ctx = globalThis as unknown as { waitUntil?: (p: Promise<unknown>) => void };
  if (ctx.waitUntil) {
    ctx.waitUntil(trackPromise);
  }

  return response;
}

export const config = {
  // Avoid running middleware for obvious assets; we further filter in-code.
  matcher: ["/((?!api|_next|favicon|robots|sitemap|feed|mockServiceWorker|.*\\..*).*)"],
};
