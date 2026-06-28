# Checkpoint - ADHDSat Premium Shippable

**Updated:** 2026-06-28

## Status: SHIPPABLE

The product is feature-complete, bug-free, and ready to ship. All remaining work is optional enhancements (deployment, more questions, push notifications).

---

## This Session's Additions (post-compaction)

- **Keyboard shortcut hint** below answer choices ("1-4 to select · Enter to check · H for hint")
- **ErrorBoundary** wraps entire app -- crashes show recovery UI, never blank screen
- **Health endpoint** `/api/health` returns status + question count, deployment-ready
- **Enter key on summary screen** now correctly navigates to Dashboard (was a dead hint)
- **Study Plan no-test-date fix** -- "Test date passed" was shown when no date was set; now hides gracefully
- **Emoji removal** -- 3 raw emoji replaced with Lucide icons (Onboarding 🎯 → Target, Dashboard 📊 → BarChart2, Study Now ⚡ → text)
- **Difficulty-weighted score prediction** (hard=2x, medium=1.5x, easy=1x)
- **Review sprint summary screen** (grade/XP/SM-2 message/Review More button)
- **Daily sprint goal tracker** (3-pip progress bar + /api/today/:userId endpoint)
- **Pre-fetch next question** while user reads explanation (instant transitions)
- **MathText in wrong answer explanations** (math questions now render KaTeX in summary)
- **Grid-in autoFocus** -- text input auto-focused when grid-in question loads
- **Duplicate shortcut hint removed** from question header

---

## Complete Feature Set

### Core Sprint Loop
- [x] Adaptive, Math, English sprint modes
- [x] Practice Test modes (Math 22q/35min, English 27q/32min)
- [x] Sprint length selector (5/10/15/20 questions), persisted
- [x] SM-2 spaced repetition for review queue
- [x] KaTeX math rendering (inline + passage)
- [x] SSE streaming explanations (Gemini Deep Dive)
- [x] Hint system (2 hints/question, disabled in test mode)
- [x] Keyboard shortcuts (1-4 pick, Enter submit/advance, H hint)
- [x] Wrong answer review cards post-sprint (expandable + MathText)
- [x] Domain breakdown on summary screen
- [x] Question pre-fetching for instant transitions

### ADHD Optimization
- [x] Study Now button (1-click start, no decision fatigue)
- [x] Session mode memory (skip mode picker on return)
- [x] Daily sprint goal tracker (3-pip progress bar)
- [x] Time milestone toasts (2/5/10 min)
- [x] Confetti on personal best accuracy
- [x] Domain neglect alerts (hyperfocus trap prevention)
- [x] Change-mode escape (only on Q1)
- [x] Session recovery: resume prompt after refresh/crash
- [x] prefers-reduced-motion accessibility
- [x] Streak calendar (7-day visual)
- [x] Review count badge on BottomNav
- [x] LevelUpToast notification
- [x] Grid-in autofocus for keyboard flow

### Intelligence
- [x] Score report upload → Gemini Vision → per-domain subscores
- [x] Adaptive question selection (Gemini + rule-based fallback)
- [x] Section filtering (Math/English domains per mode)
- [x] AI insights + Today's Focus panel on Dashboard
- [x] Difficulty-weighted predicted score range

### Dashboard & Progress
- [x] Welcome + total questions answered
- [x] Study Plan widget (target score, test date optional, gap, sprints/day)
- [x] Today's Focus (AI + rule-based insights)
- [x] Sprint mode cards (Adaptive/Math/English)
- [x] Review Errors CTA (count + link)
- [x] Domain performance grid (4x2, "No data yet" empty state)
- [x] Accuracy sparkline chart (SVG, trend label, 1/2+ sprints)
- [x] Predicted score range (unlocks at 10+ questions)

### Mobile
- [x] BottomNav with review badge (fixed bottom, iOS safe area)
- [x] Responsive padding (clamp)
- [x] 2-column domain grid
- [x] Single-column sprint mode cards
- [x] Column passage layout

### Profile
- [x] Display name editing (inline, Enter to save)
- [x] Baseline scores with sliders
- [x] Score report upload (Gemini Vision)
- [x] XP / level / streak progress display
- [x] Focus areas selector
- [x] Domain accuracy bars
- [x] Sprint history table
- [x] CSV export of question history
- [x] Danger Zone: reset profile (2-step confirmation)

### Infrastructure
- [x] 26 REST endpoints on Express 5
- [x] /api/health endpoint
- [x] SQLite via better-sqlite3 (idempotent migrations)
- [x] Rule-based fallback for all Gemini calls
- [x] GEMINI_API_KEY in .env (gitignored)
- [x] 532 questions (all with hints + explanations)
- [x] ErrorBoundary wrapping entire app

---

## Human Decisions Needed
- Deploy to Vercel/Railway (env vars: GEMINI_API_KEY, PORT)
- Optional: add more SAT questions (currently 532)
- Optional: push notifications for daily study reminders
