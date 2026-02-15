# pSEO Master Scale Design

**Date:** 2026-02-15

**Goal:** Safely scale to 100,000+ programmatic SEO pages without crawl budget waste, duplicate/thin content, or Neon DB overload.

## Scope

- Centralize SEO concerns: metadata, canonical/robots, OG/Twitter, and JSON-LD builders.
- Ensure every route uses the SEO core (including non-pSEO routes like device detail).
- Emit real `<lastmod>` in chunked sitemaps from DB timestamps (not build time).
- Add caching + on-demand revalidation so bots/users don’t stampede Neon.
- Make compare + internal linking scalable (DB-backed pagination; DB-driven hub/spoke links).
- Operational hardening: separate DB URLs for prod/staging/test and keep lint/CI clean.

## Architecture Decisions

### 1) SEO Core Usage Everywhere

- Use `src/lib/seo/metadata.ts` (`createMetadata`) everywhere for:
  - `title`, `description`
  - `alternates.canonical`
  - `robots` (index/follow)
  - consistent Open Graph + Twitter defaults
- For listing pages with query params (ex: `/devices?q=...`), use `src/lib/seo/listings.ts` (`createFilterAwareMetadata`) to avoid index bloat:
  - Canonicalize to the clean base path
  - `noindex` when filters are present

### 2) JSON-LD as Composable Builders

- All pages render JSON-LD via `src/components/json-ld.tsx`.
- JSON-LD payloads are built via `src/lib/seo/schema.ts` builders and composed into a graph via `buildSchemaGraph`.
- Minimum consistency rule:
  - Every indexable “hub” page includes a `BreadcrumbList`.
  - Context pages include their relevant schema types:
    - Device detail: `Product` + `BreadcrumbList`
    - Can/Best/Compare: `TechArticle` + `FAQPage`/`BreadcrumbList` where applicable
    - Guides: `HowTo` + `BreadcrumbList`

### 3) Real `<lastmod>` for Sitemap Freshness

- Add `updated_at` timestamps to key tables used to generate pSEO pages:
  - `devices.updated_at`
  - `forks.updated_at`
  - `compatibility_verdicts.updated_at`
- Sitemap chunk queries return `{ slug, updated_at }` (or computed `lastmod`) so route handlers emit `<lastmod>`.
- Use computed `lastmod` for compound pages:
  - `/can/*` and `/guides/*`: `compatibility_verdicts.updated_at`
  - `/best/*`: `MAX(compatibility_verdicts.updated_at)` per `(category,fork)`
  - `/compare/*`: `GREATEST(d1.updated_at, d2.updated_at)` (good enough; avoids huge joins)

### 4) Caching + On-Demand Revalidation

- Introduce a safe caching wrapper around `next/cache` (`unstable_cache`) that:
  - Uses Next incremental cache in real runtime
  - Falls back to direct execution in `vitest`/non-Next environments to avoid errors
- Cache “hot” reads used across many pages:
  - entity lookups: device/fork by slug
  - verdict combo read for `/can/*` + `/guides/*`
  - sitemap chunk queries (counts + chunk lists)
- Add `src/app/api/revalidate/route.ts` protected by `REVALIDATE_SECRET`:
  - Accept `{ paths?: string[], tags?: string[], mode?: "sitemaps" | "pseo" }`
  - Revalidate specific pages and/or all sitemap endpoints on demand

### 5) Compare + Internal Linking “Graph”

- Replace `getComparisonPairs()` (hard `LIMIT 200`) with DB-backed pagination:
  - `getComparisonPairCount()`
  - `getComparisonPairsChunk(offset, limit)`
- Create an async internal-link engine that uses DB to suggest siblings/spokes:
  - For `/can/*`: other runnable devices in same category for this fork (links to other `/can/*`)
  - For `/guides/*`: link to the verdict page + best page + a few other device guides for the fork
  - Keep breadcrumbs stable (pure functions remain in `src/lib/seo/links.ts`)

### 6) Operational Hardening

- DB env separation:
  - `DATABASE_URL` for dev/prod (configured by environment)
  - `DATABASE_URL_TEST` required for vitest (tests write; must not hit prod)
- Update `vitest.config.ts` to load `.env.test` first (if present) and enforce `NODE_ENV="test"`.
- Keep `npm run lint` non-failing (errors = 0; warnings acceptable unless CI wants strict mode).

## Non-Goals (For This Pass)

- Full materialized `pseo_pages` table + background job pipeline for precomputed page graphs.
- Trigger-based `updated_at` maintenance in Postgres (we’ll maintain timestamps in app writes; can add DB triggers later if needed).

