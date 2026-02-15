import { NextRequest, NextResponse } from "next/server";
import {
  getDeviceBySlug,
  getForkBySlug,
  createBenchmarkRun,
  completeBenchmarkRun,
  insertBenchmarkResult,
  getLatestBenchmarkForDeviceFork,
  updateVerdictTimings,
  updateBenchmarkRunRawJson,
} from "@/lib/queries";
import { rateLimit } from "@/lib/rate-limit";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

type BenchmarkPayload = {
  device_slug: string;
  fork_slug: string;
  results: {
    latency?: {
      cold_start_ms?: number;
      warm_response_ms?: number;
      api_call_avg_ms?: number;
      [key: string]: number | undefined;
    };
    capabilities?: Record<string, boolean>;
    resources?: {
      peak_memory_mb?: number;
      cpu_avg_percent?: number;
      max_concurrent?: number;
      [key: string]: number | undefined;
    };
  };
  docker_config?: {
    image?: string;
    memory_limit_mb?: number;
    cpu_limit?: number;
  };
  overall_score?: number;
};

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`benchmarks-post:${ip}`, 10, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const apiKey = request.headers.get("x-clawbench-key");
    if (process.env.CLAWBENCH_API_KEY && apiKey !== process.env.CLAWBENCH_API_KEY) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const body = (await request.json()) as BenchmarkPayload;

    if (!body.device_slug || !body.fork_slug || !body.results) {
      return NextResponse.json(
        { error: "Missing required fields: device_slug, fork_slug, results" },
        { status: 400 }
      );
    }

    const device = await getDeviceBySlug(body.device_slug);
    if (!device) {
      return NextResponse.json({ error: `Device not found: ${body.device_slug}` }, { status: 404 });
    }

    const fork = await getForkBySlug(body.fork_slug);
    if (!fork) {
      return NextResponse.json({ error: `Fork not found: ${body.fork_slug}` }, { status: 404 });
    }

    const runId = await createBenchmarkRun(
      device.id,
      fork.id,
      null,
      body.docker_config?.image ?? null,
      body.docker_config?.memory_limit_mb ?? null,
      body.docker_config?.cpu_limit ?? null
    );

    try {
      if (body.results.latency) {
        for (const [metric, value] of Object.entries(body.results.latency)) {
          if (value !== undefined && value !== null) {
            await insertBenchmarkResult(runId, metric === "cold_start_ms" ? "cold_start" : metric === "warm_response_ms" ? "warm_response" : metric, value, "ms", "latency");
          }
        }
      }

      if (body.results.capabilities) {
        for (const [capability, passed] of Object.entries(body.results.capabilities)) {
          await insertBenchmarkResult(runId, capability, passed ? 1 : 0, "bool", "capability");
        }
      }

      if (body.results.resources) {
        for (const [metric, value] of Object.entries(body.results.resources)) {
          if (value !== undefined && value !== null) {
            const unit = metric.includes("memory") ? "MB" : metric.includes("cpu") ? "percent" : metric === "max_concurrent" ? "agents" : "unit";
            await insertBenchmarkResult(runId, metric === "peak_memory_mb" ? "peak_memory" : metric === "cpu_avg_percent" ? "cpu_avg" : metric, value, unit, "resource");
          }
        }
      }

      if (body.overall_score !== undefined) {
        await insertBenchmarkResult(runId, "overall_score", body.overall_score, "score", "resource");
      }

      const coldStart = body.results.latency?.cold_start_ms;
      const warmResponse = body.results.latency?.warm_response_ms;
      if (coldStart !== undefined || warmResponse !== undefined) {
        await updateVerdictTimings(
          device.id,
          fork.id,
          coldStart !== undefined ? coldStart / 1000 : undefined,
          warmResponse !== undefined ? warmResponse / 1000 : undefined
        );
      }

      await updateBenchmarkRunRawJson(runId, JSON.stringify(body));
      await completeBenchmarkRun(runId, "completed");

      return NextResponse.json({ run_id: runId, status: "completed" }, { status: 201 });
    } catch (err) {
      await completeBenchmarkRun(runId, "failed", err instanceof Error ? err.message : "Unknown error");
      throw err;
    }
  } catch (err) {
    console.error("Benchmark submission error:", err);
    return NextResponse.json(
      { error: "Failed to process benchmark results" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`benchmarks-get:${ip}`, 60, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deviceSlug = searchParams.get("device");
    const forkSlug = searchParams.get("fork");

    if (!deviceSlug || !forkSlug) {
      return NextResponse.json(
        { error: "Missing required query params: device, fork" },
        { status: 400 }
      );
    }

    const device = await getDeviceBySlug(deviceSlug);
    if (!device) {
      return NextResponse.json({ error: `Device not found: ${deviceSlug}` }, { status: 404 });
    }

    const fork = await getForkBySlug(forkSlug);
    if (!fork) {
      return NextResponse.json({ error: `Fork not found: ${forkSlug}` }, { status: 404 });
    }

    const summary = await getLatestBenchmarkForDeviceFork(device.id, fork.id);
    if (!summary) {
      return NextResponse.json({ error: "No benchmark data found" }, { status: 404 });
    }

    return NextResponse.json(summary);
  } catch (err) {
    console.error("Benchmark fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch benchmark results" },
      { status: 500 }
    );
  }
}
