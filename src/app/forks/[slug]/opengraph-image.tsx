import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

import { getDevicesByFork, getForkBySlug } from "@/lib/queries";

export const alt = "Fork Details — Can it run OpenClaw?";
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

  const fork = await getForkBySlug(slug);

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
            Fork Not Found
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

  const devices = await getDevicesByFork(fork.id);
  const deviceCount = devices?.length ?? 0;

  const features: string[] = (() => {
    try {
      if (typeof fork.features === "string") return JSON.parse(fork.features);
      if (Array.isArray(fork.features)) return fork.features;
      return [];
    } catch {
      return [];
    }
  })();

  const minRamDisplay = fork.min_ram_mb
    ? fork.min_ram_mb >= 1024
      ? `${(fork.min_ram_mb / 1024).toFixed(fork.min_ram_mb % 1024 === 0 ? 0 : 1)} GB`
      : `${fork.min_ram_mb} MB`
    : null;

  const maturityColors: Record<string, string> = {
    stable: "#2D9F4F",
    beta: "#E07A2F",
    alpha: "#D32F2F",
    experimental: "#9B59B6",
  };

  const maturityColor =
    maturityColors[(fork.maturity ?? "").toLowerCase()] ?? "#0077B6";

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

        {/* Fork name + language badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: "#FFFFFF",
              fontFamily: "Space Grotesk, sans-serif",
              lineHeight: 1.15,
              display: "flex",
            }}
          >
            {fork.name}
          </div>

          {fork.language && (
            <div
              style={{
                fontSize: 18,
                color: "#F8F9FA",
                backgroundColor: "rgba(72, 202, 228, 0.2)",
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid rgba(72, 202, 228, 0.4)",
                fontWeight: 500,
                display: "flex",
              }}
            >
              {fork.language}
            </div>
          )}

          {fork.maturity && (
            <div
              style={{
                fontSize: 16,
                color: "#FFFFFF",
                backgroundColor: maturityColor,
                padding: "6px 14px",
                borderRadius: 8,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "flex",
              }}
            >
              {fork.maturity}
            </div>
          )}
        </div>

        {/* Description */}
        {fork.description && (
          <div
            style={{
              fontSize: 22,
              color: "rgba(255,255,255,0.75)",
              lineHeight: 1.4,
              marginBottom: 28,
              maxWidth: 900,
              display: "flex",
            }}
          >
            {fork.description.length > 120
              ? `${fork.description.slice(0, 120)}...`
              : fork.description}
          </div>
        )}

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 40,
            marginBottom: 28,
          }}
        >
          {minRamDisplay && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.5)",
                  marginBottom: 4,
                  display: "flex",
                }}
              >
                Min RAM
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#48CAE4",
                  fontFamily: "Space Grotesk, sans-serif",
                  display: "flex",
                }}
              >
                {minRamDisplay}
              </div>
            </div>
          )}

          {fork.github_stars != null && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.5)",
                  marginBottom: 4,
                  display: "flex",
                }}
              >
                GitHub Stars
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#48CAE4",
                  fontFamily: "Space Grotesk, sans-serif",
                  display: "flex",
                }}
              >
                {fork.github_stars.toLocaleString()}
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.5)",
                marginBottom: 4,
                display: "flex",
              }}
            >
              Compatible Devices
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#48CAE4",
                fontFamily: "Space Grotesk, sans-serif",
                display: "flex",
              }}
            >
              {deviceCount}
            </div>
          </div>
        </div>

        {/* Features pills */}
        {features.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {features.slice(0, 5).map((feature) => (
              <div
                key={feature}
                style={{
                  fontSize: 15,
                  color: "rgba(255,255,255,0.8)",
                  backgroundColor: "rgba(255,255,255,0.1)",
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: "1px solid rgba(255,255,255,0.15)",
                  display: "flex",
                }}
              >
                {feature}
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
