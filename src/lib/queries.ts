import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { SQL, SQLWrapper } from "drizzle-orm";

import { db } from "./db";
import * as schema from "./schema";

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toISOString();
  }
  return String(value);
}

function toIsoStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return toIsoString(value);
}

function verdictScoreSql(verdictExpr: SQLWrapper): SQL<number> {
  return sql<number>`
    CASE ${verdictExpr}
      WHEN 'RUNS_GREAT' THEN 4
      WHEN 'RUNS_OK' THEN 3
      WHEN 'BARELY_RUNS' THEN 2
      WHEN 'WONT_RUN' THEN 1
      ELSE 0
    END
  `;
}

function verdictOrderSql(verdictExpr: SQLWrapper): SQL<number> {
  return sql<number>`
    CASE ${verdictExpr}
      WHEN 'RUNS_GREAT' THEN 1
      WHEN 'RUNS_OK' THEN 2
      WHEN 'BARELY_RUNS' THEN 3
      WHEN 'WONT_RUN' THEN 4
      ELSE 5
    END
  `;
}

// --- Core domain types (Select models) ---

export type Device = typeof schema.devices.$inferSelect;
export type Fork = typeof schema.forks.$inferSelect;
export type Verdict = typeof schema.compatibilityVerdicts.$inferSelect;
export type User = typeof schema.users.$inferSelect;

export type DeviceWithScore = Device & {
  avg_rating: number | null;
  rating_count: number;
  best_verdict: Verdict["verdict"] | null;
  score: number;
};

export type Comment = Omit<typeof schema.comments.$inferSelect, "created_at"> & {
  created_at: string;
  username: string;
  avatar_url: string | null;
};

// --- Devices ---

export async function getDevicesRanked(filters?: {
  category?: string;
  minRam?: number;
  maxPrice?: number;
  forkSlug?: string;
  search?: string;
}): Promise<DeviceWithScore[]> {
  const conditions: SQL[] = [];

  if (filters?.category) {
    conditions.push(sql`d.category = ${filters.category}`);
  }
  if (filters?.minRam) {
    conditions.push(sql`d.ram_gb >= ${filters.minRam}`);
  }
  if (filters?.maxPrice !== undefined) {
    // Treat NULL prices as "Free" (=0) so maxPrice filters behave intuitively.
    conditions.push(sql`COALESCE(d.price_usd, 0) <= ${filters.maxPrice}`);
  }
  if (filters?.forkSlug) {
    conditions.push(sql`
      EXISTS (
        SELECT 1
        FROM compatibility_verdicts cvf
        JOIN forks ff ON ff.id = cvf.fork_id
        WHERE cvf.device_id = d.id AND ff.slug = ${filters.forkSlug}
      )
    `);
  }
  if (filters?.search) {
    const q = `%${filters.search}%`;
    conditions.push(sql`(d.name ILIKE ${q} OR d.cpu ILIKE ${q} OR d.description ILIKE ${q})`);
  }

  const whereSql =
    conditions.length > 0
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``;

  const result = await db.execute(sql`
    SELECT
      d.*,
      COALESCE(AVG(ur.stars), 0)::float as avg_rating,
      COUNT(DISTINCT ur.id)::int as rating_count,
      (
        SELECT cv2.verdict
        FROM compatibility_verdicts cv2
        WHERE cv2.device_id = d.id
        ORDER BY ${verdictScoreSql(sql`cv2.verdict`)} DESC
        LIMIT 1
      ) as best_verdict,
      (
        COALESCE(AVG(ur.stars), 0)::float * 0.6 +
        COALESCE((
          SELECT MAX(${verdictScoreSql(sql`cv3.verdict`)})
          FROM compatibility_verdicts cv3
          WHERE cv3.device_id = d.id
        ), 0)::float * 0.4
      )::float as score
    FROM devices d
    LEFT JOIN user_ratings ur ON ur.device_id = d.id
    ${whereSql}
    GROUP BY d.id
    ORDER BY score DESC, d.price_usd ASC NULLS LAST
  `);

  return result.rows as DeviceWithScore[];
}

export async function getDeviceBySlug(slug: string): Promise<Device | undefined> {
  const rows = await db
    .select()
    .from(schema.devices)
    .where(eq(schema.devices.slug, slug))
    .limit(1);
  return rows[0];
}

export async function getAllDevices(): Promise<Device[]> {
  return db.select().from(schema.devices).orderBy(asc(schema.devices.name));
}

export async function getCategories(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ category: schema.devices.category })
    .from(schema.devices)
    .orderBy(asc(schema.devices.category));
  return rows.map((r) => r.category);
}

export async function getSimilarDevices(device: Device, limit = 4): Promise<Device[]> {
  const price = device.price_usd ?? 0;

  const similar = await db
    .select()
    .from(schema.devices)
    .where(
      and(
        eq(schema.devices.category, device.category),
        sql`${schema.devices.id} <> ${device.id}`
      )
    )
    .orderBy(sql`ABS(COALESCE(${schema.devices.price_usd}, 0) - ${price}) ASC`)
    .limit(limit);

  if (similar.length >= limit) return similar;

  const remaining = limit - similar.length;
  const more = await db
    .select()
    .from(schema.devices)
    .where(
      and(
        sql`${schema.devices.id} <> ${device.id}`,
        sql`${schema.devices.category} <> ${device.category}`
      )
    )
    .orderBy(sql`ABS(${schema.devices.ram_gb} - ${device.ram_gb}) ASC`)
    .limit(remaining);

  return [...similar, ...more];
}

// --- Verdicts / Compatibility ---

export async function getVerdictsByDevice(
  deviceId: number
): Promise<(Verdict & { fork_name: string; fork_slug: string })[]> {
  const rows = await db
    .select({
      id: schema.compatibilityVerdicts.id,
      device_id: schema.compatibilityVerdicts.device_id,
      fork_id: schema.compatibilityVerdicts.fork_id,
      verdict: schema.compatibilityVerdicts.verdict,
      notes: schema.compatibilityVerdicts.notes,
      cold_start_sec: schema.compatibilityVerdicts.cold_start_sec,
      warm_response_sec: schema.compatibilityVerdicts.warm_response_sec,
      fork_name: schema.forks.name,
      fork_slug: schema.forks.slug,
    })
    .from(schema.compatibilityVerdicts)
    .innerJoin(schema.forks, eq(schema.forks.id, schema.compatibilityVerdicts.fork_id))
    .where(eq(schema.compatibilityVerdicts.device_id, deviceId))
    .orderBy(verdictOrderSql(schema.compatibilityVerdicts.verdict));

  return rows as (Verdict & { fork_name: string; fork_slug: string })[];
}

export async function getVerdictForDeviceAndFork(
  deviceSlug: string,
  forkSlug: string
): Promise<
  | (Verdict & {
      device_name: string;
      device_slug: string;
      fork_name: string;
      fork_slug: string;
    })
  | undefined
> {
  const rows = await db
    .select({
      id: schema.compatibilityVerdicts.id,
      device_id: schema.compatibilityVerdicts.device_id,
      fork_id: schema.compatibilityVerdicts.fork_id,
      verdict: schema.compatibilityVerdicts.verdict,
      notes: schema.compatibilityVerdicts.notes,
      cold_start_sec: schema.compatibilityVerdicts.cold_start_sec,
      warm_response_sec: schema.compatibilityVerdicts.warm_response_sec,
      device_name: schema.devices.name,
      device_slug: schema.devices.slug,
      fork_name: schema.forks.name,
      fork_slug: schema.forks.slug,
    })
    .from(schema.compatibilityVerdicts)
    .innerJoin(schema.devices, eq(schema.devices.id, schema.compatibilityVerdicts.device_id))
    .innerJoin(schema.forks, eq(schema.forks.id, schema.compatibilityVerdicts.fork_id))
    .where(and(eq(schema.devices.slug, deviceSlug), eq(schema.forks.slug, forkSlug)))
    .limit(1);

  return rows[0] as
    | (Verdict & {
        device_name: string;
        device_slug: string;
        fork_name: string;
        fork_slug: string;
      })
    | undefined;
}

export async function getAllVerdictCombinations(): Promise<{ fork_slug: string; device_slug: string }[]> {
  return db
    .select({
      fork_slug: schema.forks.slug,
      device_slug: schema.devices.slug,
    })
    .from(schema.compatibilityVerdicts)
    .innerJoin(schema.devices, eq(schema.devices.id, schema.compatibilityVerdicts.device_id))
    .innerJoin(schema.forks, eq(schema.forks.id, schema.compatibilityVerdicts.fork_id));
}

export async function getNonWontRunVerdicts(): Promise<{ fork_slug: string; device_slug: string }[]> {
  return db
    .select({
      fork_slug: schema.forks.slug,
      device_slug: schema.devices.slug,
    })
    .from(schema.compatibilityVerdicts)
    .innerJoin(schema.devices, eq(schema.devices.id, schema.compatibilityVerdicts.device_id))
    .innerJoin(schema.forks, eq(schema.forks.id, schema.compatibilityVerdicts.fork_id))
    .where(sql`${schema.compatibilityVerdicts.verdict} <> 'WONT_RUN'`);
}

export async function getVerdictCountsByDevice(deviceId: number): Promise<Record<string, number>> {
  const rows = await db
    .select({
      verdict: schema.compatibilityVerdicts.verdict,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(schema.compatibilityVerdicts)
    .where(eq(schema.compatibilityVerdicts.device_id, deviceId))
    .groupBy(schema.compatibilityVerdicts.verdict);

  const counts: Record<string, number> = {
    RUNS_GREAT: 0,
    RUNS_OK: 0,
    BARELY_RUNS: 0,
    WONT_RUN: 0,
  };
  for (const r of rows) counts[r.verdict] = r.count;
  return counts;
}

// --- Forks ---

export async function getAllForks(): Promise<Fork[]> {
  return db.select().from(schema.forks).orderBy(asc(schema.forks.min_ram_mb));
}

export async function getForkBySlug(slug: string): Promise<Fork | undefined> {
  const rows = await db
    .select()
    .from(schema.forks)
    .where(eq(schema.forks.slug, slug))
    .limit(1);
  return rows[0];
}

export async function getDevicesByFork(
  forkId: number
): Promise<(Device & { verdict: Verdict["verdict"]; notes: string | null })[]> {
  const rows = await db
    .select({
      id: schema.devices.id,
      slug: schema.devices.slug,
      name: schema.devices.name,
      category: schema.devices.category,
      cpu: schema.devices.cpu,
      ram_gb: schema.devices.ram_gb,
      storage: schema.devices.storage,
      gpu: schema.devices.gpu,
      power_watts: schema.devices.power_watts,
      price_usd: schema.devices.price_usd,
      price_type: schema.devices.price_type,
      image_url: schema.devices.image_url,
      buy_link: schema.devices.buy_link,
      description: schema.devices.description,
      verdict: schema.compatibilityVerdicts.verdict,
      notes: schema.compatibilityVerdicts.notes,
    })
    .from(schema.compatibilityVerdicts)
    .innerJoin(schema.devices, eq(schema.devices.id, schema.compatibilityVerdicts.device_id))
    .where(eq(schema.compatibilityVerdicts.fork_id, forkId))
    .orderBy(verdictOrderSql(schema.compatibilityVerdicts.verdict));

  return rows as (Device & { verdict: Verdict["verdict"]; notes: string | null })[];
}

export async function getSimilarDevicesForFork(
  device: Device,
  forkId: number,
  limit = 4
): Promise<(Device & { verdict: Verdict["verdict"]; notes: string | null })[]> {
  const rows = await db
    .select({
      id: schema.devices.id,
      slug: schema.devices.slug,
      name: schema.devices.name,
      category: schema.devices.category,
      cpu: schema.devices.cpu,
      ram_gb: schema.devices.ram_gb,
      storage: schema.devices.storage,
      gpu: schema.devices.gpu,
      power_watts: schema.devices.power_watts,
      price_usd: schema.devices.price_usd,
      price_type: schema.devices.price_type,
      image_url: schema.devices.image_url,
      buy_link: schema.devices.buy_link,
      description: schema.devices.description,
      verdict: schema.compatibilityVerdicts.verdict,
      notes: schema.compatibilityVerdicts.notes,
    })
    .from(schema.compatibilityVerdicts)
    .innerJoin(schema.devices, eq(schema.devices.id, schema.compatibilityVerdicts.device_id))
    .where(
      and(
        eq(schema.compatibilityVerdicts.fork_id, forkId),
        sql`${schema.devices.id} <> ${device.id}`,
        eq(schema.devices.category, device.category)
      )
    )
    .orderBy(verdictOrderSql(schema.compatibilityVerdicts.verdict))
    .limit(limit);

  return rows as (Device & { verdict: Verdict["verdict"]; notes: string | null })[];
}

export type DeviceWithVerdict = Device & {
  verdict: Verdict["verdict"];
  notes: string | null;
  cold_start_sec: number | null;
  warm_response_sec: number | null;
};

export async function getDevicesByCategoryForFork(
  category: string,
  forkSlug: string
): Promise<DeviceWithVerdict[]> {
  const rows = await db
    .select({
      id: schema.devices.id,
      slug: schema.devices.slug,
      name: schema.devices.name,
      category: schema.devices.category,
      cpu: schema.devices.cpu,
      ram_gb: schema.devices.ram_gb,
      storage: schema.devices.storage,
      gpu: schema.devices.gpu,
      power_watts: schema.devices.power_watts,
      price_usd: schema.devices.price_usd,
      price_type: schema.devices.price_type,
      image_url: schema.devices.image_url,
      buy_link: schema.devices.buy_link,
      description: schema.devices.description,
      verdict: schema.compatibilityVerdicts.verdict,
      notes: schema.compatibilityVerdicts.notes,
      cold_start_sec: schema.compatibilityVerdicts.cold_start_sec,
      warm_response_sec: schema.compatibilityVerdicts.warm_response_sec,
    })
    .from(schema.compatibilityVerdicts)
    .innerJoin(schema.devices, eq(schema.devices.id, schema.compatibilityVerdicts.device_id))
    .innerJoin(schema.forks, eq(schema.forks.id, schema.compatibilityVerdicts.fork_id))
    .where(and(eq(schema.devices.category, category), eq(schema.forks.slug, forkSlug)))
    .orderBy(
      verdictOrderSql(schema.compatibilityVerdicts.verdict),
      asc(schema.devices.price_usd)
    );

  return rows as DeviceWithVerdict[];
}

export async function getCategoryForkCombinations(): Promise<{ category: string; fork_slug: string }[]> {
  const rows = await db
    .selectDistinct({
      category: schema.devices.category,
      fork_slug: schema.forks.slug,
    })
    .from(schema.compatibilityVerdicts)
    .innerJoin(schema.devices, eq(schema.devices.id, schema.compatibilityVerdicts.device_id))
    .innerJoin(schema.forks, eq(schema.forks.id, schema.compatibilityVerdicts.fork_id))
    .orderBy(asc(schema.devices.category), asc(schema.forks.slug));

  return rows;
}

export async function getComparisonPairs(): Promise<{ slug1: string; slug2: string }[]> {
  const rows = await getComparisonPairsChunk(0, 200);
  return rows.map((r) => ({ slug1: r.slug1, slug2: r.slug2 }));
}

export async function getComparisonPairCount(): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*)::int as count
    FROM (
      SELECT d1.id, d2.id
      FROM devices d1
      JOIN devices d2 ON d1.category = d2.category AND d1.id < d2.id
      JOIN compatibility_verdicts cv1 ON cv1.device_id = d1.id AND cv1.verdict <> 'WONT_RUN'
      JOIN compatibility_verdicts cv2 ON cv2.device_id = d2.id AND cv2.verdict <> 'WONT_RUN'
      WHERE cv1.fork_id = cv2.fork_id
      GROUP BY d1.id, d2.id
      HAVING COUNT(DISTINCT cv1.fork_id) >= 2
    ) x
  `);

  const row = (result.rows as unknown as Array<{ count: number }>)[0];
  return row?.count ?? 0;
}

export async function getComparisonPairsChunk(
  offset: number,
  limit: number
): Promise<{ slug1: string; slug2: string; lastmod: string | null }[]> {
  const result = await db.execute(sql`
    SELECT
      d1.slug as slug1,
      d2.slug as slug2,
      GREATEST(d1.updated_at, d2.updated_at) as lastmod
    FROM devices d1
    JOIN devices d2 ON d1.category = d2.category AND d1.id < d2.id
    JOIN compatibility_verdicts cv1 ON cv1.device_id = d1.id AND cv1.verdict <> 'WONT_RUN'
    JOIN compatibility_verdicts cv2 ON cv2.device_id = d2.id AND cv2.verdict <> 'WONT_RUN'
    WHERE cv1.fork_id = cv2.fork_id
    GROUP BY d1.slug, d2.slug, d1.category, d1.name, d2.name, d1.updated_at, d2.updated_at
    HAVING COUNT(DISTINCT cv1.fork_id) >= 2
    ORDER BY d1.category, d1.name, d2.name
    LIMIT ${limit} OFFSET ${offset}
  `);

  return (result.rows as unknown as Array<{ slug1: string; slug2: string; lastmod: unknown }>).map((r) => ({
    slug1: r.slug1,
    slug2: r.slug2,
    lastmod: toIsoStringOrNull(r.lastmod),
  }));
}

// --- Ratings ---

export async function getDeviceRatings(deviceId: number, forkId?: number): Promise<{ avg: number | null; count: number }> {
  const where = forkId
    ? and(eq(schema.userRatings.device_id, deviceId), eq(schema.userRatings.fork_id, forkId))
    : eq(schema.userRatings.device_id, deviceId);

  const rows = await db
    .select({
      avg: sql<number | null>`AVG(${schema.userRatings.stars})::float`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(schema.userRatings)
    .where(where);

  return { avg: rows[0]?.avg ?? null, count: rows[0]?.count ?? 0 };
}

export async function upsertRating(deviceId: number, forkId: number, userId: number, stars: number): Promise<void> {
  await db
    .insert(schema.userRatings)
    .values({ device_id: deviceId, fork_id: forkId, user_id: userId, stars })
    .onConflictDoUpdate({
      target: [schema.userRatings.device_id, schema.userRatings.fork_id, schema.userRatings.user_id],
      set: { stars },
    });
}

export async function getUserRating(deviceId: number, forkId: number, userId: number): Promise<number | null> {
  const rows = await db
    .select({ stars: schema.userRatings.stars })
    .from(schema.userRatings)
    .where(
      and(
        eq(schema.userRatings.device_id, deviceId),
        eq(schema.userRatings.fork_id, forkId),
        eq(schema.userRatings.user_id, userId)
      )
    )
    .limit(1);
  return rows[0]?.stars ?? null;
}

// --- Comments ---

export async function getCommentsByDevice(deviceId: number): Promise<Comment[]> {
  const rows = await db
    .select({
      id: schema.comments.id,
      device_id: schema.comments.device_id,
      fork_id: schema.comments.fork_id,
      user_id: schema.comments.user_id,
      content: schema.comments.content,
      created_at: schema.comments.created_at,
      username: schema.users.username,
      avatar_url: schema.users.avatar_url,
    })
    .from(schema.comments)
    .innerJoin(schema.users, eq(schema.users.id, schema.comments.user_id))
    .where(eq(schema.comments.device_id, deviceId))
    .orderBy(desc(schema.comments.created_at));

  return rows.map((r) => ({
    ...r,
    created_at: toIsoString(r.created_at),
  })) as Comment[];
}

export async function addComment(deviceId: number, forkId: number | null, userId: number, content: string): Promise<void> {
  await db.insert(schema.comments).values({ device_id: deviceId, fork_id: forkId, user_id: userId, content });
}

// --- Users ---

export async function upsertUser(authId: string, username: string, avatarUrl: string | null): Promise<number> {
  const rows = await db
    .insert(schema.users)
    .values({ auth_id: authId, username, avatar_url: avatarUrl })
    .onConflictDoUpdate({
      target: schema.users.auth_id,
      set: { username, avatar_url: avatarUrl },
    })
    .returning({ id: schema.users.id });

  return rows[0]!.id;
}

export async function getUserByAuthId(authId: string): Promise<User | undefined> {
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.auth_id, authId))
    .limit(1);
  return rows[0];
}

// --- Community Verdicts ---

export type UserVerdict = Omit<typeof schema.userVerdicts.$inferSelect, "created_at"> & {
  created_at: string;
  username: string;
  avatar_url: string | null;
  vote_count: number;
  fork_name: string;
  fork_slug: string;
};

export async function getUserVerdictsByDevice(deviceId: number): Promise<UserVerdict[]> {
  const rows = await db
    .select({
      id: schema.userVerdicts.id,
      user_id: schema.userVerdicts.user_id,
      device_id: schema.userVerdicts.device_id,
      fork_id: schema.userVerdicts.fork_id,
      verdict: schema.userVerdicts.verdict,
      notes: schema.userVerdicts.notes,
      evidence_url: schema.userVerdicts.evidence_url,
      verified: schema.userVerdicts.verified,
      created_at: schema.userVerdicts.created_at,
      username: schema.users.username,
      avatar_url: schema.users.avatar_url,
      fork_name: schema.forks.name,
      fork_slug: schema.forks.slug,
      vote_count: sql<number>`COALESCE(SUM(${schema.verdictVotes.vote}), 0)::int`,
    })
    .from(schema.userVerdicts)
    .innerJoin(schema.users, eq(schema.users.id, schema.userVerdicts.user_id))
    .innerJoin(schema.forks, eq(schema.forks.id, schema.userVerdicts.fork_id))
    .leftJoin(schema.verdictVotes, eq(schema.verdictVotes.user_verdict_id, schema.userVerdicts.id))
    .where(eq(schema.userVerdicts.device_id, deviceId))
    .groupBy(schema.userVerdicts.id, schema.users.id, schema.forks.id)
    .orderBy(
      desc(sql<number>`COALESCE(SUM(${schema.verdictVotes.vote}), 0)::int`),
      desc(schema.userVerdicts.created_at)
    );

  return rows.map((r) => ({
    ...r,
    created_at: toIsoString(r.created_at),
  })) as UserVerdict[];
}

export async function submitUserVerdict(
  userId: number,
  deviceId: number,
  forkId: number,
  verdict: string,
  notes: string | null,
  evidenceUrl: string | null
): Promise<void> {
  await db
    .insert(schema.userVerdicts)
    .values({
      user_id: userId,
      device_id: deviceId,
      fork_id: forkId,
      verdict: verdict as typeof schema.verdictEnum.enumValues[number],
      notes,
      evidence_url: evidenceUrl,
    })
    .onConflictDoUpdate({
      target: [schema.userVerdicts.user_id, schema.userVerdicts.device_id, schema.userVerdicts.fork_id],
      set: {
        verdict: verdict as typeof schema.verdictEnum.enumValues[number],
        notes,
        evidence_url: evidenceUrl,
        created_at: sql`NOW()`,
      },
    });
}

export async function voteOnVerdict(userId: number, verdictId: number, vote: 1 | -1): Promise<void> {
  await db
    .insert(schema.verdictVotes)
    .values({ user_id: userId, user_verdict_id: verdictId, vote })
    .onConflictDoUpdate({
      target: [schema.verdictVotes.user_id, schema.verdictVotes.user_verdict_id],
      set: { vote },
    });
}

export async function getUserVerdictVotes(userId: number, deviceId: number): Promise<Record<number, number>> {
  const rows = await db
    .select({
      user_verdict_id: schema.verdictVotes.user_verdict_id,
      vote: schema.verdictVotes.vote,
    })
    .from(schema.verdictVotes)
    .innerJoin(schema.userVerdicts, eq(schema.userVerdicts.id, schema.verdictVotes.user_verdict_id))
    .where(and(eq(schema.verdictVotes.user_id, userId), eq(schema.userVerdicts.device_id, deviceId)));

  const votes: Record<number, number> = {};
  for (const r of rows) votes[r.user_verdict_id] = r.vote;
  return votes;
}

// --- Benchmarks ---

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

export async function getBenchmarksByDevice(deviceId: number): Promise<BenchmarkSummary[]> {
  const result = await db.execute(sql`
    SELECT
      br.id as run_id,
      f.name as fork_name,
      f.slug as fork_slug,
      br.status,
      br.started_at,
      br.completed_at,
      MAX(CASE WHEN bres.metric = 'cold_start' THEN bres.value END) as cold_start_ms,
      MAX(CASE WHEN bres.metric = 'warm_response' THEN bres.value END) as warm_response_ms,
      MAX(CASE WHEN bres.metric = 'peak_memory' THEN bres.value END) as peak_memory_mb,
      MAX(CASE WHEN bres.metric = 'cpu_avg' THEN bres.value END) as cpu_avg_percent,
      MAX(CASE WHEN bres.metric = 'max_concurrent' THEN bres.value END) as max_concurrent,
      SUM(CASE WHEN bres.category = 'capability' AND bres.value = 1 THEN 1 ELSE 0 END)::int as capabilities_passed,
      SUM(CASE WHEN bres.category = 'capability' THEN 1 ELSE 0 END)::int as capabilities_total,
      MAX(CASE WHEN bres.metric = 'overall_score' THEN bres.value END) as overall_score
    FROM benchmark_runs br
    JOIN forks f ON f.id = br.fork_id
    LEFT JOIN benchmark_results bres ON bres.run_id = br.id
    WHERE br.device_id = ${deviceId} AND br.status = 'completed'
    GROUP BY br.id, f.name, f.slug
    ORDER BY br.completed_at DESC
  `);

  type BenchmarkSummaryDbRow = Omit<BenchmarkSummary, "started_at" | "completed_at"> & {
    started_at: unknown;
    completed_at: unknown;
  };
  const rows = result.rows as unknown as BenchmarkSummaryDbRow[];

  return rows.map((r) => ({
    ...r,
    started_at: toIsoString(r.started_at),
    completed_at: toIsoStringOrNull(r.completed_at),
  }));
}

export async function getBenchmarksByDeviceAndFork(deviceId: number, forkId: number): Promise<BenchmarkResult[]> {
  const run = await db
    .select({ id: schema.benchmarkRuns.id })
    .from(schema.benchmarkRuns)
    .where(
      and(
        eq(schema.benchmarkRuns.device_id, deviceId),
        eq(schema.benchmarkRuns.fork_id, forkId),
        eq(schema.benchmarkRuns.status, "completed")
      )
    )
    .orderBy(desc(schema.benchmarkRuns.completed_at))
    .limit(1);

  if (!run[0]) return [];

  const rows = await db
    .select({
      id: schema.benchmarkResults.id,
      run_id: schema.benchmarkResults.run_id,
      metric: schema.benchmarkResults.metric,
      value: schema.benchmarkResults.value,
      unit: schema.benchmarkResults.unit,
      category: schema.benchmarkResults.category,
      details: schema.benchmarkResults.details,
    })
    .from(schema.benchmarkResults)
    .where(eq(schema.benchmarkResults.run_id, run[0].id))
    .orderBy(asc(schema.benchmarkResults.category), asc(schema.benchmarkResults.metric));

  return rows as BenchmarkResult[];
}

export async function createBenchmarkRun(
  deviceId: number,
  forkId: number,
  userId: number | null,
  dockerImage: string | null,
  memoryLimitMb: number | null,
  cpuLimit: number | null
): Promise<number> {
  const rows = await db
    .insert(schema.benchmarkRuns)
    .values({
      device_id: deviceId,
      fork_id: forkId,
      user_id: userId,
      docker_image: dockerImage,
      memory_limit_mb: memoryLimitMb,
      cpu_limit: cpuLimit,
      status: "running",
    })
    .returning({ id: schema.benchmarkRuns.id });

  return rows[0]!.id;
}

export async function completeBenchmarkRun(
  runId: number,
  status: "completed" | "failed",
  errorMessage?: string
): Promise<void> {
  await db
    .update(schema.benchmarkRuns)
    .set({
      status,
      completed_at: new Date(),
      error_message: errorMessage ?? null,
    })
    .where(eq(schema.benchmarkRuns.id, runId));
}

export async function insertBenchmarkResult(
  runId: number,
  metric: string,
  value: number,
  unit: string,
  category: "latency" | "capability" | "resource",
  details?: string
): Promise<void> {
  await db.insert(schema.benchmarkResults).values({
    run_id: runId,
    metric,
    value,
    unit,
    category,
    details: details ?? null,
  });
}

export async function getLatestBenchmarkForDeviceFork(
  deviceId: number,
  forkId: number
): Promise<BenchmarkSummary | undefined> {
  const result = await db.execute(sql`
    SELECT
      br.id as run_id,
      f.name as fork_name,
      f.slug as fork_slug,
      br.status,
      br.started_at,
      br.completed_at,
      MAX(CASE WHEN bres.metric = 'cold_start' THEN bres.value END) as cold_start_ms,
      MAX(CASE WHEN bres.metric = 'warm_response' THEN bres.value END) as warm_response_ms,
      MAX(CASE WHEN bres.metric = 'peak_memory' THEN bres.value END) as peak_memory_mb,
      MAX(CASE WHEN bres.metric = 'cpu_avg' THEN bres.value END) as cpu_avg_percent,
      MAX(CASE WHEN bres.metric = 'max_concurrent' THEN bres.value END) as max_concurrent,
      SUM(CASE WHEN bres.category = 'capability' AND bres.value = 1 THEN 1 ELSE 0 END)::int as capabilities_passed,
      SUM(CASE WHEN bres.category = 'capability' THEN 1 ELSE 0 END)::int as capabilities_total,
      MAX(CASE WHEN bres.metric = 'overall_score' THEN bres.value END) as overall_score
    FROM benchmark_runs br
    JOIN forks f ON f.id = br.fork_id
    LEFT JOIN benchmark_results bres ON bres.run_id = br.id
    WHERE br.device_id = ${deviceId} AND br.fork_id = ${forkId} AND br.status = 'completed'
    GROUP BY br.id, f.name, f.slug
    ORDER BY br.completed_at DESC
    LIMIT 1
  `);

  type BenchmarkSummaryDbRow = Omit<BenchmarkSummary, "started_at" | "completed_at"> & {
    started_at: unknown;
    completed_at: unknown;
  };
  const row = (result.rows as unknown as BenchmarkSummaryDbRow[])[0];
  if (!row) return undefined;

  return {
    ...(row as Omit<BenchmarkSummary, "started_at" | "completed_at">),
    started_at: toIsoString(row.started_at),
    completed_at: toIsoStringOrNull(row.completed_at),
  };
}

export type BenchmarkLeaderboardEntry = {
  device_slug: string;
  device_name: string;
  device_category: string;
  fork_slug: string;
  fork_name: string;
  fork_language: string | null;
  overall_score: number | null;
  cold_start_ms: number | null;
  peak_memory_mb: number | null;
  capabilities_passed: number;
  capabilities_total: number;
  disk_mb: number | null;
};

export async function getBenchmarkLeaderboard(filters?: {
  forkSlug?: string;
  category?: string;
  limit?: number;
}): Promise<BenchmarkLeaderboardEntry[]> {
  const where: SQL[] = [sql`br.status = 'completed'`];
  if (filters?.forkSlug) where.push(sql`f.slug = ${filters.forkSlug}`);
  if (filters?.category) where.push(sql`d.category = ${filters.category}`);
  const limit = filters?.limit ?? 100;

  const result = await db.execute(sql`
    SELECT
      d.slug as device_slug,
      d.name as device_name,
      d.category as device_category,
      f.slug as fork_slug,
      f.name as fork_name,
      f.language as fork_language,
      MAX(CASE WHEN bres.metric = 'overall_score' THEN bres.value END) as overall_score,
      MAX(CASE WHEN bres.metric = 'cold_start' THEN bres.value END) as cold_start_ms,
      MAX(CASE WHEN bres.metric = 'peak_memory' THEN bres.value END) as peak_memory_mb,
      SUM(CASE WHEN bres.category = 'capability' AND bres.value = 1 THEN 1 ELSE 0 END)::int as capabilities_passed,
      SUM(CASE WHEN bres.category = 'capability' THEN 1 ELSE 0 END)::int as capabilities_total,
      MAX(CASE WHEN bres.metric = 'disk_usage' THEN bres.value END) as disk_mb
    FROM benchmark_runs br
    JOIN forks f ON f.id = br.fork_id
    JOIN devices d ON d.id = br.device_id
    LEFT JOIN benchmark_results bres ON bres.run_id = br.id
    WHERE ${sql.join(where, sql` AND `)}
    GROUP BY br.id, d.slug, d.name, d.category, f.slug, f.name, f.language
    ORDER BY overall_score DESC NULLS LAST, cold_start_ms ASC NULLS LAST
    LIMIT ${limit}
  `);

  return result.rows as BenchmarkLeaderboardEntry[];
}

export type BenchmarkForkSummary = {
  fork_slug: string;
  fork_name: string;
  fork_language: string | null;
  total_runs: number;
  avg_score: number;
  min_score: number;
  max_score: number;
  avg_cold_start_ms: number;
  avg_memory_mb: number;
  devices_tested: number;
};

export async function getBenchmarkForkSummaries(): Promise<BenchmarkForkSummary[]> {
  const result = await db.execute(sql`
    SELECT
      f.slug as fork_slug,
      f.name as fork_name,
      f.language as fork_language,
      COUNT(DISTINCT br.id)::int as total_runs,
      ROUND(AVG(score.value)::numeric, 1)::float as avg_score,
      MIN(score.value)::float as min_score,
      MAX(score.value)::float as max_score,
      ROUND(AVG(cs.value)::numeric, 0)::float as avg_cold_start_ms,
      ROUND(AVG(mem.value)::numeric, 0)::float as avg_memory_mb,
      COUNT(DISTINCT br.device_id)::int as devices_tested
    FROM forks f
    JOIN benchmark_runs br ON br.fork_id = f.id AND br.status = 'completed'
    LEFT JOIN benchmark_results score ON score.run_id = br.id AND score.metric = 'overall_score'
    LEFT JOIN benchmark_results cs ON cs.run_id = br.id AND cs.metric = 'cold_start'
    LEFT JOIN benchmark_results mem ON mem.run_id = br.id AND mem.metric = 'peak_memory'
    GROUP BY f.id
    ORDER BY avg_score DESC NULLS LAST
  `);

  return result.rows as BenchmarkForkSummary[];
}

export async function getBenchmarkTotalRuns(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(schema.benchmarkRuns)
    .where(eq(schema.benchmarkRuns.status, "completed"));
  return rows[0]?.count ?? 0;
}

// --- Affiliate links + clicks ---

export type AffiliateLink = typeof schema.affiliateLinks.$inferSelect;

export async function getAffiliateLinks(deviceId: number): Promise<AffiliateLink[]> {
  return db
    .select()
    .from(schema.affiliateLinks)
    .where(eq(schema.affiliateLinks.device_id, deviceId))
    .orderBy(desc(schema.affiliateLinks.priority));
}

export async function getBestAffiliateLink(deviceId: number, network?: string): Promise<AffiliateLink | undefined> {
  const where = network
    ? and(eq(schema.affiliateLinks.device_id, deviceId), eq(schema.affiliateLinks.network, network))
    : eq(schema.affiliateLinks.device_id, deviceId);

  const rows = await db
    .select()
    .from(schema.affiliateLinks)
    .where(where)
    .orderBy(desc(schema.affiliateLinks.priority))
    .limit(1);

  return rows[0];
}

export async function logAffiliateClick(linkId: number, referrer: string | null): Promise<void> {
  await db.insert(schema.affiliateClicks).values({ affiliate_link_id: linkId, referrer });
}

// --- Fork Verification ---

export type ForkVerification = Omit<typeof schema.forkVerifications.$inferSelect, "verified_at"> & {
  verified_at: string;
  is_recent: boolean;
};

export type ForkVerificationWithName = ForkVerification & {
  fork_name: string;
  fork_slug: string;
};

export async function getLatestForkVerification(forkId: number): Promise<ForkVerification | undefined> {
  const rows = await db
    .select()
    .from(schema.forkVerifications)
    .where(eq(schema.forkVerifications.fork_id, forkId))
    .orderBy(desc(schema.forkVerifications.verified_at))
    .limit(1);

  const row = rows[0];
  if (!row) return undefined;

  const verifiedAt = toIsoString(row.verified_at);
  const is_recent =
    row.status === "verified" &&
    Date.now() - new Date(verifiedAt).getTime() < 30 * 24 * 60 * 60 * 1000;

  return {
    ...row,
    verified_at: verifiedAt,
    is_recent,
  } as ForkVerification;
}

export async function getAllForkVerifications(): Promise<ForkVerificationWithName[]> {
  const result = await db.execute(sql`
    SELECT DISTINCT ON (fv.fork_id)
      fv.*,
      f.name as fork_name,
      f.slug as fork_slug
    FROM fork_verifications fv
    JOIN forks f ON f.id = fv.fork_id
    ORDER BY fv.fork_id, fv.verified_at DESC
	  `);

  type ForkVerificationDbRow = Omit<ForkVerificationWithName, "verified_at"> & { verified_at: unknown };
  const rows = result.rows as unknown as ForkVerificationDbRow[];

  return rows.map((r) => {
    const verifiedAt = toIsoString(r.verified_at);
    const is_recent =
      r.status === "verified" &&
      Date.now() - new Date(verifiedAt).getTime() < 30 * 24 * 60 * 60 * 1000;

    return {
      ...r,
      verified_at: verifiedAt,
      is_recent,
    };
  });
}

export async function insertForkVerification(
  forkId: number,
  data: {
    repo_accessible: boolean;
    repo_stars?: number | null;
    detected_language?: string | null;
    detected_min_ram_mb?: number | null;
    detected_features?: string[] | null;
    readme_mentions?: Record<string, string> | null;
    discrepancies?: { field: string; stored: unknown; detected: unknown }[];
    status: "pending" | "verified" | "discrepancy" | "inaccessible";
  }
): Promise<number> {
  const rows = await db
    .insert(schema.forkVerifications)
    .values({
      fork_id: forkId,
      repo_accessible: data.repo_accessible,
      repo_stars: data.repo_stars ?? null,
      detected_language: data.detected_language ?? null,
      detected_min_ram_mb: data.detected_min_ram_mb ?? null,
      detected_features: data.detected_features ? JSON.stringify(data.detected_features) : null,
      readme_mentions: data.readme_mentions ? JSON.stringify(data.readme_mentions) : null,
      discrepancies: data.discrepancies ? JSON.stringify(data.discrepancies) : null,
      status: data.status,
    })
    .returning({ id: schema.forkVerifications.id });

  return rows[0]!.id;
}

// --- Benchmark updates ---

export async function updateVerdictTimings(
  deviceId: number,
  forkId: number,
  coldStartSec?: number,
  warmResponseSec?: number
): Promise<void> {
  const set: Record<string, unknown> = {};
  if (coldStartSec !== undefined) set.cold_start_sec = coldStartSec;
  if (warmResponseSec !== undefined) set.warm_response_sec = warmResponseSec;
  if (Object.keys(set).length === 0) return;

  set.updated_at = sql`now()`;

  await db
    .update(schema.compatibilityVerdicts)
    .set(set)
    .where(and(eq(schema.compatibilityVerdicts.device_id, deviceId), eq(schema.compatibilityVerdicts.fork_id, forkId)));
}

export async function updateBenchmarkRunRawJson(runId: number, rawJson: string): Promise<void> {
  await db
    .update(schema.benchmarkRuns)
    .set({ raw_json: rawJson })
    .where(eq(schema.benchmarkRuns.id, runId));
}

// --- Analytics (page views + affiliate clicks) ---

export async function trackPageView(
  path: string,
  referrer: string | null,
  userAgent: string | null,
  country: string | null
): Promise<void> {
  await db.insert(schema.pageViews).values({
    path,
    referrer,
    user_agent: userAgent,
    country,
  });
}

export async function getViewCount(days: number): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*)::int as count
    FROM page_views
    WHERE viewed_at >= NOW() - (${days}::text || ' days')::interval
	  `);
  const row = (result.rows as unknown as Array<{ count: number }>)[0];
  return row?.count ?? 0;
}

export type ViewsByDay = { day: string; views: number };

function formatUtcDay(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function getViewsByDay(days = 30): Promise<ViewsByDay[]> {
  const result = await db.execute(sql`
    SELECT
      TO_CHAR(viewed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') as day,
      COUNT(*)::int as views
    FROM page_views
    WHERE viewed_at >= NOW() - (${days}::text || ' days')::interval
    GROUP BY day
    ORDER BY day ASC
  `);

  const rows = result.rows as { day: string; views: number }[];
  const map = new Map<string, number>(rows.map((r) => [r.day, r.views]));
  const out: ViewsByDay[] = [];

  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const key = formatUtcDay(d);
    out.push({ day: key, views: map.get(key) ?? 0 });
  }

  return out;
}

export type TopPage = { path: string; views: number };

export async function getTopPages(limit = 10, days = 30): Promise<TopPage[]> {
  const result = await db.execute(sql`
    SELECT path, COUNT(*)::int as views
    FROM page_views
    WHERE viewed_at >= NOW() - (${days}::text || ' days')::interval
    GROUP BY path
    ORDER BY views DESC
    LIMIT ${limit}
  `);
  return result.rows as TopPage[];
}

export type TopReferrer = { referrer: string; views: number };

export async function getTopReferrers(limit = 10, days = 30): Promise<TopReferrer[]> {
  const result = await db.execute(sql`
    SELECT referrer, COUNT(*)::int as views
    FROM page_views
    WHERE referrer IS NOT NULL AND referrer <> '' AND viewed_at >= NOW() - (${days}::text || ' days')::interval
    GROUP BY referrer
    ORDER BY views DESC
    LIMIT ${limit}
  `);
  return result.rows as TopReferrer[];
}

export type AffiliateClickStat = {
  device_name: string;
  network: string;
  label: string | null;
  clicks: number;
};

export async function getAffiliateClickStats(days = 30): Promise<AffiliateClickStat[]> {
  const result = await db.execute(sql`
    SELECT d.name as device_name, al.network, al.label, COUNT(ac.id)::int as clicks
    FROM affiliate_clicks ac
    JOIN affiliate_links al ON al.id = ac.affiliate_link_id
    JOIN devices d ON d.id = al.device_id
    WHERE ac.clicked_at >= NOW() - (${days}::text || ' days')::interval
    GROUP BY d.name, al.network, al.label
    ORDER BY clicks DESC
  `);

  return result.rows as AffiliateClickStat[];
}

// --- Sitemap scaling helpers (chunk queries) ---

export async function getDeviceCount(): Promise<number> {
  const rows = await db.select({ count: sql<number>`COUNT(*)::int` }).from(schema.devices);
  return rows[0]?.count ?? 0;
}

export async function getDeviceSlugsChunk(
  offset: number,
  limit: number
): Promise<{ slug: string; updated_at: string }[]> {
  const rows = await db
    .select({ slug: schema.devices.slug, updated_at: schema.devices.updated_at })
    .from(schema.devices)
    .orderBy(asc(schema.devices.slug))
    .limit(limit)
    .offset(offset);
  return rows.map((r) => ({ slug: r.slug, updated_at: toIsoString(r.updated_at) }));
}

export async function getForkCount(): Promise<number> {
  const rows = await db.select({ count: sql<number>`COUNT(*)::int` }).from(schema.forks);
  return rows[0]?.count ?? 0;
}

export async function getForkSlugsChunk(
  offset: number,
  limit: number
): Promise<{ slug: string; updated_at: string }[]> {
  const rows = await db
    .select({ slug: schema.forks.slug, updated_at: schema.forks.updated_at })
    .from(schema.forks)
    .orderBy(asc(schema.forks.slug))
    .limit(limit)
    .offset(offset);
  return rows.map((r) => ({ slug: r.slug, updated_at: toIsoString(r.updated_at) }));
}

export async function getNonWontRunVerdictCount(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(schema.compatibilityVerdicts)
    .where(sql`${schema.compatibilityVerdicts.verdict} <> 'WONT_RUN'`);
  return rows[0]?.count ?? 0;
}

export async function getNonWontRunVerdictChunk(
  offset: number,
  limit: number
): Promise<{ fork_slug: string; device_slug: string; updated_at: string }[]> {
  const rows = await db
    .select({
      fork_slug: schema.forks.slug,
      device_slug: schema.devices.slug,
      updated_at: schema.compatibilityVerdicts.updated_at,
    })
    .from(schema.compatibilityVerdicts)
    .innerJoin(schema.devices, eq(schema.devices.id, schema.compatibilityVerdicts.device_id))
    .innerJoin(schema.forks, eq(schema.forks.id, schema.compatibilityVerdicts.fork_id))
    .where(sql`${schema.compatibilityVerdicts.verdict} <> 'WONT_RUN'`)
    .orderBy(asc(schema.forks.slug), asc(schema.devices.slug))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    fork_slug: r.fork_slug,
    device_slug: r.device_slug,
    updated_at: toIsoString(r.updated_at),
  }));
}

export async function getCategoryForkCombinationCount(): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*)::int as count
    FROM (
      SELECT DISTINCT d.category, f.slug
      FROM compatibility_verdicts cv
      JOIN devices d ON d.id = cv.device_id
      JOIN forks f ON f.id = cv.fork_id
      WHERE cv.verdict <> 'WONT_RUN'
    ) x
	  `);

  const row = (result.rows as unknown as Array<{ count: number }>)[0];
  return row?.count ?? 0;
}

export async function getCategoryForkCombinationChunk(
  offset: number,
  limit: number
): Promise<{ category: string; fork_slug: string; lastmod: string | null }[]> {
  const result = await db.execute(sql`
    SELECT d.category, f.slug as fork_slug, MAX(cv.updated_at) as lastmod
    FROM compatibility_verdicts cv
    JOIN devices d ON d.id = cv.device_id
    JOIN forks f ON f.id = cv.fork_id
    WHERE cv.verdict <> 'WONT_RUN'
    GROUP BY d.category, f.slug
    ORDER BY d.category, f.slug
    LIMIT ${limit} OFFSET ${offset}
  `);

  return (result.rows as unknown as Array<{ category: string; fork_slug: string; lastmod: unknown }>).map((r) => ({
    category: r.category,
    fork_slug: r.fork_slug,
    lastmod: toIsoStringOrNull(r.lastmod),
  }));
}
