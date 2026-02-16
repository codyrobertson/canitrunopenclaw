import { NextRequest, NextResponse } from "next/server";
import { trackPageView } from "@/lib/queries";
import { rateLimit } from "@/lib/rate-limit";

function normalizePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.length > 300) return null;
  return trimmed;
}

function normalizeOptional(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
}

function isBotUserAgent(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  if (!ua) return false;
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
  if (pathname === "/") return true;
  if (pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/_next/")) return false;
  if (pathname.startsWith("/opengraph-image")) return false;
  if (pathname.startsWith("/sitemap")) return false;
  if (pathname.startsWith("/robots")) return false;
  if (pathname.startsWith("/feed")) return false;
  if (pathname.startsWith("/favicon")) return false;
  if (pathname.startsWith("/icon")) return false;
  if (pathname.startsWith("/apple-icon")) return false;
  if (pathname.startsWith("/mockServiceWorker")) return false;
  if (/\.[a-z0-9]+$/i.test(pathname)) return false;
  return true;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as unknown;
  if (!body || typeof body !== "object") return new NextResponse(null, { status: 204 });

  const raw = body as Record<string, unknown>;
  const path = normalizePath(raw.path);
  if (!path || !isTrackablePath(path)) return new NextResponse(null, { status: 204 });

  const userAgent = normalizeOptional(raw.userAgent, 500);
  if (userAgent && isBotUserAgent(userAgent)) return new NextResponse(null, { status: 204 });

  const referrer = normalizeOptional(raw.referrer, 500);
  const ip = getClientIp(request);
  const rateKey =
    ip === "unknown"
      ? `track:${path}:${(userAgent ?? "unknown").slice(0, 80)}`
      : `track:${ip}`;
  const rl = rateLimit(rateKey, 120, 60_000);
  if (!rl.success) return new NextResponse(null, { status: 204 });

  const country =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    null;

  try {
    await trackPageView(path, referrer, userAgent, country);
  } catch {
    // Tracking is best-effort; never fail user requests.
  }

  return new NextResponse(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
