import { NextRequest, NextResponse } from "next/server";
import {
  getDeviceBySlug,
  getForkBySlug,
  createBenchmarkRun,
  completeBenchmarkRun,
  insertBenchmarkResult,
  getLatestBenchmarkForDeviceFork,
} from "@/lib/queries";
import { db } from "@/lib/db";
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
    // Rate limit: 10 requests per minute per IP
    const ip = getClientIp(request);
    const rl = rateLimit(`benchmarks-post:${ip}`, 10, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Optional API key auth
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

    const device = getDeviceBySlug(body.device_slug);
    if (!device) {
      return NextResponse.json({ error: `Device not found: ${body.device_slug}` }, { status: 404 });
    }

    const fork = getForkBySlug(body.fork_slug);
    if (!fork) {
      return NextResponse.json({ error: `Fork not found: ${body.fork_slug}` }, { status: 404 });
    }

    // Create the benchmark run
    const runId = createBenchmarkRun(
      device.id,
      fork.id,
      null,
      body.docker_config?.image ?? null,
      body.docker_config?.memory_limit_mb ?? null,
      body.docker_config?.cpu_limit ?? null
    );

    try {
      // Insert latency results
      if (body.results.latency) {
        for (const [metric, value] of Object.entries(body.results.latency)) {
          if (value !== undefined && value !== null) {
            insertBenchmarkResult(runId, metric === "cold_start_ms" ? "cold_start" : metric === "warm_response_ms" ? "warm_response" : metric, value, "ms", "latency");
          }
        }
      }

      // Insert capability results
      if (body.results.capabilities) {
        for (const [capability, passed] of Object.entries(body.results.capabilities)) {
          insertBenchmarkResult(runId, capability, passed ? 1 : 0, "bool", "capability");
        }
      }

      // Insert resource results
      if (body.results.resources) {
        for (const [metric, value] of Object.entries(body.results.resources)) {
          if (value !== undefined && value !== null) {
            const unit = metric.includes("memory") ? "MB" : metric.includes("cpu") ? "percent" : metric === "max_concurrent" ? "agents" : "unit";
            insertBenchmarkResult(runId, metric === "peak_memory_mb" ? "peak_memory" : metric === "cpu_avg_percent" ? "cpu_avg" : metric, value, unit, "resource");
          }
        }
      }

      // Insert overall score
      if (body.overall_score !== undefined) {
        insertBenchmarkResult(runId, "overall_score", body.overall_score, "score", "resource");
      }

      // Update compatibility_verdicts if cold_start or warm_response present
      const coldStart = body.results.latency?.cold_start_ms;
      const warmResponse = body.results.latency?.warm_response_ms;
      if (coldStart !== undefined || warmResponse !== undefined) {
        const existing = db().prepare(
          "SELECT id FROM compatibility_verdicts WHERE device_id = ? AND fork_id = ?"
        ).get(device.id, fork.id) as { id: number } | undefined;

        if (existing) {
          if (coldStart !== undefined) {
            db().prepare("UPDATE compatibility_verdicts SET cold_start_sec = ? WHERE id = ?")
              .run(coldStart / 1000, existing.id);
          }
          if (warmResponse !== undefined) {
            db().prepare("UPDATE compatibility_verdicts SET warm_response_sec = ? WHERE id = ?")
              .run(warmResponse / 1000, existing.id);
          }
        }
      }

      // Store raw JSON on the run
      db().prepare("UPDATE benchmark_runs SET raw_json = ? WHERE id = ?")
        .run(JSON.stringify(body), runId);

      completeBenchmarkRun(runId, "completed");

      return NextResponse.json({ run_id: runId, status: "completed" }, { status: 201 });
    } catch (err) {
      completeBenchmarkRun(runId, "failed", err instanceof Error ? err.message : "Unknown error");
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
    // Rate limit: 60 requests per minute per IP
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

    const device = getDeviceBySlug(deviceSlug);
    if (!device) {
      return NextResponse.json({ error: `Device not found: ${deviceSlug}` }, { status: 404 });
    }

    const fork = getForkBySlug(forkSlug);
    if (!fork) {
      return NextResponse.json({ error: `Fork not found: ${forkSlug}` }, { status: 404 });
    }

    const summary = getLatestBenchmarkForDeviceFork(device.id, fork.id);
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
