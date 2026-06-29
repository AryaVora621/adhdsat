# Checkpoint - ADHDSat

Agent: Claude Opus 4.8 (Claude Code)
Updated: 2026-06-29
Status: LIVE at https://adhdsat.vercel.app

## Completed (this workstream, all live on prod)
- Full practice test: /practice-test page + /api/practice-test. R&W module
  (27Q/32min) -> break -> Math module (22Q/35min) -> scaled 400-1600. Verified
  end-to-end in browser.
- Practice-test history: practice_test_results table, POST result + GET history
  endpoints. Intro shows past-scores bar trend + best; results flag "New Personal
  Best!". Verified live (chart renders, best highlighted gold).
- Dashboard practice-test card: best/last score + Start/Retake CTA, after Review
  Errors. Makes the feature discoverable. Verified live.
- Post-test answer review: results screen offers "Review your answers (N missed)"
  with Missed-only / All filter. Each card shows the student's pick vs correct
  (color-coded YOURS/ANSWER), passage, and explanation. Verified live. Turns the
  test into a study tool.
- Practice-test mistakes -> review queue: POST /api/answers/batch records every
  answer on completion; missed questions enter the SM-2 queue (verified: a wrong
  answer became a due review card) and answers enrich domain stats/predicted score.
- Question bank: 551 -> 599 (three verified authored batches, 48 originals across
  all 8 domains, official Digital SAT format). Live count confirmed 599.

## In progress (2026-06-29, user asked for polish + 1000 questions + tiers)
- Polish pass: DONE core. Fixed mobile bug where Check Answer/Hint buttons sat
  under the bottom nav -> added focus mode (hide mobile nav on /sprint, /review,
  /practice-test). Relabeled single-module tests ("Math Module", "Reading &
  Writing Module") vs Full Practice Test. Verified all screens clean, 0 console
  errors. Live.
- Questions -> 1000+: gen-verify.mjs pipeline (server/gen-verify.mjs) generates
  via Gemini then INDEPENDENTLY re-solves each item, keeping only answer-key
  matches. Running in background toward ~51/domain (~408 new). Output staged in
  server/data/generated-staging.json. NEXT: when done, validate + merge into
  questions.json, ingest, deploy, verify count >= 1000.
- Tiers (free vs paid): DONE + verified live. Balanced model, plan-flag only (no
  payments). users.plan column; getPlan() gates sprint daily limit (3/day),
  timed modules, practice test, /explain, /analyze-report, AI insight sentence.
  /upgrade screen + POST /api/users/:id/plan. Profile badge, Dashboard PRO lock.
  Verified: free blocked at 403, 4th sprint blocked, upgrade flips to paid,
  paid unlocks. Also fixed a Study-Now double sprint-create.
- Questions -> 1000: gen-verify nearly done (~353/408 staged). When complete:
  node server/merge-staging.mjs ; node --env-file=.env server/ingest.js ; deploy.

## Next actions (priority order)
1. HUMAN: rotate the Supabase DB password (pasted in chat earlier). The one true
   launch blocker. Supabase dashboard -> Database -> Reset password, then update
   DATABASE_URL in Vercel env. ~5 min.
2. Keep growing the question bank toward 700+ (proven authoring + ingest pattern).
3. Optional: notifications/streak reminders; leaderboards (future phases).

## Human decisions needed
- DB password rotation (only the user can do this).

## How to expand questions
Edit server/data/questions.json (or stage a batch file), validate (one correct
choice per MC), then: node --env-file=.env server/ingest.js (idempotent upsert).
