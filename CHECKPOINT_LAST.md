# Checkpoint - ADHDSat Postgres Migration (VERIFIED)

## Outcome
Migrated backend from broken SQLite-in-/tmp to shared Supabase Postgres.
Verified end-to-end against the LIVE DB. Production 500s root-caused and fixed.

## Root cause of prod 500s
better-sqlite3 wrote to /tmp = ephemeral + per-instance. POST /api/users and
POST /api/onboarding hit different serverless instances -> user row missing ->
`user.weak_areas` on undefined -> 500. study-plan 404 cascaded from that.

## What shipped (code)
- server/db.js: pg Pool, idempotent SCHEMA_DDL bootstrap (adhdsat schema) +
  batch question seed from server/data/questions.json on first boot.
- server/index.js: ALL handlers async Postgres. Onboarding is now an UPSERT
  (can't 500 on missing user). ANY/ALL array params, GROUP BY pk, substr dates,
  COUNT::int, JSON error-handler middleware.
- ALL table refs SCHEMA-QUALIFIED (adhdsat.*). Critical: Supabase transaction
  pooler (pgbouncer) resets search_path between queries, so SET search_path was
  unreliable -> intermittent "relation does not exist". Qualifying removed the
  dependency entirely.
- src/pages/Sprint.jsx: friendly no-question retry state (was dev jargon).
- README.md rewritten (real docs); .env.example added.
- .env: DATABASE_URL set locally (Sydney project rhhpshsyrvckouqtyeov).

## Verified against live Supabase DB
- Fresh-user onboarding -> 200 + persists (the exact prod bug). 
- Full flow: 532 questions seeded, predicted score ~1000, SM-2 review (5 due),
  streak, XP, fixed 7-day stats. All correct.
- Build passes (178KB gzip). Lint: only pre-existing exhaustive-deps warnings.

## REMAINING TO SHIP (user)
1. Add env vars to Vercel project (Production + Preview + Development):
   - DATABASE_URL = (the Sydney transaction-pooler string)
   - GEMINI_API_KEY = (existing key)
   Dashboard: Project -> Settings -> Environment Variables. (Vercel CLI not installed.)
2. Redeploy (push to main triggers it, or Vercel dashboard "Redeploy").
3. Perf note: DB is in Sydney (ap-southeast-2). If users/Vercel are elsewhere,
   trans-Pacific latency is high. Optionally set Vercel function region to syd1
   (vercel.json regions) OR move DB closer.

## Decisions Needed
- Commit? Changes are on main (uncommitted). Committing/pushing needs approval.
- Legacy dev scripts (server/seed.js, ingest.js, generate-questions.js) still use
  old SQLite API and will break if run; not used in prod. Delete or port later.
