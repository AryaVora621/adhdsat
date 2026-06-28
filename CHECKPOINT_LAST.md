# Checkpoint - ADHDSat Phase 4

## Completed This Session

### Sprint Mode Selection
- Mode picker screen before each sprint: Adaptive / Math / English
- Section badge shown during sprint (MATH / ENGLISH pill)
- `/api/questions/next?section=math|english` filters to correct domains
- "Sprint Again" resets to mode picker (user can switch modes)

### Profile Enhancements
- Editable baseline scores via sliders (R&W + Math 200-800)
- "Upload Score Report" button -- Gemini Vision extracts scores + weak areas, auto-saves
- Danger Zone: Reset Profile button with confirmation (clears all progress, XP, streaks)
- `POST /api/users/:id/reset` endpoint

## Still Open / Next Priority

### Score Report Fine-Tuning (deeper AI integration)
- Score report upload works but adaptive question selection doesn't specifically weight
  the per-subdomain subscores that Gemini extracts -- just weak_areas array
- Could add a `subscores` JSON field to users table to store per-subdomain breakdowns
- Then pass subscores to `getAdaptiveCriteria` for finer-grained targeting

### English-Specific Sprint Improvements
- Reading passages are sparse for English-heavy sprints -- could expand passage questions
- Some English questions may not have `passage_text` even where one is expected

### Onboarding Re-entry
- After "Reset Profile", user lands on Profile page with reset data but doesn't get
  redirected through onboarding again. Could redirect to /onboarding if !onboarding_completed

### Question Bank Quality
- 532 questions but coverage across difficulty levels is uneven
- Could run more generation passes for 'easy' and 'hard' in underrepresented domains

## Server Status
- Backend: `node server/index.js` on port 3001
- Frontend: `npx vite --port 5173`
- 20 REST endpoints

## Human Decisions Needed
None -- waiting on user direction for next phase.
