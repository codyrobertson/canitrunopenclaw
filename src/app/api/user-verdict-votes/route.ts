import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getUserByAuthId, getUserVerdictVotes } from "@/lib/queries";

export const dynamic = "force-dynamic";

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export async function GET(request: NextRequest): Promise<Response> {
  const deviceId = parsePositiveInt(request.nextUrl.searchParams.get("deviceId"));
  if (!deviceId) {
    return NextResponse.json(
      { error: "Missing deviceId" },
      { status: 400, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json(
      { votes: {} },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const user = await getUserByAuthId(session.user.id);
  if (!user) {
    return NextResponse.json(
      { votes: {} },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const votes = await getUserVerdictVotes(user.id, deviceId);
  return NextResponse.json(
    { votes },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

