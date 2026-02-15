# Neon Environments (Prod / Staging / Test)

This project uses Neon Postgres via `@neondatabase/serverless` and **Vitest writes to the database** (for example, the duplicate-detector integration test). To keep production safe, tests must run against a dedicated test database.

## Environment Variables

- `DATABASE_URL`
  - Used by the app runtime (dev/staging/prod).
- `DATABASE_URL_TEST`
  - Used by tests (`vitest`) and any scripts run with `NODE_ENV=test`.
- `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`
  - Neon Auth configuration (set per environment in your deployment platform).

## Recommended Neon Setup

Use separate Neon branches (or separate Neon projects) for:

- `prod` (production)
- `staging` (preview environment / QA)
- `test` (CI + local tests)

Generate a connection string for each and wire them into your deployment/CI secrets:

- Production deploy: set `DATABASE_URL` to the prod connection string
- Staging/preview deploy: set `DATABASE_URL` to the staging connection string
- CI test job: set `DATABASE_URL_TEST` to the test connection string

## Local Env Files

This repo includes example templates:

- `.env.local.example` (dev)
- `.env.test.example` (tests)
- `.env.staging.example` (optional staging)

Typical local setup:

- `.env.local`: contains `DATABASE_URL=...`
- `.env.test`: contains `DATABASE_URL_TEST=...`
- `.env.staging`: contains `DATABASE_URL=...` (optional)

## Drizzle (Schema Push)

- `npm run db:push`
  - Push schema using `drizzle.config.ts` (loads `.env.local`, uses `DATABASE_URL`).
- `npm run db:push:test`
  - Push schema using `drizzle.config.test.ts` (loads `.env.test`, uses `DATABASE_URL_TEST`).
- `npm run db:push:staging` (optional)
  - Push schema using `drizzle.config.staging.ts` (loads `.env.staging`, uses `DATABASE_URL`).

## Seeding

Seeding is idempotent (it skips if the DB already has devices).

- `npm run db:seed` (dev)
- `npm run db:seed:test` (test DB)
- `npm run db:seed:staging` (optional staging)

## CI Checklist

Minimal CI steps for tests:

1. Set `DATABASE_URL_TEST` secret in CI.
2. Run `npm run db:push:test` before `npm test`.

If you ever change tests to require baseline data, add `npm run db:seed:test` before `npm test`.

