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
  tokens_per_sec REAL,
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
