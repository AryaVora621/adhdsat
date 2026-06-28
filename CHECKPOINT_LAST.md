# Checkpoint - ADHDSat COMPLETE

## All Features Shipped

### Core Study Loop
- Adaptive Sprint: Gemini 2.5 Flash selects domain+difficulty from user history; rule-based fallback
- Per-question live timer (gray/gold/red), keyboard shortcuts (1-4, Enter, H)
- Sprint summary: accuracy, XP, grade, per-domain breakdown with accuracy bars + time

### Question Bank
- 532 questions across all 8 SAT domains (spec target: 500+)
- Generator: `node server/generate-questions.js [domain] [count]` -- 4x retry with backoff

### Review Mode (SM-2 Spaced Repetition)
- Wrong answers scheduled via SM-2 algorithm (ease_factor, interval_days)
- "Next review in Nd" badge after each answer
- Keyboard shortcuts match Sprint (1-4/Enter)

### AI Features
- Gemini 2.5 Flash: adaptive difficulty, Deep Dive explanations (SSE streaming)
- Score report upload: Gemini Vision auto-fills onboarding baseline
- All Gemini calls have rule-based fallback

### Study Plan
- Target score (slider) + test date picker
- Shows: days left (color-coded), score gap, sprints/day needed, progress bar

### Gamification
- XP/levels (500 XP per level), level-up toast animation
- Day streak + best streak tracking
- +25 XP bonus for review correct answers

### Dashboard
- Study Plan widget, 8-domain performance grid with trend arrows
- Predicted score range (unlocks after 10 questions answered)
- Sprint History table

### Profile
- Editable display name
- Scores, XP progress bar, domain accuracy bars
- Focus area multi-select, sprint history

## Server
- 19 REST endpoints
- Running on port 3001: `node server/index.js &`

## Human Decisions Needed
None -- project is complete and verified.
