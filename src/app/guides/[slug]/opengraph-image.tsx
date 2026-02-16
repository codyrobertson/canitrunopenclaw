import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import {
  getDeviceBySlugCached,
  getForkBySlugCached,
  getVerdictForDeviceAndForkCached,
} from "@/lib/queries-cached";

export const alt = "Setup Guide — Can it run OpenClaw?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function parseSlug(slug: string): { forkSlug: string; deviceSlug: string } | null {
  const parts = slug.split("-on-");
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { forkSlug: parts[0], deviceSlug: parts[1] };
  }
  return null;
}

const verdictConfig: Record<string, { label: string; color: string }> = {
  RUNS_GREAT: { label: "Runs Great", color: "#2D9F4F" },
  RUNS_OK: { label: "Runs OK", color: "#0077B6" },
  BARELY_RUNS: { label: "Barely Runs", color: "#E07A2F" },
  WONT_RUN: { label: "Won't Run", color: "#D32F2F" },
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
            Setup Guide
          </div>
        </div>
      ),
      { ...size }
    );
  }

  const [fork, device] = await Promise.all([
    getForkBySlugCached(parsed.forkSlug),
    getDeviceBySlugCached(parsed.deviceSlug),
  ]);

  if (!fork || !device) {
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

  const verdict = await getVerdictForDeviceAndForkCached(parsed.deviceSlug, parsed.forkSlug);
  const v = verdict ? verdictConfig[verdict.verdict] : null;

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
        {/* Decorative glow */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              "radial-gradient(ellipse at 70% 20%, rgba(72, 202, 228, 0.08) 0%, transparent 50%)",
            display: "flex",
          }}
        />

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 40 }}>
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

        {/* Badge */}
        <div style={{ display: "flex", marginBottom: 16 }}>
          <div
            style={{
              fontSize: 16,
              color: "#48CAE4",
              backgroundColor: "rgba(72, 202, 228, 0.15)",
              padding: "6px 16px",
              borderRadius: 8,
              border: "1px solid rgba(72, 202, 228, 0.3)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "1px",
              display: "flex",
            }}
          >
            Setup Guide
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#FFFFFF",
            fontFamily: "Space Grotesk, sans-serif",
            lineHeight: 1.2,
            marginBottom: 8,
            display: "flex",
          }}
        >
          Install {fork.name}
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#48CAE4",
            fontFamily: "Space Grotesk, sans-serif",
            lineHeight: 1.2,
            marginBottom: 32,
            display: "flex",
          }}
        >
          on {device.name}
        </div>

        {/* Info row */}
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          {/* Language */}
          {fork.language && (
            <div
              style={{
                display: "flex",
                padding: "10px 20px",
                borderRadius: 10,
                backgroundColor: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <div style={{ fontSize: 18, color: "rgba(255,255,255,0.8)", display: "flex" }}>
                {fork.language}
              </div>
            </div>
          )}

          {/* Category */}
          <div
            style={{
              display: "flex",
              padding: "10px 20px",
              borderRadius: 10,
              backgroundColor: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <div style={{ fontSize: 18, color: "rgba(255,255,255,0.8)", display: "flex" }}>
              {device.category}
            </div>
          </div>

          {/* Verdict */}
          {v && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 20px",
                borderRadius: 10,
                backgroundColor: "rgba(0,0,0,0.3)",
                border: `1px solid ${v.color}`,
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
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: v.color,
                  display: "flex",
                }}
              >
                {v.label}
              </div>
            </div>
          )}
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
