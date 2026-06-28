# Task Queue - ADHDSat

## Done
- [x] Schema migrations (idempotent ALTER TABLE)
- [x] Question bank (246 Qs, 30+/domain, AI-generated via Gemini)
- [x] User identity (UUID, localStorage, /api/users upsert)
- [x] Onboarding wizard (3-step: scores, weak areas, confirm)
- [x] Backend endpoints (15 routes including review endpoints)
- [x] Adaptive difficulty (Gemini 2.5 Flash + rule-based fallback)
- [x] Sprint rewrite (real sprint_id, timer, SSE Deep Dive)
- [x] Dashboard (8 domain cards, predicted score, sprint history)
- [x] Profile page (/profile, editable name, XP/level/streak)
- [x] Sidebar (nav links, XP bar, streak)
- [x] KaTeX math rendering (MathText component)
- [x] Review Errors mode (/review, 5 questions, +25 XP bonus)
- [x] Question bank expansion script (server/generate-questions.js)

## Open (Future Phases)
- [ ] SM-2 spaced repetition algorithm (currently: most-wrong-first)
- [ ] Leaderboards / friend challenges
- [ ] Custom study plans (date-based sprint goals)
- [ ] Push notifications / streak reminders
