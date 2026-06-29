# Checkpoint - ADHDSat (CODE-COMPLETE, awaiting Vercel env var)

## State: code-complete + verified end-to-end. One user action left.

## Shipped & pushed (HEAD 55bd664)
- Postgres migration (Supabase): fixes prod data loss + onboarding 500.
- All table refs schema-qualified (transaction pooler resets search_path).
- Graceful error screen when /api/users fails (was broken onboarding).
- Fixed 7-day stats query; Sprint no-question retry state.
- ingest.js ported to Postgres upsert sync; seed.js removed; README + .env.example;
  bank-expansion pipeline (generate -> ingest) documented.

## Verified
- Backend flow test vs LIVE Supabase: predicted score, SM-2 review, streak, XP.
- Full app driven in a real BROWSER vs Postgres: onboarding -> sprint -> correct
  answer -> +20 XP -> streak; Profile + Review pages. Zero console errors.
- HEAD smoke test: build green, health 200, fresh onboarding 200 + persists.
- ingest.js: synced 529 questions, bank holds 529.

## THE ONLY BLOCKER (user action - cannot be done by Claude)
Production has no DATABASE_URL. Confirmed via prod: ECONNREFUSED 127.0.0.1:5432.
Vercel MCP has no env-write tool; it's the user's account.
Fix (either):
  A. Vercel dashboard -> adhdsat -> Settings -> Environment Variables ->
     add DATABASE_URL (Supabase transaction-pooler string) to all 3 envs -> Redeploy.
  B. User runs `npm i -g vercel && vercel login`, then Claude runs
     `vercel env add DATABASE_URL` + GEMINI_API_KEY + `vercel --prod`.

## Notes
- Reviewer peer (1jowzo8v) went offline mid-session; peer messaging errors.
  It landed commit 7b73900 (safe). Shared-repo: a concurrent actor reset a commit
  once; re-pushed cleanly.
- DB is in Sydney (ap-southeast-2); trans-Pacific latency. Optional: set Vercel
  region syd1 or move DB.
- DB password was pasted in chat; rotate after setup if this is real-user.
