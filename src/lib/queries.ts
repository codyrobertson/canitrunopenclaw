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
  tokens_per_sec: number | null;
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
