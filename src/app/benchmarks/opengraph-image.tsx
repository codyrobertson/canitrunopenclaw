import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

import {
  getBenchmarkForkSummaries,
  getBenchmarkTotalRuns,
} from "@/lib/queries";

export const alt = "ClawBench Benchmarks — Can it run OpenClaw?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const svgPath = path.join(process.cwd(), "public", "canitrunopenclawlogo.svg");
  const svgBuffer = fs.readFileSync(svgPath);
  const logoDataUrl = `data:image/svg+xml;base64,${svgBuffer.toString("base64")}`;

  const [totalRuns, forkSummaries] = await Promise.all([
    getBenchmarkTotalRuns(),
    getBenchmarkForkSummaries(),
  ]);

  const forksCount = forkSummaries?.length ?? 0;

  const bestAvg =
    forkSummaries && forkSummaries.length > 0
      ? Math.max(
          ...forkSummaries.map((f: { avg_score?: number | null }) =>
            Number(f.avg_score ?? 0)
          )
        )
      : 0;

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
          background: "linear-gradient(160deg, #1B263B 0%, #023E8A 60%, #0096C7 100%)",
          fontFamily: "Inter, sans-serif",
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
              "radial-gradient(ellipse at 50% 30%, rgba(72, 202, 228, 0.12) 0%, transparent 60%)",
            display: "flex",
          }}
        />

        {/* Logo */}
        <img
          src={logoDataUrl}
          alt=""
          width={80}
          height={68}
          style={{ marginBottom: 20 }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: "#FFFFFF",
            fontFamily: "Space Grotesk, sans-serif",
            lineHeight: 1.1,
            textAlign: "center",
            marginBottom: 8,
            display: "flex",
          }}
        >
          ClawBench Benchmarks
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            color: "rgba(255, 255, 255, 0.7)",
            marginBottom: 48,
            display: "flex",
          }}
        >
          Performance data across forks and hardware
        </div>

        {/* Stats cards */}
        <div
          style={{
            display: "flex",
            gap: 32,
          }}
        >
          {/* Total Runs */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "24px 40px",
              borderRadius: 16,
              backgroundColor: "rgba(27, 38, 59, 0.6)",
              border: "1px solid rgba(72, 202, 228, 0.25)",
              minWidth: 180,
            }}
          >
            <div
              style={{
                fontSize: 42,
                fontWeight: 700,
                color: "#48CAE4",
                fontFamily: "Space Grotesk, sans-serif",
                display: "flex",
              }}
            >
              {(totalRuns ?? 0).toLocaleString()}
            </div>
            <div
              style={{
                fontSize: 16,
                color: "rgba(255, 255, 255, 0.6)",
                marginTop: 4,
                display: "flex",
              }}
            >
              Total Runs
            </div>
          </div>

          {/* Forks Tested */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "24px 40px",
              borderRadius: 16,
              backgroundColor: "rgba(27, 38, 59, 0.6)",
              border: "1px solid rgba(72, 202, 228, 0.25)",
              minWidth: 180,
            }}
          >
            <div
              style={{
                fontSize: 42,
                fontWeight: 700,
                color: "#48CAE4",
                fontFamily: "Space Grotesk, sans-serif",
                display: "flex",
              }}
            >
              {forksCount}
            </div>
            <div
              style={{
                fontSize: 16,
                color: "rgba(255, 255, 255, 0.6)",
                marginTop: 4,
                display: "flex",
              }}
            >
              Forks Tested
            </div>
          </div>

          {/* Best Avg Score */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "24px 40px",
              borderRadius: 16,
              backgroundColor: "rgba(27, 38, 59, 0.6)",
              border: "1px solid rgba(72, 202, 228, 0.25)",
              minWidth: 180,
            }}
          >
            <div
              style={{
                fontSize: 42,
                fontWeight: 700,
                color: "#2D9F4F",
                fontFamily: "Space Grotesk, sans-serif",
                display: "flex",
              }}
            >
              {bestAvg > 0 ? bestAvg.toFixed(1) : "--"}
            </div>
            <div
              style={{
                fontSize: 16,
                color: "rgba(255, 255, 255, 0.6)",
                marginTop: 4,
                display: "flex",
              }}
            >
              Best Avg Score
            </div>
          </div>
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            right: 32,
            fontSize: 18,
            color: "rgba(255, 255, 255, 0.4)",
            display: "flex",
          }}
        >
          canitrunclaw.com
        </div>
      </div>
    ),
    { ...size }
  );
}
