/**
 * Fork Repository Verification Script
 *
 * Reads all forks from the database, checks their GitHub repos,
 * and verifies stored requirements against what the repos actually contain.
 *
 * Usage:
 *   npx tsx scripts/verify-forks.ts              # Verify all forks
 *   npx tsx scripts/verify-forks.ts --slug openclaw  # Verify one fork
 *   npx tsx scripts/verify-forks.ts --fix         # Auto-fix discrepancies
 *
 * Set GITHUB_TOKEN env var to avoid rate limiting (60 req/hr unauthenticated).
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// ---------- CLI args ----------
const args = process.argv.slice(2);
const fixMode = args.includes("--fix");
const slugIndex = args.indexOf("--slug");
const targetSlug = slugIndex !== -1 ? args[slugIndex + 1] : null;

// ---------- DB setup ----------
const DB_PATH = path.join(process.cwd(), "data", "openclaw.db");

if (!fs.existsSync(DB_PATH)) {
  console.error("Database not found at", DB_PATH);
  console.error("Run the dev server first to initialize the database.");
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Ensure fork_verifications table exists
const schemaPath = path.join(process.cwd(), "src/lib/schema.sql");
const schema = fs.readFileSync(schemaPath, "utf-8");
db.exec(schema);

// ---------- Types ----------
type Fork = {
  id: number;
  slug: string;
  name: string;
  github_url: string | null;
  github_stars: number;
  min_ram_mb: number;
  min_cpu_cores: number;
  min_storage_mb: number;
  language: string | null;
  features: string;
};

type Discrepancy = {
  field: string;
  stored: unknown;
  detected: unknown;
};

type VerificationResult = {
  fork: Fork;
  repo_accessible: boolean;
  repo_stars: number | null;
  detected_language: string | null;
  detected_min_ram_mb: number | null;
  detected_features: string[];
  readme_mentions: Record<string, string>;
  discrepancies: Discrepancy[];
  status: "verified" | "discrepancy" | "inaccessible";
};

// ---------- GitHub API helpers ----------
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const BASE_HEADERS: Record<string, string> = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "ciroc-fork-verifier/1.0",
};
if (GITHUB_TOKEN) {
  BASE_HEADERS["Authorization"] = `Bearer ${GITHUB_TOKEN}`;
}

let requestCount = 0;
let rateLimitRemaining = 60;

async function ghFetch(url: string): Promise<Response> {
  requestCount++;
  const resp = await fetch(url, { headers: BASE_HEADERS });

  const remaining = resp.headers.get("x-ratelimit-remaining");
  if (remaining) rateLimitRemaining = parseInt(remaining, 10);

  if (resp.status === 403 && rateLimitRemaining <= 0) {
    const resetTime = resp.headers.get("x-ratelimit-reset");
    const resetDate = resetTime ? new Date(parseInt(resetTime, 10) * 1000) : null;
    console.error(`\n  Rate limited! Resets at ${resetDate?.toISOString() ?? "unknown"}`);
    console.error("  Set GITHUB_TOKEN env var for 5,000 req/hr limit.");
    throw new Error("RATE_LIMITED");
  }

  return resp;
}

function extractOwnerRepo(githubUrl: string): string | null {
  const match = githubUrl.match(/github\.com\/([^/]+\/[^/]+)/);
  return match ? match[1].replace(/\.git$/, "") : null;
}

// ---------- Language detection ----------
const LANG_FILE_MAP: Record<string, string[]> = {
  TypeScript: ["package.json", "tsconfig.json"],
  JavaScript: ["package.json"],
  Python: ["requirements.txt", "pyproject.toml", "setup.py", "Pipfile"],
  Go: ["go.mod", "go.sum"],
  Rust: ["Cargo.toml"],
  C: ["CMakeLists.txt", "Makefile"],
  "C++": ["CMakeLists.txt", "Makefile"],
  Swift: ["Package.swift"],
  Elixir: ["mix.exs"],
};

async function detectLanguageFromFiles(ownerRepo: string): Promise<string | null> {
  // Use the GitHub Languages API first
  try {
    const resp = await ghFetch(`https://api.github.com/repos/${ownerRepo}/languages`);
    if (resp.ok) {
      const languages = (await resp.json()) as Record<string, number>;
      const entries = Object.entries(languages);
      if (entries.length > 0) {
        entries.sort((a, b) => b[1] - a[1]);
        return entries[0][0];
      }
    }
  } catch {
    // Fall through to file-based detection
  }

  // Fallback: check for known files
  for (const [lang, files] of Object.entries(LANG_FILE_MAP)) {
    for (const file of files) {
      try {
        const resp = await ghFetch(
          `https://api.github.com/repos/${ownerRepo}/contents/${file}`
        );
        if (resp.ok) {
          // Special case: package.json could be JS or TS
          if (file === "package.json") {
            const tsResp = await ghFetch(
              `https://api.github.com/repos/${ownerRepo}/contents/tsconfig.json`
            );
            if (tsResp.ok) return "TypeScript";
            return "JavaScript";
          }
          return lang;
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

// ---------- README parsing ----------
const RAM_PATTERNS = [
  /(\d+)\s*(?:MB|mb)\s*(?:of\s+)?(?:RAM|memory|ram)/i,
  /(?:RAM|memory|ram)\s*[:=]\s*(\d+)\s*(?:MB|mb)/i,
  /(?:minimum|min|at\s+least|requires?)\s*(\d+)\s*(?:MB|mb)/i,
  /(\d+)\s*(?:GB|gb)\s*(?:of\s+)?(?:RAM|memory|ram)/i,
  /(?:RAM|memory|ram)\s*[:=]\s*(\d+)\s*(?:GB|gb)/i,
];

const CPU_PATTERNS = [
  /(\d+)\s*(?:CPU\s+)?core/i,
  /(\d+)\s*vCPU/i,
  /(?:CPU|core)s?\s*[:=]\s*(\d+)/i,
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
  "supervision tree",
  "LiveView",
  "Core ML",
  "Siri",
  "iCloud",
  "Docker",
  "Kubernetes",
  "Telegram",
  "WhatsApp",
  "Discord",
  "Slack",
  "background agents",
];

function parseReadme(content: string): { ram_mb: number | null; cpu_cores: number | null; mentions: Record<string, string>; features: string[] } {
  const mentions: Record<string, string> = {};
  let ram_mb: number | null = null;
  let cpu_cores: number | null = null;
  const features: string[] = [];

  // Extract RAM mentions
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

  // Extract CPU mentions
  for (const pattern of CPU_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      cpu_cores = parseInt(match[1] || match[2], 10);
      mentions["cpu"] = match[0];
      break;
    }
  }

  // Extract feature mentions
  for (const keyword of FEATURE_KEYWORDS) {
    if (content.toLowerCase().includes(keyword.toLowerCase())) {
      features.push(keyword);
      mentions[`feature_${keyword}`] = keyword;
    }
  }

  return { ram_mb, cpu_cores, mentions, features };
}

// ---------- Dockerfile parsing ----------
function parseDockerfile(content: string): { ram_hint_mb: number | null } {
  let ram_hint_mb: number | null = null;

  // Look for memory limits in docker compose or dockerfile
  const memMatch = content.match(/mem_limit\s*[:=]\s*(\d+)([mMgG])/);
  if (memMatch) {
    const value = parseInt(memMatch[1], 10);
    const unit = memMatch[2].toLowerCase();
    ram_hint_mb = unit === "g" ? value * 1024 : value;
  }

  // Look for --memory flags
  const memFlagMatch = content.match(/--memory[= ](\d+)([mMgG])/);
  if (memFlagMatch) {
    const value = parseInt(memFlagMatch[1], 10);
    const unit = memFlagMatch[2].toLowerCase();
    ram_hint_mb = unit === "g" ? value * 1024 : value;
  }

  return { ram_hint_mb };
}

// ---------- Main verification ----------
async function verifyFork(fork: Fork): Promise<VerificationResult> {
  const result: VerificationResult = {
    fork,
    repo_accessible: false,
    repo_stars: null,
    detected_language: null,
    detected_min_ram_mb: null,
    detected_features: [],
    readme_mentions: {},
    discrepancies: [],
    status: "inaccessible",
  };

  if (!fork.github_url) {
    console.log(`  Skipping ${fork.name}: no github_url`);
    return result;
  }

  const ownerRepo = extractOwnerRepo(fork.github_url);
  if (!ownerRepo) {
    console.log(`  Skipping ${fork.name}: couldn't parse github_url "${fork.github_url}"`);
    return result;
  }

  // 1. Check repo existence and get metadata
  try {
    const repoResp = await ghFetch(`https://api.github.com/repos/${ownerRepo}`);
    if (!repoResp.ok) {
      console.log(`  ${fork.name}: repo not accessible (${repoResp.status})`);
      result.status = "inaccessible";
      return result;
    }

    const repoData = (await repoResp.json()) as {
      stargazers_count: number;
      language: string | null;
    };

    result.repo_accessible = true;
    result.repo_stars = repoData.stargazers_count;
    result.detected_language = repoData.language;

    // Check star count discrepancy (allow 20% drift)
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
  } catch (e) {
    if (e instanceof Error && e.message === "RATE_LIMITED") throw e;
    console.log(`  ${fork.name}: error checking repo: ${e}`);
    result.status = "inaccessible";
    return result;
  }

  // 2. Try to detect language from files (more accurate than repo metadata)
  try {
    const detectedLang = await detectLanguageFromFiles(ownerRepo);
    if (detectedLang) {
      result.detected_language = detectedLang;
      // Re-check language discrepancy with file-based detection
      if (fork.language && detectedLang !== fork.language) {
        // Remove old language discrepancy if any
        result.discrepancies = result.discrepancies.filter(d => d.field !== "language");
        result.discrepancies.push({
          field: "language",
          stored: fork.language,
          detected: detectedLang,
        });
      } else {
        // Language matches, remove discrepancy
        result.discrepancies = result.discrepancies.filter(d => d.field !== "language");
      }
    }
  } catch (e) {
    if (e instanceof Error && e.message === "RATE_LIMITED") throw e;
    // Non-fatal
  }

  // 3. Read README.md
  try {
    const readmeResp = await ghFetch(
      `https://api.github.com/repos/${ownerRepo}/readme`
    );
    if (readmeResp.ok) {
      const readmeData = (await readmeResp.json()) as { content: string; encoding: string };
      const readmeContent = readmeData.encoding === "base64"
        ? Buffer.from(readmeData.content, "base64").toString("utf-8")
        : readmeData.content;

      const parsed = parseReadme(readmeContent);
      result.readme_mentions = parsed.mentions;
      result.detected_features = parsed.features;

      if (parsed.ram_mb !== null) {
        result.detected_min_ram_mb = parsed.ram_mb;
        // Only flag if significantly different (> 50% off)
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
  } catch (e) {
    if (e instanceof Error && e.message === "RATE_LIMITED") throw e;
    // Non-fatal
  }

  // 4. Check for special requirement files
  const specialFiles = ["REQUIREMENTS.md", "HARDWARE.md", "docs/requirements.md", "docs/hardware.md"];
  for (const file of specialFiles) {
    try {
      const resp = await ghFetch(
        `https://api.github.com/repos/${ownerRepo}/contents/${file}`
      );
      if (resp.ok) {
        const data = (await resp.json()) as { content: string; encoding: string };
        const content = data.encoding === "base64"
          ? Buffer.from(data.content, "base64").toString("utf-8")
          : data.content;
        const parsed = parseReadme(content);

        // Merge mentions
        for (const [key, val] of Object.entries(parsed.mentions)) {
          result.readme_mentions[`${file}:${key}`] = val;
        }

        // Merge features (deduplicate)
        for (const feature of parsed.features) {
          if (!result.detected_features.includes(feature)) {
            result.detected_features.push(feature);
          }
        }

        // Use RAM from requirements if not already detected
        if (result.detected_min_ram_mb === null && parsed.ram_mb !== null) {
          result.detected_min_ram_mb = parsed.ram_mb;
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message === "RATE_LIMITED") throw e;
      continue;
    }
  }

  // 5. Check for Dockerfile
  try {
    const dockerResp = await ghFetch(
      `https://api.github.com/repos/${ownerRepo}/contents/Dockerfile`
    );
    if (dockerResp.ok) {
      const data = (await dockerResp.json()) as { content: string; encoding: string };
      const content = data.encoding === "base64"
        ? Buffer.from(data.content, "base64").toString("utf-8")
        : data.content;
      const dockerParsed = parseDockerfile(content);
      if (dockerParsed.ram_hint_mb !== null && result.detected_min_ram_mb === null) {
        result.detected_min_ram_mb = dockerParsed.ram_hint_mb;
      }
    }
  } catch (e) {
    if (e instanceof Error && e.message === "RATE_LIMITED") throw e;
    // Non-fatal
  }

  // Also check docker-compose.yml
  try {
    for (const composeFile of ["docker-compose.yml", "docker-compose.yaml", "compose.yml"]) {
      const resp = await ghFetch(
        `https://api.github.com/repos/${ownerRepo}/contents/${composeFile}`
      );
      if (resp.ok) {
        const data = (await resp.json()) as { content: string; encoding: string };
        const content = data.encoding === "base64"
          ? Buffer.from(data.content, "base64").toString("utf-8")
          : data.content;
        const dockerParsed = parseDockerfile(content);
        if (dockerParsed.ram_hint_mb !== null && result.detected_min_ram_mb === null) {
          result.detected_min_ram_mb = dockerParsed.ram_hint_mb;
        }
        break;
      }
    }
  } catch (e) {
    if (e instanceof Error && e.message === "RATE_LIMITED") throw e;
    // Non-fatal
  }

  // Determine final status
  result.status = result.discrepancies.length > 0 ? "discrepancy" : "verified";

  return result;
}

// ---------- Save to DB ----------
function saveVerification(result: VerificationResult): void {
  const insertStmt = db.prepare(`
    INSERT INTO fork_verifications (
      fork_id, repo_accessible, repo_stars, detected_language,
      detected_min_ram_mb, detected_features, readme_mentions,
      discrepancies, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run(
    result.fork.id,
    result.repo_accessible ? 1 : 0,
    result.repo_stars,
    result.detected_language,
    result.detected_min_ram_mb,
    result.detected_features.length > 0 ? JSON.stringify(result.detected_features) : null,
    Object.keys(result.readme_mentions).length > 0 ? JSON.stringify(result.readme_mentions) : null,
    result.discrepancies.length > 0 ? JSON.stringify(result.discrepancies) : null,
    result.status
  );
}

function applyFixes(result: VerificationResult): void {
  if (!fixMode || result.discrepancies.length === 0) return;

  for (const disc of result.discrepancies) {
    if (disc.detected === null || disc.detected === undefined) continue;

    switch (disc.field) {
      case "github_stars":
        db.prepare("UPDATE forks SET github_stars = ? WHERE id = ?").run(
          disc.detected,
          result.fork.id
        );
        console.log(`    Fixed github_stars: ${disc.stored} -> ${disc.detected}`);
        break;
      case "language":
        db.prepare("UPDATE forks SET language = ? WHERE id = ?").run(
          disc.detected,
          result.fork.id
        );
        console.log(`    Fixed language: ${disc.stored} -> ${disc.detected}`);
        break;
      case "min_ram_mb":
        db.prepare("UPDATE forks SET min_ram_mb = ? WHERE id = ?").run(
          disc.detected,
          result.fork.id
        );
        console.log(`    Fixed min_ram_mb: ${disc.stored} -> ${disc.detected}`);
        break;
    }
  }
}

// ---------- Report ----------
function printReport(results: VerificationResult[]): void {
  console.log("\n" + "=".repeat(70));
  console.log("FORK VERIFICATION REPORT");
  console.log("=".repeat(70));

  const verified = results.filter(r => r.status === "verified");
  const discrepancies = results.filter(r => r.status === "discrepancy");
  const inaccessible = results.filter(r => r.status === "inaccessible");

  console.log(`\nSummary: ${verified.length} verified, ${discrepancies.length} with discrepancies, ${inaccessible.length} inaccessible`);
  console.log(`GitHub API requests used: ${requestCount} (${rateLimitRemaining} remaining)\n`);

  if (verified.length > 0) {
    console.log("VERIFIED:");
    for (const r of verified) {
      console.log(`  [OK] ${r.fork.name} - ${r.repo_stars} stars, ${r.detected_language}`);
    }
    console.log();
  }

  if (discrepancies.length > 0) {
    console.log("DISCREPANCIES:");
    for (const r of discrepancies) {
      console.log(`  [!!] ${r.fork.name}:`);
      for (const d of r.discrepancies) {
        console.log(`       ${d.field}: stored=${JSON.stringify(d.stored)} detected=${JSON.stringify(d.detected)}`);
      }
    }
    console.log();
  }

  if (inaccessible.length > 0) {
    console.log("INACCESSIBLE:");
    for (const r of inaccessible) {
      console.log(`  [X] ${r.fork.name} - ${r.fork.github_url ?? "no URL"}`);
    }
    console.log();
  }

  if (fixMode) {
    console.log("(--fix mode enabled: discrepancies have been corrected in the database)");
  } else if (discrepancies.length > 0) {
    console.log("Tip: Run with --fix to auto-correct discrepancies in the database.");
  }
}

// ---------- Main ----------
async function main(): Promise<void> {
  console.log("Fork Repository Verification");
  console.log(`Database: ${DB_PATH}`);
  console.log(`Mode: ${fixMode ? "VERIFY + FIX" : "VERIFY ONLY"}`);
  if (targetSlug) console.log(`Target: ${targetSlug}`);
  if (GITHUB_TOKEN) console.log("Using GITHUB_TOKEN for authentication");
  console.log();

  let forks: Fork[];
  if (targetSlug) {
    const fork = db.prepare("SELECT * FROM forks WHERE slug = ?").get(targetSlug) as Fork | undefined;
    if (!fork) {
      console.error(`Fork not found: ${targetSlug}`);
      process.exit(1);
    }
    forks = [fork];
  } else {
    forks = db.prepare("SELECT * FROM forks ORDER BY name").all() as Fork[];
  }

  console.log(`Verifying ${forks.length} fork(s)...\n`);

  const results: VerificationResult[] = [];

  for (const fork of forks) {
    console.log(`Checking ${fork.name}...`);
    try {
      const result = await verifyFork(fork);
      results.push(result);
      saveVerification(result);
      if (fixMode) applyFixes(result);
    } catch (e) {
      if (e instanceof Error && e.message === "RATE_LIMITED") {
        console.error("\nStopping due to rate limit. Run again later or set GITHUB_TOKEN.");
        break;
      }
      console.error(`  Error verifying ${fork.name}:`, e);
      results.push({
        fork,
        repo_accessible: false,
        repo_stars: null,
        detected_language: null,
        detected_min_ram_mb: null,
        detected_features: [],
        readme_mentions: {},
        discrepancies: [],
        status: "inaccessible",
      });
    }
  }

  printReport(results);
  db.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
