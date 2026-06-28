# Checkpoint - ADHDSat Full Build

## Completed
All 10 build goals implemented and browser-verified:

1. Schema migrations - idempotent ALTER TABLE for users + questions tables
2. Question bank - 80 SAT questions (10/domain) in server/data/questions.json, server/ingest.js
3. User identity - crypto.randomUUID() in localStorage, POST /api/users upsert, onboarding redirect
4. Onboarding - 3-step wizard (score sliders + upload, domain multiselect, confirm + sprint CTA)
5. Backend endpoints - all 13 endpoints in server/index.js
6. Adaptive difficulty - Gemini Flash criteria selection with rule-based fallback
7. Sprint rewrite - real sprint_id, timer, single-question adaptive fetch, Deep Dive SSE streaming
8. Dashboard - 8 domain cards with live accuracy %, predicted score banner, sprint history
9. Profile page - /profile route with editable name, scores, XP/level/streak, domain accuracy bars
10. Sidebar - nav links, real XP bar (level N = N*500), streak + best streak

## Browser Verification (2026-06-28)
- /onboarding: all 3 steps work, slider/domain selection, confirm summary correct
- /sprint: adaptive picks weak area (Advanced Math), correct/wrong highlighting, Deep Dive button on wrong
- XP sidebar updates in real-time (20 XP correct, 5 XP wrong, streak increments)
- /dashboard: Advanced Math shows 50% (1/2 correct), other domains show --
- /profile: 630/730 scores, 25 XP, Level 1, 1d streak, XP progress bar, Focus Areas editor

## In Progress
- Git commit (all changes unstaged)

## Next Action
Commit all files with `git add` + `git commit`

## Human Decisions Needed
None - build is complete. Optional Phase 2: spaced repetition review, more questions ingested.
