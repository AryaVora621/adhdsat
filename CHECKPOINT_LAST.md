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
- Question bank: 551 -> 599 (three verified authored batches, 48 originals across
  all 8 domains, official Digital SAT format). Live count confirmed 599.

## In progress
- Nothing actively mid-edit. Clean working tree, all pushed to main.

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
