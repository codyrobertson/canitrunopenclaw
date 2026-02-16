import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { getDevicesByCategoryForForkCached, getForkBySlugCached } from "@/lib/queries-cached";

export const alt = "Best Devices — Can it run OpenClaw?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function parseSlug(slug: string): { category: string; forkSlug: string } | null {
  const parts = slug.split("-for-");
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { category: parts[0], forkSlug: parts[1] };
  }
  return null;
}

const categoryMap: Record<string, string> = {
  sbc: "SBC",
  desktop: "Desktop",
  laptop: "Laptop",
  server: "Server",
  cloud: "Cloud",
  microcontroller: "Microcontroller",
  handheld: "Handheld",
  appliance: "Appliance",
  nas: "NAS",
  phone: "Phone",
  tablet: "Tablet",
  "mini-pc": "Mini PC",
  router: "Router",
};

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const svgPath = path.join(process.cwd(), "public", "canitrunopenclawlogo.svg");
  const svgBuffer = fs.readFileSync(svgPath);
  const logoDataUrl = `data:image/svg+xml;base64,${svgBuffer.toString("base64")}`;

  const parsed = parseSlug(slug);
  if (!parsed) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #023E8A 0%, #0077B6 100%)",
          }}
        >
          <img src={logoDataUrl} alt="" width={80} height={68} style={{ marginBottom: 20 }} />
          <div style={{ fontSize: 48, fontWeight: 700, color: "#FFF", display: "flex" }}>
            Not Found
          </div>
        </div>
      ),
      { ...size }
    );
  }

  const fork = await getForkBySlugCached(parsed.forkSlug);
  const category = categoryMap[parsed.category] ?? parsed.category;

  if (!fork) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #023E8A 0%, #0077B6 100%)",
          }}
        >
          <img src={logoDataUrl} alt="" width={80} height={68} style={{ marginBottom: 20 }} />
          <div style={{ fontSize: 48, fontWeight: 700, color: "#FFF", display: "flex" }}>
            Not Found
          </div>
        </div>
      ),
      { ...size }
    );
  }

  const devices = await getDevicesByCategoryForForkCached(category, fork.slug);
  const great = devices.filter((d) => d.verdict === "RUNS_GREAT").length;
  const ok = devices.filter((d) => d.verdict === "RUNS_OK").length;
  const topDevices = devices.slice(0, 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(160deg, #1B263B 0%, #023E8A 100%)",
          fontFamily: "Inter, sans-serif",
          padding: 48,
          position: "relative",
        }}
      >
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
          <img src={logoDataUrl} alt="" width={56} height={48} />
          <div
            style={{
              fontSize: 22,
              color: "rgba(255,255,255,0.7)",
              marginLeft: 16,
              fontWeight: 600,
              display: "flex",
            }}
          >
            Can it run OpenClaw?
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: "#FFFFFF",
            fontFamily: "Space Grotesk, sans-serif",
            lineHeight: 1.15,
            marginBottom: 8,
            display: "flex",
          }}
        >
          Best {category} Devices
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.75)",
            marginBottom: 32,
            display: "flex",
          }}
        >
          for {fork.name}
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 32, marginBottom: 32 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "16px 28px",
              borderRadius: 12,
              backgroundColor: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: "#48CAE4",
                fontFamily: "Space Grotesk, sans-serif",
                display: "flex",
              }}
            >
              {devices.length}
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", display: "flex" }}>
              Total Devices
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "16px 28px",
              borderRadius: 12,
              backgroundColor: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: "#2D9F4F",
                fontFamily: "Space Grotesk, sans-serif",
                display: "flex",
              }}
            >
              {great}
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", display: "flex" }}>
              Runs Great
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "16px 28px",
              borderRadius: 12,
              backgroundColor: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: "#0077B6",
                fontFamily: "Space Grotesk, sans-serif",
                display: "flex",
              }}
            >
              {ok}
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", display: "flex" }}>
              Runs OK
            </div>
          </div>
        </div>

        {/* Top 3 devices */}
        {topDevices.length > 0 && (
          <div style={{ display: "flex", gap: 16 }}>
            {topDevices.map((d, i) => (
              <div
                key={d.slug}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 16px",
                  borderRadius: 10,
                  backgroundColor: "rgba(72, 202, 228, 0.1)",
                  border: "1px solid rgba(72, 202, 228, 0.2)",
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#48CAE4",
                    display: "flex",
                  }}
                >
                  #{i + 1}
                </div>
                <div style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", display: "flex" }}>
                  {d.name}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            right: 48,
            fontSize: 16,
            color: "rgba(255,255,255,0.4)",
            display: "flex",
          }}
        >
          canitrunopenclaw.com
        </div>
      </div>
    ),
    { ...size }
  );
}
