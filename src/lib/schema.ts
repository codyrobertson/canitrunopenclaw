import {
  pgTable,
  pgEnum,
  serial,
  text,
  real,
  integer,
  boolean,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";

// --- Enums ---

export const verdictEnum = pgEnum("verdict", [
  "RUNS_GREAT",
  "RUNS_OK",
  "BARELY_RUNS",
  "WONT_RUN",
]);

export const maturityEnum = pgEnum("maturity", [
  "alpha",
  "beta",
  "stable",
  "archived",
]);

export const benchmarkStatusEnum = pgEnum("benchmark_status", [
  "running",
  "completed",
  "failed",
]);

export const benchmarkCategoryEnum = pgEnum("benchmark_category", [
  "latency",
  "capability",
  "resource",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "verified",
  "discrepancy",
  "inaccessible",
]);

// --- Tables ---

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  cpu: text("cpu"),
  ram_gb: real("ram_gb").notNull(),
  storage: text("storage"),
  gpu: text("gpu"),
  power_watts: real("power_watts"),
  price_usd: real("price_usd"),
  price_type: text("price_type").default("one-time"),
  image_url: text("image_url"),
  buy_link: text("buy_link"),
  description: text("description"),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const forks = pgTable("forks", {
  id: serial("id").primaryKey(),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  github_url: text("github_url"),
  description: text("description"),
  tagline: text("tagline"),
  creator: text("creator"),
  created_year: integer("created_year"),
  github_stars: integer("github_stars").default(0),
  maturity: maturityEnum("maturity").default("beta"),
  last_commit_date: text("last_commit_date"),
  min_ram_mb: integer("min_ram_mb").notNull(),
  min_cpu_cores: integer("min_cpu_cores").default(1),
  min_storage_mb: integer("min_storage_mb").default(100),
  language: text("language"),
  codebase_size_lines: integer("codebase_size_lines"),
  license: text("license"),
  features: text("features").default("[]"),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const compatibilityVerdicts = pgTable(
  "compatibility_verdicts",
  {
    id: serial("id").primaryKey(),
    device_id: integer("device_id")
      .notNull()
      .references(() => devices.id),
    fork_id: integer("fork_id")
      .notNull()
      .references(() => forks.id),
    verdict: verdictEnum("verdict").notNull(),
    notes: text("notes"),
    cold_start_sec: real("cold_start_sec"),
    warm_response_sec: real("warm_response_sec"),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique().on(table.device_id, table.fork_id),
    index("idx_cv_device_id").on(table.device_id),
    index("idx_cv_fork_id").on(table.fork_id),
  ]
);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  auth_id: text("auth_id").unique().notNull(),
  username: text("username").notNull(),
  avatar_url: text("avatar_url"),
  is_admin: boolean("is_admin").default(false).notNull(),
});

export const userRatings = pgTable(
  "user_ratings",
  {
    id: serial("id").primaryKey(),
    device_id: integer("device_id")
      .notNull()
      .references(() => devices.id),
    fork_id: integer("fork_id")
      .notNull()
      .references(() => forks.id),
    user_id: integer("user_id")
      .notNull()
      .references(() => users.id),
    stars: integer("stars").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique().on(table.device_id, table.fork_id, table.user_id),
    index("idx_user_ratings_device_id").on(table.device_id),
  ]
);

export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    device_id: integer("device_id")
      .notNull()
      .references(() => devices.id),
    fork_id: integer("fork_id").references(() => forks.id),
    user_id: integer("user_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_comments_device_id").on(table.device_id),
  ]
);

export const affiliateLinks = pgTable(
  "affiliate_links",
  {
    id: serial("id").primaryKey(),
    device_id: integer("device_id")
      .notNull()
      .references(() => devices.id),
    network: text("network").notNull(),
    url: text("url").notNull(),
    affiliate_tag: text("affiliate_tag"),
    label: text("label"),
    priority: integer("priority").default(0),
  },
  (table) => [
    index("idx_affiliate_links_device_id").on(table.device_id),
  ]
);

export const affiliateClicks = pgTable("affiliate_clicks", {
  id: serial("id").primaryKey(),
  affiliate_link_id: integer("affiliate_link_id")
    .notNull()
    .references(() => affiliateLinks.id),
  clicked_at: timestamp("clicked_at").defaultNow().notNull(),
  referrer: text("referrer"),
});

export const userVerdicts = pgTable(
  "user_verdicts",
  {
    id: serial("id").primaryKey(),
    user_id: integer("user_id")
      .notNull()
      .references(() => users.id),
    device_id: integer("device_id")
      .notNull()
      .references(() => devices.id),
    fork_id: integer("fork_id")
      .notNull()
      .references(() => forks.id),
    verdict: verdictEnum("verdict").notNull(),
    notes: text("notes"),
    evidence_url: text("evidence_url"),
    verified: integer("verified").default(0),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique().on(table.user_id, table.device_id, table.fork_id),
    index("idx_user_verdicts_device_id").on(table.device_id),
    index("idx_user_verdicts_user_id").on(table.user_id),
  ]
);

export const verdictVotes = pgTable(
  "verdict_votes",
  {
    id: serial("id").primaryKey(),
    user_id: integer("user_id")
      .notNull()
      .references(() => users.id),
    user_verdict_id: integer("user_verdict_id")
      .notNull()
      .references(() => userVerdicts.id),
    vote: integer("vote").notNull(),
  },
  (table) => [unique().on(table.user_id, table.user_verdict_id)]
);

export const benchmarkRuns = pgTable(
  "benchmark_runs",
  {
    id: serial("id").primaryKey(),
    device_id: integer("device_id")
      .notNull()
      .references(() => devices.id),
    fork_id: integer("fork_id")
      .notNull()
      .references(() => forks.id),
    user_id: integer("user_id").references(() => users.id),
    status: benchmarkStatusEnum("status").default("running").notNull(),
    docker_image: text("docker_image"),
    memory_limit_mb: integer("memory_limit_mb"),
    cpu_limit: real("cpu_limit"),
    started_at: timestamp("started_at").defaultNow().notNull(),
    completed_at: timestamp("completed_at"),
    error_message: text("error_message"),
    raw_json: text("raw_json"),
  },
  (table) => [
    index("idx_benchmark_runs_device_id").on(table.device_id),
    index("idx_benchmark_runs_fork_id").on(table.fork_id),
  ]
);

export const benchmarkResults = pgTable(
  "benchmark_results",
  {
    id: serial("id").primaryKey(),
    run_id: integer("run_id")
      .notNull()
      .references(() => benchmarkRuns.id),
    metric: text("metric").notNull(),
    value: real("value").notNull(),
    unit: text("unit").notNull(),
    category: benchmarkCategoryEnum("category").notNull(),
    details: text("details"),
  },
  (table) => [
    index("idx_benchmark_results_run_id").on(table.run_id),
  ]
);

export const pageViews = pgTable(
  "page_views",
  {
    id: serial("id").primaryKey(),
    path: text("path").notNull(),
    referrer: text("referrer"),
    user_agent: text("user_agent"),
    country: text("country"),
    viewed_at: timestamp("viewed_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_page_views_path").on(table.path),
    index("idx_page_views_date").on(table.viewed_at),
  ]
);

export const forkVerifications = pgTable(
  "fork_verifications",
  {
    id: serial("id").primaryKey(),
    fork_id: integer("fork_id")
      .notNull()
      .references(() => forks.id),
    verified_at: timestamp("verified_at").defaultNow().notNull(),
    repo_accessible: boolean("repo_accessible").default(false),
    repo_stars: integer("repo_stars"),
    detected_language: text("detected_language"),
    detected_min_ram_mb: integer("detected_min_ram_mb"),
    detected_features: text("detected_features"),
    readme_mentions: text("readme_mentions"),
    discrepancies: text("discrepancies"),
    status: verificationStatusEnum("status").default("pending").notNull(),
  },
  (table) => [
    index("idx_fork_verifications_fork_id").on(table.fork_id),
  ]
);

// --- User Submissions ---

export const submissionStatusEnum = pgEnum("submission_status", [
  "pending",
  "approved",
  "rejected",
]);

export const forkSubmissions = pgTable(
  "fork_submissions",
  {
    id: serial("id").primaryKey(),
    user_id: integer("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    github_url: text("github_url").notNull(),
    description: text("description"),
    language: text("language"),
    status: submissionStatusEnum("status").default("pending").notNull(),
    reviewer_notes: text("reviewer_notes"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_fork_submissions_user_id").on(table.user_id),
    index("idx_fork_submissions_status").on(table.status),
  ]
);

// --- SEO Infrastructure ---

// Stores content fingerprints to prevent indexing duplicate or near-duplicate pSEO pages at scale.
// Keyed by (page_type, exact_hash). canonical_path may point to another URL when we intentionally canonicalize.
export const seoFingerprints = pgTable(
  "seo_fingerprints",
  {
    id: serial("id").primaryKey(),
    page_type: text("page_type").notNull(),
    canonical_path: text("canonical_path").notNull(),
    exact_hash: text("exact_hash").notNull(), // sha256 hex over normalized SEO text
    simhash64: text("simhash64").notNull(), // 16-char hex
    simhash_band0: integer("simhash_band0").notNull(),
    simhash_band1: integer("simhash_band1").notNull(),
    simhash_band2: integer("simhash_band2").notNull(),
    simhash_band3: integer("simhash_band3").notNull(),
    word_count: integer("word_count").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("uniq_seo_fingerprints_type_hash").on(table.page_type, table.exact_hash),
    index("idx_seo_fingerprints_type_band0").on(table.page_type, table.simhash_band0),
    index("idx_seo_fingerprints_type_band1").on(table.page_type, table.simhash_band1),
    index("idx_seo_fingerprints_type_band2").on(table.page_type, table.simhash_band2),
    index("idx_seo_fingerprints_type_band3").on(table.page_type, table.simhash_band3),
    index("idx_seo_fingerprints_canonical_path").on(table.canonical_path),
  ]
);
