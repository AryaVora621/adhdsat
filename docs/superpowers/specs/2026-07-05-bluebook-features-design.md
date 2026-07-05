# Bluebook Suite + Esc-Quit/Pause + Time-Budget Sprints + Pomodoro — Design

Status: **approved, ready for implementation planning**.

## Scope (4 features, requested together)

1. Full Bluebook-style toolbar (highlight, strikethrough/eliminate, hide
   timer, adjustable text size, line reader, calculator, reference sheet)
2. Esc-to-quit for regular (non-timed) sprints
3. Pause for timed test-mode sprints and Practice Test
4. Adjustable time-budget sprint mode + a global Pomodoro widget

## Section 1 — Bluebook toolbar

**Surface**: shared across `Sprint.jsx`, `PracticeTest.jsx`, `ReviewSprint.jsx`.

**New shared components**:
- `src/components/TestToolbar.jsx` — the toolbar UI
- `src/lib/useTestToolbarState.js` — hook holding: highlight ranges,
  struck-through choice labels (both reset per question), text-size setting,
  timer-hidden flag (both persisted to localStorage as global prefs),
  calculator/reference-sheet modal open state

**Toolbar buttons:**

| Feature | Behavior |
|---|---|
| Highlighter | Toggle "highlight mode"; drag-select text in passage/question prose wraps it in `<mark>`. Plain prose only — skips (doesn't break) selections inside rendered KaTeX math. |
| Strikethrough (eliminate) | Small cross-out control on each answer choice; click marks it struck-through + dimmed, click again to restore. Struck choices remain clickable (visual aid only, not a lock) — matches real Bluebook. |
| Line reader | Toggle a semi-transparent horizontal ruler that follows the cursor over the passage. |
| Text size | Cycles S/M/L/XL, scales question/passage/choice font-size. Persisted globally. |
| Hide timer | Replaces timer readout with a "Timer hidden — tap to show" pill. Persisted globally. |
| Calculator | Math-only (hidden on English/R&W questions). Opens panel embedding the real Desmos graphing calculator via `Desmos.GraphingCalculator(container)` (official `calculator.js` API, not a plain iframe — desmos.com blocks framing). |
| Reference sheet | Math-only. Static modal of common SAT math formulas, no external dependency. |

**Annotation lifecycle**: all per-question state (highlights, eliminated
choices) resets when the question changes, matching real Bluebook's
clean-slate-per-question behavior. Text size and hide-timer are the only
settings that persist, globally, across questions/sessions (localStorage).

**Calculator API key**: already obtained and wired (done, not just planned):
- `VITE_DESMOS_API_KEY` in local `.env` (+ placeholder/comment in
  `.env.example`)
- `vercel link` run, linked to `aryavora621s-projects/adhdsat`
- `vercel env add VITE_DESMOS_API_KEY` added to production, preview, and
  development on Vercel (all three confirmed)
- This is a client-embed key (`VITE_` prefix = bundled into the frontend by
  design, not a secret requiring further protection)

Remaining implementation work: load Desmos's `calculator.js` script,
instantiate the calculator in a toolbar panel, gate it to math questions.

## Section 2 — Esc-quit + Pause

**Esc-quit (regular/untimed sprints only, `Sprint.jsx`)**
- New `showQuitConfirm` state. The existing keydown effect (`Sprint.jsx:612`)
  gets an `Escape` branch: if `!isTestMode && !showSummary`, open the confirm
  dialog instead of acting on the key. While the dialog is open, the rest of
  that handler (1-4/Enter/H) is short-circuited so keystrokes don't leak
  through to the sprint underneath.
- New `QuitConfirmDialog` component, three options:
  - **Resume** — closes the dialog, no other effect.
  - **Quit & Save** — calls the existing `finishSprint(stats)` (`Sprint.jsx:572`)
    directly. It already accepts partial stats and posts whatever was
    attempted, so this needs zero backend changes — it produces a "finished
    shorter sprint" and shows the normal summary screen.
  - **Quit & Discard** — skips the finish call entirely:
    `sessionStorage.removeItem('activeSprint')` + `navigate('/')`.

**Pause (timed test-mode Sprint + Practice Test only)**
- New shared `src/components/PauseOverlay.jsx` — centered "Paused" card with
  a single Resume button, rendered in place of the question content (covers
  passage/choices, no peeking); header/timer stays visible but frozen.
- **`Sprint.jsx`** (`test-math`/`test-english`): Pause button next to the
  timer, rendered only when `isTestMode`. Pausing does
  `clearInterval(timerRef.current)` and stashes
  `pausedAtRef.current = Date.now()`. Resuming shifts both
  `sprintStartRef.current` and `timeStartRef.current` forward by the paused
  duration before restarting the interval, keeping the countdown
  mathematically frozen rather than losing or gaining time.
- **`PracticeTest.jsx`**: same button placement next to its Clock/`timeLeft`
  display. Its timer is a plain tick-down on `timeLeft` state (no wall-clock
  derivation), so pause/resume just stops/restarts the `setInterval` — no
  timestamp math needed.
- Both places also gate their keydown effects (`Sprint.jsx:612`,
  `PracticeTest.jsx:236`) on the new `paused` flag, so 1-4/Enter do nothing
  while paused.
- **Decision**: Esc is not wired to Pause. Real Bluebook only pauses via the
  button; keeping Esc scoped to quit-only avoids the two features colliding
  on the same key.
- **`ReviewSprint.jsx` gets neither.** It's a fixed 5-question error-review
  mode, not a regular sprint or a timed test — out of scope for both
  Esc-quit and Pause.

## Section 3 — Time-budget sprints + Pomodoro widget

**Time-budget sprint mode (`Sprint.jsx` mode picker, ~line 776)**
- New toggle above the existing 5/10/15/20Q buttons: "By Questions" (current
  default) vs "By Time". Selecting "By Time" swaps the button row for
  duration options (5/10/15/20/30 min).
- Picking a duration calls `startSprint(mode)` as today, but sets a new
  `sprintTimeLimitRef`/`setSprintTimeLimit` (parallel to the existing
  `testTimeLimitRef`) instead of `sprintLengthRef`. `sprintLengthRef` is
  irrelevant in this mode since question count is open-ended.
- Reuses the existing `fetchNextQuestion`/queueing loop unchanged — only
  `handleNext`'s finish-vs-continue branch needs the new condition.
- **Progress bar**: switches from the current segmented (per-question) bar
  to a single continuous fill showing elapsed/remaining time fraction, using
  the same color logic (gray/gold/red) as the existing per-question timer.
- **End-of-time behavior**: the sprint-level timer check (parallel to the
  existing test-mode check at `Sprint.jsx:342-352`) gets a time-budget
  branch. Instead of ending immediately, it sets a `timeUp` flag. The
  in-progress question shows an inline "Time's up — finishing this one"
  notice; `handleNext` finishes the sprint (instead of fetching another
  question) once that question is answered and `timeUp` is true.

**Pomodoro widget**
- New `src/components/PomodoroWidget.jsx` + `src/lib/usePomodoro.js` hook
  (state: phase `work`/`break`, secondsLeft, running, work/break minute
  settings — persisted to localStorage).
- Mounted once at the shell level in `App.jsx`, sibling to the routed
  content, using the same ref+`setInterval` pattern as `Sprint.jsx`'s
  existing timer (`Date.now()`-based tick to avoid drift, cleanup on
  unmount).
- Visibility: hidden via a route check parallel to the existing
  `focusRoute` logic (`App.jsx:78`) — hidden only on `/practice-test`. Shows
  on Dashboard, regular Sprint, timed test-mode Sprint, and ReviewSprint.
- UI: small floating pill (bottom corner, above `BottomNav` on mobile)
  showing phase + countdown; click expands a settings popover with preset
  buttons (25/5, 15/5, 50/10) plus custom work/break minute inputs.
- Phase-complete: toast notification (reuses the existing toast/milestone
  pattern already in `Sprint.jsx`) + a short beep via Web Audio API
  (oscillator, no external asset), then auto-flips to the next phase.
- The widget's own clock is independent of any in-progress sprint timer — it
  never pauses or interacts with sprint state, it's a separate parallel
  clock for the user's own focus-session tracking.

## Codebase facts (verified this session)

- `Sprint.jsx` (1093 lines): handles regular sprints AND timed test-mode
  (`test-math`/`test-english`) in one file. Mode picker ~line 776, timer
  logic 330-368, `finishSprint` 572 (confirmed: already accepts partial
  stats, no backend change needed for Quit & Save), keyboard shortcuts
  effect 612-640 (confirmed).
- `PracticeTest.jsx` (479 lines): separate implementation for the full
  R&W+Math practice test. Countdown timer 208-221 (plain tick-down on
  `timeLeft` state, no wall-clock derivation — confirmed by reading the
  file this session). Keyboard shortcuts effect 236-250. `finishModule` 185.
- `ReviewSprint.jsx` (437 lines): separate again, 5-question error review
  mode.
- No shared toolbar/timer component exists yet between these three — this
  is genuinely new shared infrastructure.
- Dependencies: React 19, react-router-dom 7, lucide-react icons, KaTeX via
  custom `MathText` component. No calculator lib present before this work.
- `.env` is gitignored properly; only `.env.example` is tracked.
- Vercel project: `aryavora621s-projects/adhdsat`, region `syd1`, linked
  locally via `.vercel/project.json`.

## Out of scope

- Mobile-specific gesture variants of highlight/strikethrough (touch works
  via the same drag-select/tap handlers, no separate mobile design).
- Persisting Pomodoro state across browser sessions beyond localStorage
  settings (the running countdown itself resets on reload; only work/break
  minute preferences persist).
- Any change to Practice Test's own timing/scoring model beyond adding
  Pause — its scaled-score logic, module structure, and review screen are
  unchanged.
- Esc-quit and Pause on `ReviewSprint.jsx` (not a regular sprint or a timed
  test; unaffected by this work).
