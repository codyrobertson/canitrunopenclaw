import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

import { getDeviceBySlug, getVerdictCountsByDevice } from "@/lib/queries";

export const alt = "Device Compatibility — Can it run OpenClaw?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const svgPath = path.join(process.cwd(), "public", "canitrunopenclawlogo.svg");
  const svgBuffer = fs.readFileSync(svgPath);
  const logoDataUrl = `data:image/svg+xml;base64,${svgBuffer.toString("base64")}`;

  const device = await getDeviceBySlug(slug);

  if (!device) {
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
            fontFamily: "Inter, sans-serif",
          }}
        >
          <img src={logoDataUrl} alt="" width={80} height={68} style={{ marginBottom: 20 }} />
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: "#FFFFFF",
              fontFamily: "Space Grotesk, sans-serif",
              display: "flex",
            }}
          >
            Device Not Found
          </div>
          <div
            style={{
              fontSize: 24,
              color: "rgba(255,255,255,0.7)",
              marginTop: 12,
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

  const verdicts = await getVerdictCountsByDevice(device.id);

  const verdictItems = [
    { label: "Runs Great", count: verdicts.RUNS_GREAT ?? 0, color: "#2D9F4F" },
    { label: "Runs OK", count: verdicts.RUNS_OK ?? 0, color: "#0077B6" },
    { label: "Barely Runs", count: verdicts.BARELY_RUNS ?? 0, color: "#E07A2F" },
    { label: "Won't Run", count: verdicts.WONT_RUN ?? 0, color: "#D32F2F" },
  ];

  const totalVerdicts = verdictItems.reduce((sum, v) => sum + v.count, 0);

  const priceDisplay = device.price_usd
    ? device.price_type === "starting"
      ? `From $${device.price_usd}`
      : `$${device.price_usd}`
    : "Price N/A";

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
        {/* Top bar: logo + site name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
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

        {/* Device name */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: "#FFFFFF",
            fontFamily: "Space Grotesk, sans-serif",
            lineHeight: 1.15,
            marginBottom: 8,
            display: "flex",
          }}
        >
          {device.name}
        </div>

        {/* Category badge */}
        <div
          style={{
            display: "flex",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 18,
              color: "#48CAE4",
              backgroundColor: "rgba(72, 202, 228, 0.15)",
              padding: "6px 16px",
              borderRadius: 8,
              border: "1px solid rgba(72, 202, 228, 0.3)",
              fontWeight: 500,
              display: "flex",
            }}
          >
            {device.category}
          </div>
        </div>

        {/* Specs row */}
        <div
          style={{
            display: "flex",
            gap: 32,
            marginBottom: 40,
          }}
        >
          {device.ram_gb && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 4, display: "flex" }}>
                RAM
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#FFFFFF", display: "flex" }}>
                {device.ram_gb} GB
              </div>
            </div>
          )}

          {device.cpu && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 4, display: "flex" }}>
                CPU
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#FFFFFF", display: "flex", maxWidth: 400 }}>
                {device.cpu}
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 4, display: "flex" }}>
              Price
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#FFFFFF", display: "flex" }}>
              {priceDisplay}
            </div>
          </div>
        </div>

        {/* Verdict breakdown */}
        <div
          style={{
            display: "flex",
            gap: 24,
            padding: "20px 28px",
            borderRadius: 16,
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {verdictItems.map((v) => (
            <div
              key={v.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: v.color,
                  display: "flex",
                }}
              />
              <div style={{ fontSize: 18, color: "rgba(255,255,255,0.8)", display: "flex" }}>
                {v.label}
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  fontFamily: "Space Grotesk, sans-serif",
                  display: "flex",
                }}
              >
                {v.count}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom: total reports + URL */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            left: 48,
            right: 48,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", display: "flex" }}>
            {totalVerdicts} compatibility {totalVerdicts === 1 ? "report" : "reports"}
          </div>
          <div style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", display: "flex" }}>
            canitrunopenclaw.com
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
