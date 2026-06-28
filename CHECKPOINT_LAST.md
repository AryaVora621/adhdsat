# Checkpoint - ADHDSat Premium Shippable

## Status: Premium Product Complete

### This Session's Additions

**Mobile Responsive Layout**
- BottomNav component: fixed bottom tabs (Home/Sprint/Review/Profile) on <768px
- useIsMobile hook in App.jsx swaps Sidebar → BottomNav
- Dashboard: responsive padding clamp(16px,5vw,48px), 2-col domain grid on mobile
- Sprint/Review: passage+question stacks column on mobile, math overflow fix
- All page paddings use clamp() -- fluid on any screen size

**Onboarding Improvements**
- Step 3 now collects target score (slider) + test date (date input)
- Auto-saves study plan on completion so Dashboard Study Plan widget pre-populates
- Gap display shows points needed from baseline to target

**Streak Calendar**
- Sidebar: 7-day "THIS WEEK" activity calendar (colored dots for study days)
- Server: /api/activity-days/:userId endpoint (last 7 days of practice)

**Domain Card Empty States**
- Shows "No data yet" (italic, muted) instead of "--"
- Card border only activates (colored by accuracy) once data exists

**Practice Test Mode**
- Sprint picker: "PRACTICE TEST" section with Math Test (22q/35min) and English Test (27q/32min)
- Gold styling to distinguish from regular sprint modes
- Countdown timer (cyan >10min, gold 5-10min, red <5min)
- Hints disabled in test mode (real SAT has no hints)
- Summary: "Test Complete!" + "Practice Test Simulation" badge + time used
- Auto-ends sprint when countdown reaches 0

**Algorithm Improvements**
- Rule-based fallback now prioritizes untried domains (coverage-first)
- Difficulty varies: easy <40% acc, medium default, hard >75% acc
- Test mode timer fires endSprintRef when time expires

**Review Badge**
- BottomNav now shows red badge with count of pending review cards

---

## Full Feature Set

### Core Sprint Loop
- [x] Adaptive, Math, English sprint modes
- [x] Practice Test modes (Math 35min, English 32min) -- NEW
- [x] Sprint length selector (5/10/15/20 questions)
- [x] SM-2 spaced repetition for review queue
- [x] KaTeX math rendering (inline + passage)
- [x] SSE streaming explanations (Gemini Deep Dive)
- [x] Hint system (2 hints/question, disabled in test mode)
- [x] Keyboard shortcuts (1-4 pick, Enter submit, H hint)
- [x] Wrong answer review cards post-sprint (expandable)
- [x] Domain breakdown on summary screen

### ADHD Optimization
- [x] Study Now button (1-click start, no decision fatigue)
- [x] Session mode memory (skip mode picker on return)
- [x] Time milestone toasts (2/5/10 min)
- [x] Confetti on personal best accuracy
- [x] Domain neglect alerts (hyperfocus trap prevention)
- [x] Change-mode escape (only on Q1, not mid-sprint)
- [x] Session recovery: resume prompt after refresh/crash
- [x] prefers-reduced-motion accessibility
- [x] Streak calendar (7-day visual motivation)
- [x] Review count badge on BottomNav

### Intelligence
- [x] Score report upload → Gemini Vision → per-domain subscores
- [x] Adaptive question selection (Gemini + improved rule-based fallback)
- [x] Section filtering (Math/English domains per mode)
- [x] AI insights + Today's Focus panel on Dashboard
- [x] Predicted score range (unlocks at 10+ questions)

### Dashboard & Progress
- [x] Welcome + total questions answered
- [x] Study Plan widget (target score, test date, gap, sprints/day)
- [x] Today's Focus (AI + rule-based insights)
- [x] Sprint mode cards (Adaptive/Math/English with hover states)
- [x] Review Errors CTA (shows count, links to review queue)
- [x] Domain performance grid (4x2, with accuracy + "No data yet" empty state)
- [x] Accuracy sparkline chart (SVG, trend label)
- [x] Recent sprint history rows

### Mobile
- [x] BottomNav with review badge
- [x] Responsive padding (clamp)
- [x] 2-column domain grid
- [x] Single-column sprint mode cards
- [x] Column passage layout
- [x] Math overflow auto-scroll

### Profile
- [x] Display name editing
- [x] Baseline scores with sliders (editable)
- [x] Score report upload (Gemini Vision analysis)
- [x] XP / level / streak progress display
- [x] Focus areas selector
- [x] Subscores from uploaded report
- [x] CSV export of question history
- [x] Danger Zone: reset profile (with confirmation)

### Infrastructure
- [x] 25 REST endpoints on Express 5
- [x] SQLite via better-sqlite3 (idempotent migrations)
- [x] Rule-based fallback for all Gemini calls (never breaks)
- [x] GEMINI_API_KEY in .env (gitignored)
- [x] Vite HMR dev + production build
- [x] 532 questions (all with hints + explanations)

---

## Git Log (This Session)
```
feat: test mode polish
feat: practice test mode + review badge + adaptive algorithm improvements
feat: streak calendar + domain empty states + activity endpoint
feat: mobile responsive layout + onboarding study plan
```

## Server Status
- Port 3001: Backend running
- Port 5173: Frontend HMR active
- 25 REST endpoints

## Human Decisions Needed
- Optional: push to Vercel/Railway for deployment
- Optional: add more SAT questions (currently 532)
- Optional: add push notifications for daily study reminders
