import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Skip tracking in development to reduce noise
  if (process.env.NODE_ENV === "development") return response;

  // Skip tracking for prefetch requests (Next.js router prefetching)
  if (request.headers.get("purpose") === "prefetch" || request.headers.get("x-middleware-prefetch")) {
    return response;
  }

  const url = new URL("/api/track", request.url);
  const path = request.nextUrl.pathname;
  const referrer = request.headers.get("referer") ?? "";
  const userAgent = request.headers.get("user-agent") ?? "";

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
  matcher: ["/((?!api|_next|favicon|robots|sitemap|feed|mockServiceWorker).*)"],
};
