import { NextRequest, NextResponse } from "next/server";
import {
  getAllForks,
  getForkBySlug,
  getAllForkVerifications,
  insertForkVerification,
} from "@/lib/queries";
import type { Fork } from "@/lib/queries";

// ---------- GitHub API helpers ----------

function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "ciroc-fork-verifier/1.0",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

function extractOwnerRepo(githubUrl: string): string | null {
  const match = githubUrl.match(/github\.com\/([^/]+\/[^/]+)/);
  return match ? match[1].replace(/\.git$/, "") : null;
}

// ---------- README parsing ----------

const RAM_PATTERNS = [
  /(\d+)\s*(?:MB|mb)\s*(?:of\s+)?(?:RAM|memory|ram)/i,
  /(?:RAM|memory|ram)\s*[:=]\s*(\d+)\s*(?:MB|mb)/i,
  /(?:minimum|min|at\s+least|requires?)\s*(\d+)\s*(?:MB|mb)/i,
  /(\d+)\s*(?:GB|gb)\s*(?:of\s+)?(?:RAM|memory|ram)/i,
];

const FEATURE_KEYWORDS = [
  "persistent memory",
  "shell access",
  "web browsing",
  "container isolation",
  "sandboxing",
  "WASM",
  "WebAssembly",
  "serverless",
  "MCP",
  "hot code reloading",
  "GPIO",
  "MQTT",
  "OTP",
  "Telegram",
  "WhatsApp",
  "Discord",
  "Slack",
  "Docker",
  "Kubernetes",
  "background agents",
];

function parseReadmeContent(content: string): {
  ram_mb: number | null;
  mentions: Record<string, string>;
  features: string[];
} {
  const mentions: Record<string, string> = {};
  let ram_mb: number | null = null;
  const features: string[] = [];

  for (const pattern of RAM_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      const value = parseInt(match[1], 10);
      const isGb = pattern.source.includes("GB|gb");
      ram_mb = isGb ? value * 1024 : value;
      mentions["ram"] = match[0];
      break;
    }
  }

  for (const keyword of FEATURE_KEYWORDS) {
    if (content.toLowerCase().includes(keyword.toLowerCase())) {
      features.push(keyword);
    }
  }

  return { ram_mb, mentions, features };
}

// ---------- Single fork verification ----------

type Discrepancy = {
  field: string;
  stored: unknown;
  detected: unknown;
};

async function verifyOneFork(fork: Fork): Promise<{
  repo_accessible: boolean;
  repo_stars: number | null;
  detected_language: string | null;
  detected_min_ram_mb: number | null;
  detected_features: string[];
  readme_mentions: Record<string, string>;
  discrepancies: Discrepancy[];
  status: "verified" | "discrepancy" | "inaccessible";
}> {
  const result = {
    repo_accessible: false,
    repo_stars: null as number | null,
    detected_language: null as string | null,
    detected_min_ram_mb: null as number | null,
    detected_features: [] as string[],
    readme_mentions: {} as Record<string, string>,
    discrepancies: [] as Discrepancy[],
    status: "inaccessible" as "verified" | "discrepancy" | "inaccessible",
  };

  if (!fork.github_url) return result;

  const ownerRepo = extractOwnerRepo(fork.github_url);
  if (!ownerRepo) return result;

  const headers = getGitHubHeaders();

  // Check repo existence
  try {
    const repoResp = await fetch(`https://api.github.com/repos/${ownerRepo}`, { headers });
    if (!repoResp.ok) return result;

    const repoData = (await repoResp.json()) as {
      stargazers_count: number;
      language: string | null;
    };

    result.repo_accessible = true;
    result.repo_stars = repoData.stargazers_count;
    result.detected_language = repoData.language;

    // Check star count discrepancy
    if (fork.github_stars > 0 && result.repo_stars !== null) {
      const drift = Math.abs(fork.github_stars - result.repo_stars) / fork.github_stars;
      if (drift > 0.2) {
        result.discrepancies.push({
          field: "github_stars",
          stored: fork.github_stars,
          detected: result.repo_stars,
        });
      }
    }

    // Check language
    if (result.detected_language && fork.language && result.detected_language !== fork.language) {
      result.discrepancies.push({
        field: "language",
        stored: fork.language,
        detected: result.detected_language,
      });
    }
  } catch {
    return result;
  }

  // Read README
  try {
    const readmeResp = await fetch(`https://api.github.com/repos/${ownerRepo}/readme`, { headers });
    if (readmeResp.ok) {
      const readmeData = (await readmeResp.json()) as { content: string; encoding: string };
      const readmeContent = readmeData.encoding === "base64"
        ? Buffer.from(readmeData.content, "base64").toString("utf-8")
        : readmeData.content;

      const parsed = parseReadmeContent(readmeContent);
      result.readme_mentions = parsed.mentions;
      result.detected_features = parsed.features;

      if (parsed.ram_mb !== null) {
        result.detected_min_ram_mb = parsed.ram_mb;
        const storedRam = fork.min_ram_mb;
        if (storedRam > 0 && Math.abs(storedRam - parsed.ram_mb) / storedRam > 0.5) {
          result.discrepancies.push({
            field: "min_ram_mb",
            stored: storedRam,
            detected: parsed.ram_mb,
          });
        }
      }
    }
  } catch {
    // Non-fatal
  }

  result.status = result.discrepancies.length > 0 ? "discrepancy" : "verified";
  return result;
}

// ---------- POST: Trigger verification ----------

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { fork_slug?: string };

    let forksToVerify: Fork[];

    if (body.fork_slug) {
      const fork = getForkBySlug(body.fork_slug);
      if (!fork) {
        return NextResponse.json(
          { error: `Fork not found: ${body.fork_slug}` },
          { status: 404 }
        );
      }
      forksToVerify = [fork];
    } else {
      forksToVerify = getAllForks();
    }

    const results = [];

    for (const fork of forksToVerify) {
      const verification = await verifyOneFork(fork);
      const verificationId = insertForkVerification(fork.id, {
        repo_accessible: verification.repo_accessible,
        repo_stars: verification.repo_stars,
        detected_language: verification.detected_language,
        detected_min_ram_mb: verification.detected_min_ram_mb,
        detected_features: verification.detected_features.length > 0 ? verification.detected_features : null,
        readme_mentions: Object.keys(verification.readme_mentions).length > 0 ? verification.readme_mentions : null,
        discrepancies: verification.discrepancies,
        status: verification.status,
      });

      results.push({
        id: verificationId,
        fork_slug: fork.slug,
        fork_name: fork.name,
        ...verification,
      });
    }

    return NextResponse.json({ results }, { status: 201 });
  } catch (err) {
    console.error("Verification error:", err);
    return NextResponse.json(
      { error: "Failed to run verification" },
      { status: 500 }
    );
  }
}

// ---------- GET: Return latest results ----------

export async function GET() {
  try {
    const verifications = getAllForkVerifications();
    const forks = getAllForks();

    // Build a map of fork_id -> latest verification
    const verificationMap = new Map(
      verifications.map(v => [v.fork_id, v])
    );

    const results = forks.map(fork => ({
      fork_slug: fork.slug,
      fork_name: fork.name,
      github_url: fork.github_url,
      verification: verificationMap.get(fork.id) ?? null,
    }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Verification fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch verifications" },
      { status: 500 }
    );
  }
}
