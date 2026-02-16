import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { getDeviceBySlugCached } from "@/lib/queries-cached";

export const alt = "Device Comparison — Can it run OpenClaw?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function parseSlugs(slugs: string): { slug1: string; slug2: string } | null {
  const parts = slugs.split("-vs-");
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { slug1: parts[0], slug2: parts[1] };
  }
  return null;
}

function formatRam(gb: number): string {
  if (gb < 1) return `${Math.round(gb * 1024)}MB`;
  return `${gb}GB`;
}

export default async function Image({
  params,
}: {
  params: Promise<{ slugs: string }>;
}) {
  const { slugs } = await params;

  const svgPath = path.join(process.cwd(), "public", "canitrunopenclawlogo.svg");
  const svgBuffer = fs.readFileSync(svgPath);
  const logoDataUrl = `data:image/svg+xml;base64,${svgBuffer.toString("base64")}`;

  const parsed = parseSlugs(slugs);
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
            Compare Devices
          </div>
        </div>
      ),
      { ...size }
    );
  }

  const [device1, device2] = await Promise.all([
    getDeviceBySlugCached(parsed.slug1),
    getDeviceBySlugCached(parsed.slug2),
  ]);

  if (!device1 || !device2) {
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
            Device Not Found
          </div>
        </div>
      ),
      { ...size }
    );
  }

  const renderDevice = (device: typeof device1) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        padding: "28px 24px",
        borderRadius: 16,
        backgroundColor: "rgba(0,0,0,0.3)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div
        style={{
          fontSize: 16,
          color: "#48CAE4",
          backgroundColor: "rgba(72, 202, 228, 0.15)",
          padding: "4px 12px",
          borderRadius: 6,
          marginBottom: 12,
          display: "flex",
          alignSelf: "flex-start",
        }}
      >
        {device!.category}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "#FFFFFF",
          fontFamily: "Space Grotesk, sans-serif",
          lineHeight: 1.2,
          marginBottom: 16,
          display: "flex",
        }}
      >
        {device!.name}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {device!.ram_gb && (
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", display: "flex", width: 50 }}>RAM</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#FFF", display: "flex" }}>
              {formatRam(device!.ram_gb)}
            </div>
          </div>
        )}
        {device!.cpu && (
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", display: "flex", width: 50 }}>CPU</div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#FFF",
                display: "flex",
                maxWidth: 300,
              }}
            >
              {device!.cpu}
            </div>
          </div>
        )}
        {device!.price_usd && (
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", display: "flex", width: 50 }}>Price</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#FFF", display: "flex" }}>
              ${device!.price_usd}
            </div>
          </div>
        )}
      </div>
    </div>
  );

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
        <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
          <img src={logoDataUrl} alt="" width={48} height={41} />
          <div
            style={{
              fontSize: 20,
              color: "rgba(255,255,255,0.7)",
              marginLeft: 14,
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
            fontSize: 44,
            fontWeight: 700,
            color: "#FFFFFF",
            fontFamily: "Space Grotesk, sans-serif",
            lineHeight: 1.15,
            marginBottom: 32,
            display: "flex",
            textAlign: "center",
          }}
        >
          {device1.name} vs {device2.name}
        </div>

        {/* Side by side cards */}
        <div style={{ display: "flex", gap: 24, flex: 1 }}>
          {renderDevice(device1)}

          {/* VS divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#48CAE4",
                backgroundColor: "rgba(72, 202, 228, 0.15)",
                border: "1px solid rgba(72, 202, 228, 0.3)",
                borderRadius: 20,
                padding: "8px 16px",
                display: "flex",
              }}
            >
              VS
            </div>
          </div>

          {renderDevice(device2)}
        </div>

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
