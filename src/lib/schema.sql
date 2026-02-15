CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  cpu TEXT,
  ram_gb REAL NOT NULL,
  storage TEXT,
  gpu TEXT,
  power_watts REAL,
  price_usd REAL,
  price_type TEXT DEFAULT 'one-time',
  image_url TEXT,
  buy_link TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS forks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  github_url TEXT,
  description TEXT,
  tagline TEXT,
  creator TEXT,
  created_year INTEGER,
  github_stars INTEGER DEFAULT 0,
  maturity TEXT DEFAULT 'beta' CHECK(maturity IN ('alpha', 'beta', 'stable', 'archived')),
  last_commit_date TEXT,
  min_ram_mb INTEGER NOT NULL,
  min_cpu_cores INTEGER DEFAULT 1,
  min_storage_mb INTEGER DEFAULT 100,
  language TEXT,
  codebase_size_lines INTEGER,
  license TEXT,
  features TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS compatibility_verdicts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL REFERENCES devices(id),
  fork_id INTEGER NOT NULL REFERENCES forks(id),
  verdict TEXT NOT NULL CHECK(verdict IN ('RUNS_GREAT', 'RUNS_OK', 'BARELY_RUNS', 'WONT_RUN')),
  notes TEXT,
  cold_start_sec REAL,
  warm_response_sec REAL,
  UNIQUE(device_id, fork_id)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT
);

CREATE TABLE IF NOT EXISTS user_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL REFERENCES devices(id),
  fork_id INTEGER NOT NULL REFERENCES forks(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  stars INTEGER NOT NULL CHECK(stars >= 1 AND stars <= 5),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(device_id, fork_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL REFERENCES devices(id),
  fork_id INTEGER REFERENCES forks(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS affiliate_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL REFERENCES devices(id),
  network TEXT NOT NULL,
  url TEXT NOT NULL,
  affiliate_tag TEXT,
  label TEXT,
  priority INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  affiliate_link_id INTEGER NOT NULL REFERENCES affiliate_links(id),
  clicked_at TEXT NOT NULL DEFAULT (datetime('now')),
  referrer TEXT
);

CREATE TABLE IF NOT EXISTS user_verdicts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  device_id INTEGER NOT NULL REFERENCES devices(id),
  fork_id INTEGER NOT NULL REFERENCES forks(id),
  verdict TEXT NOT NULL CHECK(verdict IN ('RUNS_GREAT', 'RUNS_OK', 'BARELY_RUNS', 'WONT_RUN')),
  notes TEXT,
  evidence_url TEXT, -- screenshot URL, video link, or ClawBench result
  verified INTEGER DEFAULT 0, -- 0=unverified, 1=community verified, 2=clawbench verified
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, device_id, fork_id) -- one verdict per user per device+fork combo
);

CREATE TABLE IF NOT EXISTS verdict_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  user_verdict_id INTEGER NOT NULL REFERENCES user_verdicts(id),
  vote INTEGER NOT NULL CHECK(vote IN (1, -1)),
  UNIQUE(user_id, user_verdict_id) -- one vote per user per verdict
);

CREATE TABLE IF NOT EXISTS benchmark_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL REFERENCES devices(id),
  fork_id INTEGER NOT NULL REFERENCES forks(id),
  user_id INTEGER REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running', 'completed', 'failed')),
  docker_image TEXT,
  memory_limit_mb INTEGER,
  cpu_limit REAL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  error_message TEXT,
  raw_json TEXT -- full JSON output from ClawBench CLI
);

CREATE TABLE IF NOT EXISTS benchmark_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES benchmark_runs(id),
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('latency', 'capability', 'resource')),
  details TEXT -- JSON with extra info
);

CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  country TEXT,
  viewed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
CREATE INDEX IF NOT EXISTS idx_page_views_date ON page_views(viewed_at);

CREATE TABLE IF NOT EXISTS fork_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fork_id INTEGER NOT NULL REFERENCES forks(id),
  verified_at TEXT NOT NULL DEFAULT (datetime('now')),
  repo_accessible INTEGER DEFAULT 0,
  repo_stars INTEGER,
  detected_language TEXT,
  detected_min_ram_mb INTEGER,
  detected_features TEXT, -- JSON array
  readme_mentions TEXT, -- JSON of extracted requirement mentions
  discrepancies TEXT, -- JSON array of {field, stored, detected} objects
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'verified', 'discrepancy', 'inaccessible'))
);
