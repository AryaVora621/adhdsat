# Task Queue - ADHDSat

## Done
- [x] Schema migrations (idempotent ALTER TABLE)
- [x] Question bank (246 Qs, 30+/domain, AI-generated via Gemini)
- [x] User identity (UUID, localStorage, /api/users upsert)
- [x] Onboarding wizard (3-step: scores, weak areas, confirm)
- [x] Backend endpoints (20 routes including review/SM-2/study-plan)
- [x] Adaptive difficulty (Gemini 2.5 Flash + rule-based fallback)
- [x] Sprint rewrite (real sprint_id, timer, SSE Deep Dive)
- [x] Dashboard (8 domain cards, predicted score, sprint history)
- [x] Profile page (/profile, editable name, XP/level/streak)
- [x] Sidebar (nav links, XP bar, streak)
- [x] KaTeX math rendering (MathText component)
- [x] Review Errors mode (/review, 5 questions, +25 XP bonus)
- [x] Question bank expansion script (server/generate-questions.js)
- [x] SM-2 spaced repetition (review_cards table, ease_factor, interval scheduling)
- [x] Study Plan widget (target score slider, test date, days/gap/sprints-per-day)
- [x] Keyboard shortcuts in Sprint (1-4 pick choice, Enter submit/advance, H hint)
- [x] Live per-question timer (gray/gold/red color coding)
- [x] Sprint summary screen (accuracy, XP, grade label, links)
- [x] Postgres migration: SQLite-in-/tmp -> shared Supabase Postgres (fixes prod
      data loss + onboarding 500). Async pg, schema-qualified, idempotent seed.
      Verified end-to-end against live DB.
- [x] Fixed broken 7-day stats query (wrong columns)
- [x] Friendly no-question retry state in Sprint; real README + .env.example

## In-Progress (2026-06-29)
- [ ] Expand question bank with more items modeled on the official Digital SAT
      (Bluebook) format + verified sources. NOTE: official CB/Bluebook items are
      copyrighted -- author original items matching official domains/skills/format,
      do not copy verbatim. Confirmed official spec via College Board:
      R&W 2x27Q@32min, Math 2x22Q@35min, 400-1600 scale, adaptive module 2.
- [x] Full practice-test option: DONE + verified live. New /practice-test page +
      /api/practice-test endpoint. R&W module (27Q/32min) -> break -> Math module
      (22Q/35min) -> difficulty-weighted 400-1600 scaled score. Entry in Sprint picker.
- [x] Practice-test history: DONE + verified live. practice_test_results table,
      POST /api/practice-test/result, GET /api/practice-test/history/:userId.
      Intro shows past-scores bar trend + best; results flag "New Personal Best!".
- [x] Added 16 authored questions (bank 551 -> 567), official-format originals.
- [x] Save these goals to memory + trackers so work survives a memory wipe.

## Roadmap (user direction 2026-06-29)
- [ ] Stripe subscription (WEB FIRST). User will set up the Stripe account soon.
      Tier gating already exists (plan-flag). Wire: Checkout session endpoint,
      webhook -> set users.plan='paid' on active sub, customer/sub ids on users,
      billing portal. Replace the placeholder POST /api/users/:id/plan upgrade.
- [ ] Mobile apps (iOS + Android) AFTER web subscription. SPA today; likely
      Capacitor or React Native wrap + StoreKit/Play Billing.

## Open (Future Phases)
- [ ] Leaderboards / friend challenges
- [ ] Push notifications / streak reminders
- [x] More question bank coverage (now 551, incl. 22 grid-ins; expanding further)
- [x] Port legacy dev scripts: ingest.js -> Postgres upsert sync tool, deleted
      redundant seed.js, generate-questions.js writes JSON (works as-is).
      Bank-expansion pipeline documented in README.
- [ ] Optional: move DB region or set Vercel region (DB is in Sydney)
