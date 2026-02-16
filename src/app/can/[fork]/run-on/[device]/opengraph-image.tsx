import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import {
  getDeviceBySlugCached,
  getForkBySlugCached,
  getVerdictForDeviceAndForkCached,
} from "@/lib/queries-cached";

export const alt = "Compatibility Check — Can it run OpenClaw?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const verdictConfig: Record<string, { label: string; color: string; bg: string }> = {
  RUNS_GREAT: { label: "Runs Great", color: "#2D9F4F", bg: "rgba(45, 159, 79, 0.15)" },
  RUNS_OK: { label: "Runs OK", color: "#0077B6", bg: "rgba(0, 119, 182, 0.15)" },
  BARELY_RUNS: { label: "Barely Runs", color: "#E07A2F", bg: "rgba(224, 122, 47, 0.15)" },
  WONT_RUN: { label: "Won't Run", color: "#D32F2F", bg: "rgba(211, 47, 47, 0.15)" },
};

export default async function Image({
  params,
}: {
  params: Promise<{ fork: string; device: string }>;
}) {
  const { fork: forkSlug, device: deviceSlug } = await params;

  const svgPath = path.join(process.cwd(), "public", "canitrunopenclawlogo.svg");
  const svgBuffer = fs.readFileSync(svgPath);
  const logoDataUrl = `data:image/svg+xml;base64,${svgBuffer.toString("base64")}`;

  const [fork, device] = await Promise.all([
    getForkBySlugCached(forkSlug),
    getDeviceBySlugCached(deviceSlug),
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

  const verdict = await getVerdictForDeviceAndForkCached(device.slug, fork.slug);
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

        {/* Question */}
        <div
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.6)",
            marginBottom: 8,
            display: "flex",
          }}
        >
          Can
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#48CAE4",
            fontFamily: "Space Grotesk, sans-serif",
            lineHeight: 1.15,
            marginBottom: 8,
            display: "flex",
          }}
        >
          {fork.name}
        </div>
        <div
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.6)",
            marginBottom: 8,
            display: "flex",
          }}
        >
          run on
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#FFFFFF",
            fontFamily: "Space Grotesk, sans-serif",
            lineHeight: 1.15,
            marginBottom: 32,
            display: "flex",
          }}
        >
          {device.name}?
        </div>

        {/* Verdict badge */}
        {v ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: "flex-start",
              gap: 16,
              padding: "16px 28px",
              borderRadius: 16,
              backgroundColor: v.bg,
              border: `2px solid ${v.color}`,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: v.color,
                display: "flex",
              }}
            />
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: v.color,
                fontFamily: "Space Grotesk, sans-serif",
                display: "flex",
              }}
            >
              {v.label}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "16px 28px",
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <div style={{ fontSize: 28, color: "rgba(255,255,255,0.6)", display: "flex" }}>
              No verdict yet
            </div>
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
