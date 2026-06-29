# Checkpoint - ADHDSat (SHIPPED & LIVE)

## Status: LIVE in production at https://adhdsat.vercel.app

Verified the full flow on the LIVE site in a real browser:
onboarding -> adaptive sprint -> correct answer -> +20 XP -> persisted.
Zero console errors. All API routes 200.

## What it took (this session)
1. Root-caused prod 500s: SQLite-in-/tmp (ephemeral, per-instance) -> migrated
   the entire backend to shared Supabase Postgres (project rhhpshsyrvckouqtyeov).
2. Rewrote server to async pg; onboarding upsert; schema-qualified all tables
   (Supabase transaction pooler resets search_path).
3. Fixed broken 7-day stats query; graceful /api/users error screen; Sprint retry.
4. Ported ingest.js to Postgres upsert; removed seed.js; README + .env.example.
5. Vercel env: DATABASE_URL was saved EMPTY -> reset it correctly via CLI
   (--value, sensitive) for prod/preview/dev. GEMINI_API_KEY present.
6. Vercel routing: nested /api/x/y returned NOT_FOUND (catch-all only matched
   single segment with version:2 + static output). Fixed with rewrite
   /api/:path* -> /api/[...slug]. All nested routes now 200.
7. Deployed via CLI (vercel --prod). Cleaned 15 test users from the DB.

## Repo state
All committed + pushed to main (HEAD has vercel.json routing fix b4e972f).
Env vars live in Vercel project. DB shared + persistent.

## Follow-ups (optional, non-blocking)
- DB region is Sydney (ap-southeast-2): trans-Pacific latency if users/functions
  are elsewhere. Consider Vercel region syd1 or a closer DB.
- DB password was pasted in chat: rotate it for a real-user launch.
- 11 leftover test users in DB (browser test UUIDs); harmless.
- Reviewer peer went offline mid-session.
