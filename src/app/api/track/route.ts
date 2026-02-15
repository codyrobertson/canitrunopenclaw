import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Ensure the page_views table exists
let tableCreated = false;
function ensureTable() {
  if (tableCreated) return;
  db().exec(`
    CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      referrer TEXT,
      user_agent TEXT,
      country TEXT,
      viewed_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  // Create indexes if they don't exist
  db().exec(`CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path)`);
  db().exec(`CREATE INDEX IF NOT EXISTS idx_page_views_date ON page_views(viewed_at)`);
  tableCreated = true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, referrer, userAgent } = body as {
      path?: string;
      referrer?: string;
      userAgent?: string;
    };

    if (!path) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    ensureTable();

    // Extract country from Vercel/Cloudflare headers if available
    const country =
      request.headers.get("x-vercel-ip-country") ??
      request.headers.get("cf-ipcountry") ??
      null;

    db()
      .prepare(
        "INSERT INTO page_views (path, referrer, user_agent, country) VALUES (?, ?, ?, ?)"
      )
      .run(path, referrer || null, userAgent || null, country);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to track" }, { status: 500 });
  }
}
