import { NextRequest, NextResponse } from "next/server";
import { getDeviceBySlug, getBestAffiliateLink, logAffiliateClick } from "@/lib/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const device = await getDeviceBySlug(slug);

  if (!device) {
    return NextResponse.redirect(new URL("/devices", request.url));
  }

  const network = request.nextUrl.searchParams.get("network") ?? undefined;
  const link = await getBestAffiliateLink(device.id, network);

  if (!link) {
    if (device.buy_link) {
      return NextResponse.redirect(device.buy_link, 302);
    }
    return NextResponse.redirect(new URL(`/devices/${slug}`, request.url));
  }

  const referrer = request.headers.get("referer") ?? null;
  try {
    await logAffiliateClick(link.id, referrer);
  } catch {
    // Don't block the redirect if logging fails
  }

  let redirectUrl = link.url;
  if (link.affiliate_tag) {
    const separator = redirectUrl.includes("?") ? "&" : "?";
    redirectUrl = `${redirectUrl}${separator}${link.affiliate_tag}`;
  }

  return NextResponse.redirect(redirectUrl, 302);
}
