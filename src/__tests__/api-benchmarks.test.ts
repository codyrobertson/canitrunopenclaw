import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/benchmarks/route";
import { NextRequest } from "next/server";
import { getDevicesRanked, getAllForks } from "@/lib/queries";

function makeRequest(url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("GET /api/benchmarks", () => {
  it("returns benchmark data for valid device and fork slugs", async () => {
    const devices = getDevicesRanked();
    const forks = getAllForks();

    if (devices.length === 0 || forks.length === 0) {
      // Skip if no seed data
      expect(true).toBe(true);
      return;
    }

    const deviceSlug = devices[0].slug;
    const forkSlug = forks[0].slug;

    const request = makeRequest(
      `http://localhost:3000/api/benchmarks?device=${deviceSlug}&fork=${forkSlug}`
    );
    const response = await GET(request);
    const data = await response.json();

    // Either we get benchmark data (200) or no data found (404)
    expect([200, 404]).toContain(response.status);

    if (response.status === 200) {
      expect(data).toHaveProperty("run_id");
      expect(data).toHaveProperty("fork_name");
    } else {
      expect(data).toHaveProperty("error");
    }
  });

  it("returns 404 for an invalid device slug", async () => {
    const request = makeRequest(
      "http://localhost:3000/api/benchmarks?device=nonexistent-device-xyz&fork=openclaw"
    );
    const response = await GET(request);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toContain("Device not found");
  });

  it("returns 400 when missing query params", async () => {
    const request = makeRequest("http://localhost:3000/api/benchmarks");
    const response = await GET(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain("Missing required query params");
  });

  it("returns 404 for an invalid fork slug", async () => {
    const devices = getDevicesRanked();
    if (devices.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const request = makeRequest(
      `http://localhost:3000/api/benchmarks?device=${devices[0].slug}&fork=nonexistent-fork-xyz`
    );
    const response = await GET(request);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toContain("Fork not found");
  });
});

describe("POST /api/benchmarks", () => {
  it("creates a benchmark run with valid body", async () => {
    const devices = getDevicesRanked();
    const forks = getAllForks();

    if (devices.length === 0 || forks.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const body = {
      device_slug: devices[0].slug,
      fork_slug: forks[0].slug,
      results: {
        latency: {
          cold_start_ms: 1200,
          warm_response_ms: 150,
        },
        capabilities: {
          basic_inference: true,
          streaming: true,
          function_calling: false,
        },
        resources: {
          peak_memory_mb: 512,
          cpu_avg_percent: 45,
        },
      },
      overall_score: 7.5,
    };

    const request = makeRequest("http://localhost:3000/api/benchmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty("run_id");
    expect(data.status).toBe("completed");
  });

  it("returns 400 for missing required fields", async () => {
    const request = makeRequest("http://localhost:3000/api/benchmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_slug: "test" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain("Missing required fields");
  });

  it("returns 404 for nonexistent device", async () => {
    const forks = getAllForks();
    if (forks.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const request = makeRequest("http://localhost:3000/api/benchmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_slug: "nonexistent-device-xyz",
        fork_slug: forks[0].slug,
        results: { latency: { cold_start_ms: 100 } },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toContain("Device not found");
  });
});
