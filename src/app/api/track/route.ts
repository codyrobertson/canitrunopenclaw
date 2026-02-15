import { NextRequest, NextResponse } from "next/server";
import { trackPageView } from "@/lib/queries";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, referrer, userAgent } = body as {
      path?: string;
      referrer?: string;
      userAgent?: string;
    };

    if (!path) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    const country =
      request.headers.get("x-vercel-ip-country") ??
      request.headers.get("cf-ipcountry") ??
      null;

    await trackPageView(path, referrer || null, userAgent || null, country);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to track" }, { status: 500 });
  }
}
