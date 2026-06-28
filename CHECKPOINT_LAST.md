# Checkpoint - ADHDSat Phase 4 Complete

## Session Summary

### This session shipped:
1. **Sprint mode selector** -- Adaptive/Math/English picker before every sprint; mode badge shown during questions
2. **Dashboard sprint cards** -- Three mode cards that launch directly into the right sprint (no picker shown)
3. **Today's Focus panel** -- AI + rule-based insights on Dashboard (due reviews, weakest domain, urgency)
4. **Profile: editable scores** -- Sliders for R&W + Math baseline (200-800)
5. **Profile: score report upload** -- Gemini Vision extracts scores, weak areas, and per-domain subscores
6. **Profile: reset profile** -- Danger Zone with confirmation, clears all data
7. **Deep adaptive fine-tuning** -- Score report subscores (priority 1-5 per domain) stored and fed into every adaptive question selection alongside target score + baseline gap
8. **DB migration** -- `users.subscores` column added idempotently
9. **Fixed 3 questions** with lowercase section names (`english/math` -> `English/Math`)

## Current git log
```
a1b2c3d feat: AI insights, deep score report fine-tuning, direct sprint launch
d2dfc0e feat: sprint mode selection, editable profile scores, reset profile
611c470 chore: final checkpoint -- project complete
```

## What's still open (potential next)
- More question bank depth for English passages (many English questions lack passage_text)
- Configurable sprint length (5/10/15 questions)  
- Sprint review screen -- see specific questions you got wrong after a sprint
- Push notification / streak reminders (marked Future Phase)

## Server
- 21 REST endpoints
- Run: `node server/index.js &` (port 3001)
- Frontend: `npx vite --port 5173`

## Human Decisions Needed
None.
