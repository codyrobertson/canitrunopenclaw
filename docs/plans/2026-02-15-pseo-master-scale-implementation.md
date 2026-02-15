# pSEO Master Scale Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish the pSEO scaling work: full SEO core adoption, real sitemap `<lastmod>`, caching + on-demand revalidation, scalable compare pagination, DB-driven internal linking, and safer Neon environment separation for tests.

**Architecture:** Keep SEO concerns centralized in `src/lib/seo/*`. Add DB timestamps for freshness, cache hot reads with safe Next cache wrappers, and revalidate affected pages/sitemaps on demand to protect Neon at 100k+ URLs.

**Tech Stack:** Next.js App Router (Next 16), Drizzle ORM, Neon Postgres, Vitest.

---

### Task 1: Finish SEO Core Adoption + JSON-LD Consistency

**Files:**
- Modify: `src/app/devices/[slug]/page.tsx`
- Modify: `src/app/devices/page.tsx`
- Modify: `src/app/benchmarks/page.tsx`
- Modify: `src/app/compare/page.tsx`

**Step 1: Refactor device detail metadata to use SEO core**
- Update `generateMetadata` in `src/app/devices/[slug]/page.tsx` to return `createMetadata({ title, description, canonicalPath: ... })`.
- Ensure canonical is `/devices/${device.slug}` and metadata includes robots/OG/Twitter consistently.

**Step 2: Replace inline JSON-LD `<script>` with builders**
- Replace the manual JSON-LD object with:
  - `buildProduct(...)` (include `aggregateRating` when available)
  - `buildBreadcrumbList(breadcrumbsForDevice(...))`
  - compose via `buildSchemaGraph([...])`
- Render via `<JsonLd data={...} />`.

**Step 3: Add Breadcrumb JSON-LD to hub/listing pages**
- Add `BreadcrumbList` JSON-LD to `/devices`, `/benchmarks`, and `/compare` (base pages) for consistency.

**Verify:** `npm run lint`

---

### Task 2: Add DB `updated_at` for Real `<lastmod>`

**Files:**
- Modify: `src/lib/schema.ts`
- Modify: `src/lib/queries.ts`

**Step 1: Add `updated_at` to core tables**
- Add `updated_at: timestamp(...).defaultNow().notNull()` to:
  - `devices`
  - `forks`
  - `compatibilityVerdicts`

**Step 2: Ensure writes bump timestamps**
- Update `updateVerdictTimings` to set `updated_at = now()` when timings change.

**Step 3: Push schema**
Run: `npm run db:push`
Expected: Drizzle adds `updated_at` columns.

---

### Task 3: Sitemap `<lastmod>` + Compare Pagination

**Files:**
- Modify: `src/lib/queries.ts`
- Modify: `src/lib/seo/sitemaps.ts`
- Modify: `src/lib/seo/sitemap-chunks.ts`
- Modify: `src/app/sitemap/[id].xml/route.ts`
- Test: `src/__tests__/sitemap-lastmod.test.ts`

**Step 1: Replace compare pair helpers**
- Implement:
  - `getComparisonPairCount(): Promise<number>`
  - `getComparisonPairsChunk(offset, limit): Promise<{ slug1; slug2; lastmod?: string }[]>`
- Update sitemap id generation to use `getComparisonPairCount()` (not `getComparisonPairs().length`).

**Step 2: Return sitemap items with `lastModified`**
- Update sitemap chunk queries to include freshness:
  - devices/forks: `updated_at`
  - can/guides: verdict `updated_at`
  - best: `MAX(updated_at)` per category+fork
  - compare: `GREATEST(d1.updated_at, d2.updated_at)`
- Update `getSitemapChunkItems` to set `lastModified` on items.

**Step 3: Cache sitemap chunk route**
- Change `src/app/sitemap/[id].xml/route.ts` to `export const dynamic = "force-static";` so ISR caching works and on-demand revalidation can invalidate it.

**Step 4: Add a test for lastmod**
- Add `src/__tests__/sitemap-lastmod.test.ts` to assert:
  - a non-static sitemap chunk includes at least one `lastModified` when items exist.

**Verify:** `npm test`

---

### Task 4: Caching Hot Reads + On-Demand Revalidation API

**Files:**
- Create: `src/lib/seo/cache.ts`
- Create: `src/app/api/revalidate/route.ts`
- Modify: `src/lib/queries.ts` (add cached wrappers or cached query helpers)
- Modify: `src/lib/seo/sitemap-chunks.ts` (use cached chunk queries where it helps)

**Step 1: Add safe cache wrapper**
- Implement a helper that uses `unstable_cache` only when running under Next runtime.
- In `NODE_ENV === "test"`, always fall back to direct execution (no caching).

**Step 2: Cache sitemap hot paths**
- Cache:
  - sitemap counts
  - sitemap chunk list queries
  - compare pair count + chunk queries

**Step 3: Add revalidation endpoint**
- `POST /api/revalidate`
- Auth via `REVALIDATE_SECRET` (header `x-revalidate-secret` or JSON field).
- Supports:
  - `paths: string[]` -> `revalidatePath`
  - `tags: string[]` -> `revalidateTag`
  - `mode: "sitemaps"` -> revalidate `/sitemap.xml` and every `/sitemap/{id}.xml` by querying chunk ids.

**Verify:** `npm run build`

---

### Task 5: Neon Prod/Staging/Test Separation (Stop Tests Writing to Prod)

**Files:**
- Modify: `src/lib/db.ts`
- Modify: `vitest.config.ts`
- Modify: `.env.local.example`

**Step 1: Prefer test DB URL**
- In `src/lib/db.ts`:
  - If `NODE_ENV === "test"` require `DATABASE_URL_TEST`
  - Use `DATABASE_URL_TEST` for the Neon client

**Step 2: Load `.env.test` in vitest**
- Update `vitest.config.ts` to:
  - set `process.env.NODE_ENV = "test"`
  - load `.env.test` first (override), then `.env.local`

**Step 3: Update env example**
- Add:
  - `DATABASE_URL_TEST=...`
  - `NEXT_PUBLIC_SITE_URL=...`
  - `REVALIDATE_SECRET=...`

**Verify:** `npm test` should fail fast if `DATABASE_URL_TEST` is missing (safe default).

---

### Task 6: DB-Driven Internal Linking Graph (Hub/Spoke)

**Files:**
- Create: `src/lib/seo/link-engine.ts`
- Modify: `src/lib/queries.ts`
- Modify: `src/app/can/[fork]/run-on/[device]/page.tsx`
- Modify: `src/app/guides/[slug]/page.tsx`

**Step 1: Add query helpers for “related”**
- For `/can/*`, fetch a few other runnable devices for the same fork in the same category (exclude current device).

**Step 2: Implement async link engine**
- Combine:
  - stable hub links (fork/device/best/guide)
  - DB-driven spokes (other can/guides)

**Step 3: Swap related link sections to use engine**
- Keep current link functions as fallback if DB query returns empty.

**Verify:** `npm run lint` + `npm test`

---

### Task 7: Final Verification

Run:
- `npm run lint`
- `npm test`
- `npm run build`

Expected:
- lint exits 0 (warnings ok)
- tests pass (using `DATABASE_URL_TEST`)
- build succeeds

