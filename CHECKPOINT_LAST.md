# Checkpoint - ADHDSat (LIVE; active workstream: questions + full practice test)

## Status: LIVE at https://adhdsat.vercel.app

Comprehensively shipped & verified (features, AI, mobile, a11y, PWA, SEO).
Bank currently 551 questions (295 Math / 256 English, 22 grid-ins).

## Active workstream (started 2026-06-29) -- survives memory wipe
Goals also saved in memory: active-goals-questions-practice-test.md, and TASK_QUEUE.md.

1. Expand question bank with more items modeled on the official Digital SAT
   (Bluebook) format + verified sources. Author ORIGINAL items in the official
   format (CB/Bluebook questions are copyrighted -- do not copy verbatim).
2. Full practice-test option: complete SAT sim (R&W + Math modules, timed, 400-1600
   scale). Per-section test modes already exist (test-math, test-english in
   src/pages/Sprint.jsx `testModes` / `startSprint`).

## How to resume fast
- Add questions: edit server/data/questions.json, then `node --env-file=.env server/ingest.js`
  (idempotent upsert to Supabase). Schema sample in any existing question object.
- Grid-in items: is_grid_in:1, choices:[], grid_in_answer:<number>. Verified working.
- Deploy: `vercel --prod --yes` (token + env vars already configured).
- Official Digital SAT structure: R&W 2x27Q@32min, Math 2x22Q@35min, 400-1600 scale.

## Follow-ups (need user)
- Rotate the DB password (was shared in chat).
- Reviewer peer (claude-peers) unreachable all session.
