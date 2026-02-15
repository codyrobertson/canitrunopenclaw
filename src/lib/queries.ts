import { db } from "./db";
import { seedDatabase } from "./seed";

let initialized = false;
function ensureDb() {
  if (!initialized) {
    seedDatabase();
    initialized = true;
  }
}

export type Device = {
  id: number;
  slug: string;
  name: string;
  category: string;
  cpu: string | null;
  ram_gb: number;
  storage: string | null;
  gpu: string | null;
  power_watts: number | null;
  price_usd: number | null;
  price_type: string;
  image_url: string | null;
  buy_link: string | null;
  description: string | null;
};

export type Fork = {
  id: number;
  slug: string;
  name: string;
  github_url: string | null;
  description: string | null;
  tagline: string | null;
  creator: string | null;
  created_year: number | null;
  github_stars: number;
  maturity: "alpha" | "beta" | "stable" | "archived";
  last_commit_date: string | null;
  min_ram_mb: number;
  min_cpu_cores: number;
  min_storage_mb: number;
  language: string | null;
  codebase_size_lines: number | null;
  license: string | null;
  features: string;
};

export type Verdict = {
  id: number;
  device_id: number;
  fork_id: number;
  verdict: "RUNS_GREAT" | "RUNS_OK" | "BARELY_RUNS" | "WONT_RUN";
  notes: string | null;
  cold_start_sec: number | null;
  warm_response_sec: number | null;
};

export type DeviceWithScore = Device & {
  avg_rating: number | null;
  rating_count: number;
  best_verdict: string | null;
  score: number;
};

export type Comment = {
  id: number;
  device_id: number;
  fork_id: number | null;
  user_id: number;
  content: string;
  created_at: string;
  username: string;
  avatar_url: string | null;
};

export function getDevicesRanked(filters?: {
  category?: string;
  minRam?: number;
  maxPrice?: number;
  forkSlug?: string;
  search?: string;
}): DeviceWithScore[] {
  ensureDb();
  let where = "WHERE 1=1";
  const params: Record<string, unknown> = {};
  if (filters?.category) { where += " AND d.category = @category"; params.category = filters.category; }
  if (filters?.minRam) { where += " AND d.ram_gb >= @minRam"; params.minRam = filters.minRam; }
  if (filters?.maxPrice) { where += " AND d.price_usd <= @maxPrice"; params.maxPrice = filters.maxPrice; }
  if (filters?.forkSlug) { where += " AND cv.fork_id = (SELECT id FROM forks WHERE slug = @forkSlug)"; params.forkSlug = filters.forkSlug; }
  if (filters?.search) { where += " AND (d.name LIKE @search OR d.cpu LIKE @search OR d.description LIKE @search)"; params.search = `%${filters.search}%`; }

  const sql = `
    SELECT d.*,
      COALESCE(AVG(ur.stars), 0) as avg_rating,
      COUNT(DISTINCT ur.id) as rating_count,
      (SELECT cv2.verdict FROM compatibility_verdicts cv2 WHERE cv2.device_id = d.id ORDER BY CASE cv2.verdict WHEN 'RUNS_GREAT' THEN 4 WHEN 'RUNS_OK' THEN 3 WHEN 'BARELY_RUNS' THEN 2 WHEN 'WONT_RUN' THEN 1 END DESC LIMIT 1) as best_verdict,
      COALESCE(AVG(ur.stars), 0) * 0.6 +
      COALESCE((SELECT CASE cv3.verdict WHEN 'RUNS_GREAT' THEN 4 WHEN 'RUNS_OK' THEN 3 WHEN 'BARELY_RUNS' THEN 2 WHEN 'WONT_RUN' THEN 1 END FROM compatibility_verdicts cv3 WHERE cv3.device_id = d.id ORDER BY CASE cv3.verdict WHEN 'RUNS_GREAT' THEN 4 WHEN 'RUNS_OK' THEN 3 WHEN 'BARELY_RUNS' THEN 2 WHEN 'WONT_RUN' THEN 1 END DESC LIMIT 1), 0) * 0.4 as score
    FROM devices d
    LEFT JOIN compatibility_verdicts cv ON cv.device_id = d.id
    LEFT JOIN user_ratings ur ON ur.device_id = d.id
    ${where}
    GROUP BY d.id
    ORDER BY score DESC, d.price_usd ASC
  `;
  return db().prepare(sql).all(params) as DeviceWithScore[];
}

export function getDeviceBySlug(slug: string): Device | undefined {
  ensureDb();
  return db().prepare("SELECT * FROM devices WHERE slug = ?").get(slug) as Device | undefined;
}

export function getVerdictsByDevice(deviceId: number): (Verdict & { fork_name: string; fork_slug: string })[] {
  ensureDb();
  return db().prepare(`
    SELECT cv.*, f.name as fork_name, f.slug as fork_slug
    FROM compatibility_verdicts cv JOIN forks f ON f.id = cv.fork_id
    WHERE cv.device_id = ?
    ORDER BY CASE cv.verdict WHEN 'RUNS_GREAT' THEN 1 WHEN 'RUNS_OK' THEN 2 WHEN 'BARELY_RUNS' THEN 3 WHEN 'WONT_RUN' THEN 4 END
  `).all(deviceId) as (Verdict & { fork_name: string; fork_slug: string })[];
}

export function getAllForks(): Fork[] {
  ensureDb();
  return db().prepare("SELECT * FROM forks ORDER BY min_ram_mb ASC").all() as Fork[];
}

export function getForkBySlug(slug: string): Fork | undefined {
  ensureDb();
  return db().prepare("SELECT * FROM forks WHERE slug = ?").get(slug) as Fork | undefined;
}

export function getDevicesByFork(forkId: number): (Device & { verdict: string; notes: string | null })[] {
  ensureDb();
  return db().prepare(`
    SELECT d.*, cv.verdict, cv.notes
    FROM devices d JOIN compatibility_verdicts cv ON cv.device_id = d.id
    WHERE cv.fork_id = ?
    ORDER BY CASE cv.verdict WHEN 'RUNS_GREAT' THEN 1 WHEN 'RUNS_OK' THEN 2 WHEN 'BARELY_RUNS' THEN 3 WHEN 'WONT_RUN' THEN 4 END
  `).all(forkId) as (Device & { verdict: string; notes: string | null })[];
}

export function getDeviceRatings(deviceId: number, forkId?: number) {
  ensureDb();
  if (forkId) {
    return db().prepare("SELECT AVG(stars) as avg, COUNT(*) as count FROM user_ratings WHERE device_id = ? AND fork_id = ?").get(deviceId, forkId) as { avg: number | null; count: number };
  }
  return db().prepare("SELECT AVG(stars) as avg, COUNT(*) as count FROM user_ratings WHERE device_id = ?").get(deviceId) as { avg: number | null; count: number };
}

export function upsertRating(deviceId: number, forkId: number, userId: number, stars: number) {
  ensureDb();
  db().prepare("INSERT INTO user_ratings (device_id, fork_id, user_id, stars) VALUES (?, ?, ?, ?) ON CONFLICT(device_id, fork_id, user_id) DO UPDATE SET stars = excluded.stars").run(deviceId, forkId, userId, stars);
}

export function getUserRating(deviceId: number, forkId: number, userId: number): number | null {
  ensureDb();
  const row = db().prepare("SELECT stars FROM user_ratings WHERE device_id = ? AND fork_id = ? AND user_id = ?").get(deviceId, forkId, userId) as { stars: number } | undefined;
  return row?.stars ?? null;
}

export function getCommentsByDevice(deviceId: number): Comment[] {
  ensureDb();
  return db().prepare(`
    SELECT c.*, u.username, u.avatar_url
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.device_id = ?
    ORDER BY c.created_at DESC
  `).all(deviceId) as Comment[];
}

export function addComment(deviceId: number, forkId: number | null, userId: number, content: string) {
  ensureDb();
  db().prepare("INSERT INTO comments (device_id, fork_id, user_id, content) VALUES (?, ?, ?, ?)").run(deviceId, forkId, userId, content);
}

export function upsertUser(githubId: string, username: string, avatarUrl: string | null): number {
  ensureDb();
  db().prepare("INSERT INTO users (github_id, username, avatar_url) VALUES (?, ?, ?) ON CONFLICT(github_id) DO UPDATE SET username = excluded.username, avatar_url = excluded.avatar_url").run(githubId, username, avatarUrl);
  const user = db().prepare("SELECT id FROM users WHERE github_id = ?").get(githubId) as { id: number };
  return user.id;
}

export function getCategories(): string[] {
  ensureDb();
  return (db().prepare("SELECT DISTINCT category FROM devices ORDER BY category").all() as { category: string }[]).map(r => r.category);
}

export function getSimilarDevices(device: Device, limit = 4): DeviceWithScore[] {
  ensureDb();
  const sql = `
    SELECT d.*,
      COALESCE(AVG(ur.stars), 0) as avg_rating,
      COUNT(DISTINCT ur.id) as rating_count,
      (SELECT cv2.verdict FROM compatibility_verdicts cv2 WHERE cv2.device_id = d.id ORDER BY CASE cv2.verdict WHEN 'RUNS_GREAT' THEN 4 WHEN 'RUNS_OK' THEN 3 WHEN 'BARELY_RUNS' THEN 2 WHEN 'WONT_RUN' THEN 1 END DESC LIMIT 1) as best_verdict,
      ABS(d.price_usd - @price) as price_diff
    FROM devices d
    LEFT JOIN compatibility_verdicts cv ON cv.device_id = d.id
    LEFT JOIN user_ratings ur ON ur.device_id = d.id
    WHERE d.id != @id AND d.category = @category
    GROUP BY d.id
    ORDER BY price_diff ASC
    LIMIT @limit
  `;
  const results = db().prepare(sql).all({ id: device.id, category: device.category, price: device.price_usd ?? 0, limit }) as (DeviceWithScore & { price_diff: number })[];
  if (results.length < limit) {
    const moreSQL = `
      SELECT d.*,
        COALESCE(AVG(ur.stars), 0) as avg_rating,
        COUNT(DISTINCT ur.id) as rating_count,
        (SELECT cv2.verdict FROM compatibility_verdicts cv2 WHERE cv2.device_id = d.id ORDER BY CASE cv2.verdict WHEN 'RUNS_GREAT' THEN 4 WHEN 'RUNS_OK' THEN 3 WHEN 'BARELY_RUNS' THEN 2 WHEN 'WONT_RUN' THEN 1 END DESC LIMIT 1) as best_verdict,
        0 as score
      FROM devices d
      LEFT JOIN compatibility_verdicts cv ON cv.device_id = d.id
      LEFT JOIN user_ratings ur ON ur.device_id = d.id
      WHERE d.id != @id AND d.category != @category
      GROUP BY d.id
      ORDER BY ABS(d.ram_gb - @ram) ASC
      LIMIT @limit
    `;
    const more = db().prepare(moreSQL).all({ id: device.id, category: device.category, ram: device.ram_gb, limit: limit - results.length }) as DeviceWithScore[];
    results.push(...(more as (DeviceWithScore & { price_diff: number })[]));
  }
  return results;
}

export function getAllDevices(): Device[] {
  ensureDb();
  return db().prepare("SELECT * FROM devices ORDER BY name ASC").all() as Device[];
}

export function getVerdictForDeviceAndFork(
  deviceSlug: string,
  forkSlug: string
): (Verdict & { device_name: string; device_slug: string; fork_name: string; fork_slug: string }) | undefined {
  ensureDb();
  return db().prepare(`
    SELECT cv.*, d.name as device_name, d.slug as device_slug, f.name as fork_name, f.slug as fork_slug
    FROM compatibility_verdicts cv
    JOIN devices d ON d.id = cv.device_id
    JOIN forks f ON f.id = cv.fork_id
    WHERE d.slug = ? AND f.slug = ?
  `).get(deviceSlug, forkSlug) as (Verdict & { device_name: string; device_slug: string; fork_name: string; fork_slug: string }) | undefined;
}

export function getAllVerdictCombinations(): { fork_slug: string; device_slug: string }[] {
  ensureDb();
  return db().prepare(`
    SELECT f.slug as fork_slug, d.slug as device_slug
    FROM compatibility_verdicts cv
    JOIN devices d ON d.id = cv.device_id
    JOIN forks f ON f.id = cv.fork_id
  `).all() as { fork_slug: string; device_slug: string }[];
}

export function getSimilarDevicesForFork(
  device: Device,
  forkId: number,
  limit = 4
): (Device & { verdict: string; notes: string | null })[] {
  ensureDb();
  return db().prepare(`
    SELECT d.*, cv.verdict, cv.notes
    FROM devices d
    JOIN compatibility_verdicts cv ON cv.device_id = d.id AND cv.fork_id = ?
    WHERE d.id != ? AND d.category = ?
    ORDER BY CASE cv.verdict WHEN 'RUNS_GREAT' THEN 1 WHEN 'RUNS_OK' THEN 2 WHEN 'BARELY_RUNS' THEN 3 WHEN 'WONT_RUN' THEN 4 END
    LIMIT ?
  `).all(forkId, device.id, device.category, limit) as (Device & { verdict: string; notes: string | null })[];
}

export type DeviceWithVerdict = Device & {
  verdict: string;
  notes: string | null;
  cold_start_sec: number | null;
  warm_response_sec: number | null;
};

export function getDevicesByCategoryForFork(
  category: string,
  forkSlug: string
): DeviceWithVerdict[] {
  ensureDb();
  return db().prepare(`
    SELECT d.*, cv.verdict, cv.notes, cv.cold_start_sec, cv.warm_response_sec
    FROM devices d
    JOIN compatibility_verdicts cv ON cv.device_id = d.id
    JOIN forks f ON f.id = cv.fork_id
    WHERE d.category = ? AND f.slug = ?
    ORDER BY CASE cv.verdict WHEN 'RUNS_GREAT' THEN 1 WHEN 'RUNS_OK' THEN 2 WHEN 'BARELY_RUNS' THEN 3 WHEN 'WONT_RUN' THEN 4 END,
    d.price_usd ASC
  `).all(category, forkSlug) as DeviceWithVerdict[];
}

export function getCategoryForkCombinations(): { category: string; fork_slug: string }[] {
  ensureDb();
  return db().prepare(`
    SELECT DISTINCT d.category, f.slug as fork_slug
    FROM compatibility_verdicts cv
    JOIN devices d ON d.id = cv.device_id
    JOIN forks f ON f.id = cv.fork_id
    ORDER BY d.category, f.slug
  `).all() as { category: string; fork_slug: string }[];
}

export function getComparisonPairs(): { slug1: string; slug2: string }[] {
  ensureDb();
  const pairs = db().prepare(`
    SELECT d1.slug as slug1, d2.slug as slug2
    FROM devices d1
    JOIN devices d2 ON d1.category = d2.category AND d1.id < d2.id
    JOIN compatibility_verdicts cv1 ON cv1.device_id = d1.id
    JOIN compatibility_verdicts cv2 ON cv2.device_id = d2.id
    WHERE cv1.fork_id = cv2.fork_id
    GROUP BY d1.slug, d2.slug
    HAVING COUNT(DISTINCT cv1.fork_id) >= 2
    ORDER BY d1.category, d1.name, d2.name
    LIMIT 200
  `).all() as { slug1: string; slug2: string }[];
  return pairs;
}

export type UserVerdict = {
  id: number;
  user_id: number;
  device_id: number;
  fork_id: number;
  verdict: "RUNS_GREAT" | "RUNS_OK" | "BARELY_RUNS" | "WONT_RUN";
  notes: string | null;
  evidence_url: string | null;
  verified: number;
  created_at: string;
  username: string;
  avatar_url: string | null;
  vote_count: number;
  fork_name: string;
  fork_slug: string;
};

export function getUserVerdictsByDevice(deviceId: number): UserVerdict[] {
  ensureDb();
  return db().prepare(`
    SELECT uv.*, u.username, u.avatar_url, f.name as fork_name, f.slug as fork_slug,
      COALESCE(SUM(vv.vote), 0) as vote_count
    FROM user_verdicts uv
    JOIN users u ON u.id = uv.user_id
    JOIN forks f ON f.id = uv.fork_id
    LEFT JOIN verdict_votes vv ON vv.user_verdict_id = uv.id
    WHERE uv.device_id = ?
    GROUP BY uv.id
    ORDER BY vote_count DESC, uv.created_at DESC
  `).all(deviceId) as UserVerdict[];
}

export function submitUserVerdict(
  userId: number,
  deviceId: number,
  forkId: number,
  verdict: string,
  notes: string | null,
  evidenceUrl: string | null
): void {
  ensureDb();
  db().prepare(`
    INSERT INTO user_verdicts (user_id, device_id, fork_id, verdict, notes, evidence_url)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, device_id, fork_id) DO UPDATE SET
      verdict = excluded.verdict,
      notes = excluded.notes,
      evidence_url = excluded.evidence_url,
      created_at = datetime('now')
  `).run(userId, deviceId, forkId, verdict, notes, evidenceUrl);
}

export function voteOnVerdict(userId: number, verdictId: number, vote: 1 | -1): void {
  ensureDb();
  db().prepare(`
    INSERT INTO verdict_votes (user_id, user_verdict_id, vote)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, user_verdict_id) DO UPDATE SET vote = excluded.vote
  `).run(userId, verdictId, vote);
}

export function getUserVerdictVotes(userId: number, deviceId: number): Record<number, number> {
  ensureDb();
  const rows = db().prepare(`
    SELECT vv.user_verdict_id, vv.vote
    FROM verdict_votes vv
    JOIN user_verdicts uv ON uv.id = vv.user_verdict_id
    WHERE vv.user_id = ? AND uv.device_id = ?
  `).all(userId, deviceId) as { user_verdict_id: number; vote: number }[];
  const votes: Record<number, number> = {};
  for (const r of rows) votes[r.user_verdict_id] = r.vote;
  return votes;
}

export function getNonWontRunVerdicts(): { fork_slug: string; device_slug: string }[] {
  ensureDb();
  return db().prepare(`
    SELECT f.slug as fork_slug, d.slug as device_slug
    FROM compatibility_verdicts cv
    JOIN devices d ON d.id = cv.device_id
    JOIN forks f ON f.id = cv.fork_id
    WHERE cv.verdict != 'WONT_RUN'
  `).all() as { fork_slug: string; device_slug: string }[];
}

// --- Benchmark types ---

export type BenchmarkRun = {
  id: number;
  device_id: number;
  fork_id: number;
  user_id: number | null;
  status: "running" | "completed" | "failed";
  docker_image: string | null;
  memory_limit_mb: number | null;
  cpu_limit: number | null;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
};

export type BenchmarkResult = {
  id: number;
  run_id: number;
  metric: string;
  value: number;
  unit: string;
  category: "latency" | "capability" | "resource";
  details: string | null;
};

export type BenchmarkSummary = {
  run_id: number;
  fork_name: string;
  fork_slug: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  cold_start_ms: number | null;
  warm_response_ms: number | null;
  peak_memory_mb: number | null;
  cpu_avg_percent: number | null;
  max_concurrent: number | null;
  capabilities_passed: number;
  capabilities_total: number;
  overall_score: number | null;
};

// --- Benchmark query functions ---

export function getBenchmarksByDevice(deviceId: number): BenchmarkSummary[] {
  ensureDb();
  return db().prepare(`
    SELECT
      br.id as run_id,
      f.name as fork_name,
      f.slug as fork_slug,
      br.status,
      br.started_at,
      br.completed_at,
      (SELECT bres.value FROM benchmark_results bres WHERE bres.run_id = br.id AND bres.metric = 'cold_start' LIMIT 1) as cold_start_ms,
      (SELECT bres.value FROM benchmark_results bres WHERE bres.run_id = br.id AND bres.metric = 'warm_response' LIMIT 1) as warm_response_ms,
      (SELECT bres.value FROM benchmark_results bres WHERE bres.run_id = br.id AND bres.metric = 'peak_memory' LIMIT 1) as peak_memory_mb,
      (SELECT bres.value FROM benchmark_results bres WHERE bres.run_id = br.id AND bres.metric = 'cpu_avg' LIMIT 1) as cpu_avg_percent,
      (SELECT bres.value FROM benchmark_results bres WHERE bres.run_id = br.id AND bres.metric = 'max_concurrent' LIMIT 1) as max_concurrent,
      (SELECT COUNT(*) FROM benchmark_results bres WHERE bres.run_id = br.id AND bres.category = 'capability' AND bres.value = 1) as capabilities_passed,
      (SELECT COUNT(*) FROM benchmark_results bres WHERE bres.run_id = br.id AND bres.category = 'capability') as capabilities_total,
      (SELECT bres.value FROM benchmark_results bres WHERE bres.run_id = br.id AND bres.metric = 'overall_score' LIMIT 1) as overall_score
    FROM benchmark_runs br
    JOIN forks f ON f.id = br.fork_id
    WHERE br.device_id = ? AND br.status = 'completed'
    ORDER BY br.completed_at DESC
  `).all(deviceId) as BenchmarkSummary[];
}

export function getBenchmarksByDeviceAndFork(deviceId: number, forkId: number): BenchmarkResult[] {
  ensureDb();
  const run = db().prepare(`
    SELECT id FROM benchmark_runs
    WHERE device_id = ? AND fork_id = ? AND status = 'completed'
    ORDER BY completed_at DESC LIMIT 1
  `).get(deviceId, forkId) as { id: number } | undefined;
  if (!run) return [];
  return db().prepare(`
    SELECT * FROM benchmark_results WHERE run_id = ? ORDER BY category, metric
  `).all(run.id) as BenchmarkResult[];
}

export function createBenchmarkRun(
  deviceId: number,
  forkId: number,
  userId: number | null,
  dockerImage: string | null,
  memoryLimitMb: number | null,
  cpuLimit: number | null
): number {
  ensureDb();
  const result = db().prepare(`
    INSERT INTO benchmark_runs (device_id, fork_id, user_id, docker_image, memory_limit_mb, cpu_limit)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(deviceId, forkId, userId, dockerImage, memoryLimitMb, cpuLimit);
  return Number(result.lastInsertRowid);
}

export function completeBenchmarkRun(runId: number, status: "completed" | "failed", errorMessage?: string): void {
  ensureDb();
  db().prepare(`
    UPDATE benchmark_runs SET status = ?, completed_at = datetime('now'), error_message = ?
    WHERE id = ?
  `).run(status, errorMessage ?? null, runId);
}

export function insertBenchmarkResult(
  runId: number,
  metric: string,
  value: number,
  unit: string,
  category: "latency" | "capability" | "resource",
  details?: string
): void {
  ensureDb();
  db().prepare(`
    INSERT INTO benchmark_results (run_id, metric, value, unit, category, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(runId, metric, value, unit, category, details ?? null);
}

export function getLatestBenchmarkForDeviceFork(deviceId: number, forkId: number): BenchmarkSummary | undefined {
  ensureDb();
  return db().prepare(`
    SELECT
      br.id as run_id,
      f.name as fork_name,
      f.slug as fork_slug,
      br.status,
      br.started_at,
      br.completed_at,
      (SELECT bres.value FROM benchmark_results bres WHERE bres.run_id = br.id AND bres.metric = 'cold_start' LIMIT 1) as cold_start_ms,
      (SELECT bres.value FROM benchmark_results bres WHERE bres.run_id = br.id AND bres.metric = 'warm_response' LIMIT 1) as warm_response_ms,
      (SELECT bres.value FROM benchmark_results bres WHERE bres.run_id = br.id AND bres.metric = 'peak_memory' LIMIT 1) as peak_memory_mb,
      (SELECT bres.value FROM benchmark_results bres WHERE bres.run_id = br.id AND bres.metric = 'cpu_avg' LIMIT 1) as cpu_avg_percent,
      (SELECT bres.value FROM benchmark_results bres WHERE bres.run_id = br.id AND bres.metric = 'max_concurrent' LIMIT 1) as max_concurrent,
      (SELECT COUNT(*) FROM benchmark_results bres WHERE bres.run_id = br.id AND bres.category = 'capability' AND bres.value = 1) as capabilities_passed,
      (SELECT COUNT(*) FROM benchmark_results bres WHERE bres.run_id = br.id AND bres.category = 'capability') as capabilities_total,
      (SELECT bres.value FROM benchmark_results bres WHERE bres.run_id = br.id AND bres.metric = 'overall_score' LIMIT 1) as overall_score
    FROM benchmark_runs br
    JOIN forks f ON f.id = br.fork_id
    WHERE br.device_id = ? AND br.fork_id = ? AND br.status = 'completed'
    ORDER BY br.completed_at DESC
    LIMIT 1
  `).get(deviceId, forkId) as BenchmarkSummary | undefined;
}

export function getVerdictCountsByDevice(deviceId: number): Record<string, number> {
  ensureDb();
  const rows = db().prepare(`
    SELECT verdict, COUNT(*) as count FROM compatibility_verdicts WHERE device_id = ? GROUP BY verdict
  `).all(deviceId) as { verdict: string; count: number }[];
  const counts: Record<string, number> = { RUNS_GREAT: 0, RUNS_OK: 0, BARELY_RUNS: 0, WONT_RUN: 0 };
  for (const r of rows) counts[r.verdict] = r.count;
  return counts;
}

export type AffiliateLink = {
  id: number;
  device_id: number;
  network: string;
  url: string;
  affiliate_tag: string | null;
  label: string | null;
  priority: number;
};

export function getAffiliateLinks(deviceId: number): AffiliateLink[] {
  ensureDb();
  return db().prepare(
    "SELECT * FROM affiliate_links WHERE device_id = ? ORDER BY priority DESC"
  ).all(deviceId) as AffiliateLink[];
}

export function getBestAffiliateLink(deviceId: number, network?: string): AffiliateLink | undefined {
  ensureDb();
  if (network) {
    return db().prepare(
      "SELECT * FROM affiliate_links WHERE device_id = ? AND network = ? ORDER BY priority DESC LIMIT 1"
    ).get(deviceId, network) as AffiliateLink | undefined;
  }
  return db().prepare(
    "SELECT * FROM affiliate_links WHERE device_id = ? ORDER BY priority DESC LIMIT 1"
  ).get(deviceId) as AffiliateLink | undefined;
}

export function logAffiliateClick(linkId: number, referrer: string | null): void {
  ensureDb();
  db().prepare(
    "INSERT INTO affiliate_clicks (affiliate_link_id, referrer) VALUES (?, ?)"
  ).run(linkId, referrer);
}
