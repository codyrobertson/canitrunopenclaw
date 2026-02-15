import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Fire-and-forget POST to /api/track — don't block the response
  const url = new URL("/api/track", request.url);
  const path = request.nextUrl.pathname;
  const referrer = request.headers.get("referer") ?? "";
  const userAgent = request.headers.get("user-agent") ?? "";

  try {
    fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, referrer, userAgent }),
    }).catch(() => {
      // Silently ignore tracking failures
    });
  } catch {
    // Silently ignore tracking failures
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|favicon|robots|sitemap|feed).*)"],
};
