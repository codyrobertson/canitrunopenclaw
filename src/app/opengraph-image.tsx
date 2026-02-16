import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

export const alt = "Can it run OpenClaw? — Hardware Compatibility Directory";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const svgPath = path.join(process.cwd(), "public", "canitrunopenclawlogo.svg");
  const svgBuffer = fs.readFileSync(svgPath);
  const logoDataUrl = `data:image/svg+xml;base64,${svgBuffer.toString("base64")}`;

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
          background: "linear-gradient(135deg, #023E8A 0%, #0077B6 50%, #0096C7 100%)",
          fontFamily: "Inter, sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle grid overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              "radial-gradient(circle at 20% 80%, rgba(72, 202, 228, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(0, 150, 199, 0.2) 0%, transparent 50%)",
            display: "flex",
          }}
        />

        {/* Logo */}
        <img
          src={logoDataUrl}
          alt=""
          width={120}
          height={102}
          style={{
            marginBottom: 24,
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#FFFFFF",
            fontFamily: "Space Grotesk, sans-serif",
            lineHeight: 1.1,
            textAlign: "center",
            marginBottom: 16,
            textShadow: "0 2px 10px rgba(0,0,0,0.3)",
            display: "flex",
          }}
        >
          Can it run OpenClaw?
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "rgba(255, 255, 255, 0.85)",
            fontWeight: 400,
            textAlign: "center",
            marginBottom: 48,
            display: "flex",
          }}
        >
          Hardware Compatibility Directory for AI Agent Forks
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            gap: 48,
            padding: "20px 40px",
            borderRadius: 16,
            backgroundColor: "rgba(27, 38, 59, 0.5)",
            border: "1px solid rgba(72, 202, 228, 0.3)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
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
              50+
            </div>
            <div
              style={{
                fontSize: 16,
                color: "rgba(255, 255, 255, 0.7)",
                display: "flex",
              }}
            >
              Devices
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
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
              20+
            </div>
            <div
              style={{
                fontSize: 16,
                color: "rgba(255, 255, 255, 0.7)",
                display: "flex",
              }}
            >
              Forks
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
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
              500+
            </div>
            <div
              style={{
                fontSize: 16,
                color: "rgba(255, 255, 255, 0.7)",
                display: "flex",
              }}
            >
              Reports
            </div>
          </div>
        </div>

        {/* Site URL */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            right: 32,
            fontSize: 18,
            color: "rgba(255, 255, 255, 0.5)",
            display: "flex",
          }}
        >
          canitrunopenclaw.com
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
