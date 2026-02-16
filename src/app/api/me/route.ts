import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getUserByAuthId } from "@/lib/queries";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(`api:me:${ip}`, 60, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json(
      { isAdmin: false },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const user = await getUserByAuthId(session.user.id);
  return NextResponse.json(
    { isAdmin: Boolean(user?.is_admin) },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
