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
- Practice-test mistakes -> review queue: POST /api/answers/batch records every
  answer on completion; missed questions enter the SM-2 queue (verified: a wrong
  answer became a due review card) and answers enrich domain stats/predicted score.
- Question bank: 551 -> 599 (three verified authored batches, 48 originals across
  all 8 domains, official Digital SAT format). Live count confirmed 599.

## In progress (2026-06-29, user asked for polish + 1000 questions + tiers)
- Polish pass: DONE core. Fixed mobile bug where Check Answer/Hint buttons sat
  under the bottom nav -> added focus mode (hide mobile nav on /sprint, /review,
  /practice-test). Relabeled single-module tests ("Math Module", "Reading &
  Writing Module") vs Full Practice Test. Verified all screens clean, 0 console
  errors. Live.
- Questions -> 1000+: gen-verify.mjs pipeline (server/gen-verify.mjs) generates
  via Gemini then INDEPENDENTLY re-solves each item, keeping only answer-key
  matches. Running in background toward ~51/domain (~408 new). Output staged in
  server/data/generated-staging.json. NEXT: when done, validate + merge into
  questions.json, ingest, deploy, verify count >= 1000.
- Tiers (free vs paid): DONE + verified live. Balanced model, plan-flag only (no
  payments). users.plan column; getPlan() gates sprint daily limit (3/day),
  timed modules, practice test, /explain, /analyze-report, AI insight sentence.
  /upgrade screen + POST /api/users/:id/plan. Profile badge, Dashboard PRO lock.
  Verified: free blocked at 403, 4th sprint blocked, upgrade flips to paid,
  paid unlocks. Also fixed a Study-Now double sprint-create.
- Questions -> 1000: DONE. Bank now 1062 live (567 Math / 495 English, all 8
  domains 113-167 each, 302/451/309 easy/med/hard, 22 grid-ins). Generated via
  gen-verify (independent re-solve gate) + dedup. Markdown bold/italic stripped
  bank-wide (was rendering literally in MathText); merge + gen prompt now prevent it.
- Runthrough video delivered (server/record-demo.mjs, Playwright). Onboarding ->
  sprint -> dashboard -> upgrade -> practice test, 63s mp4.
- Roadmap: Stripe subscription (web) then mobile apps. See the memory note.

## Landing page + real auth (2026-06-29, DONE + live, tag v1.2-landing-auth)
- New marketing landing page for newcomers (src/pages/Landing.jsx): Bricolage
  Grotesque display font, animated gradient mesh, concrete sprint-card hero,
  6-feature grid, closing CTA. Light + dark mode (data-theme system in
  src/lib/theme.js, follows OS, persists). Verified live in both themes.
- Real accounts via Supabase Auth (src/lib/supabase.js): email magic-link +
  Google OAuth modal. Guest mode preserved ("Start free" -> guest -> onboarding,
  verified live). Sidebar got theme toggle + sign-out (auth users only).
- Account migration: POST /api/users/claim promotes an anonymous guest (with all
  progress) into the authed account on first sign-in. users table + email,
  + is_guest. Migration SQL verified via rolled-back dry-run; endpoint live.
- App.jsx identity resolution: Supabase session -> claim; else returning guest;
  else Landing. Single onAuthStateChange listener.
- Loop active: cron 20cdaa2a every 30m (premium polish + git checkpoints).

## Premium polish loop (2026-06-29 eve, tags v1.3/v1.4)
- v1.3-theme-brand: app-wide light mode (swapped ~90 hardcoded hex -> CSS vars
  across all pages); new brand favicon + PWA icon (cyan->gold bolt on dark tile,
  replaced the Google Antigravity decal).
- v1.4-light-mode-fixes: fixed invisible white-on-white text (grid-in/date/name
  inputs, level-up toast -> var(--text-primary)); removed forced colorScheme:dark
  on date pickers; themed the loading skeleton.
- QA'd light mode live across landing, onboarding, sprint, dashboard: all clean
  and readable. (The stray "00" top-right in automation = Vercel Toolbar badge,
  visible only to the Vercel account owner, not end users. Not a bug.)
- All pushed to GitHub with tags; loop cron 20cdaa2a still firing every 30m.

## Next actions (priority order)
1. HUMAN (see LAUNCH_CONFIG.md): (a) rotate Supabase DB password [security
   blocker], (b) set Supabase Auth Site URL + redirect allowlist to
   adhdsat.vercel.app and enable Google provider [needed for sign-in to work
   end-to-end; guest mode already works without it].
2. Consider converting in-app pages (Dashboard/Sprint/etc.) to fully honor the
   light theme (they still use some hardcoded dark hex; landing+auth are done).
3. Keep growing the question bank; polish passes.
4. Stripe (deferred): wire Checkout + webhook to flip users.plan to pro.

## Human decisions needed
- DB password rotation + Supabase Auth URL/provider config (see LAUNCH_CONFIG.md).

## How to expand questions
Edit server/data/questions.json (or stage a batch file), validate (one correct
choice per MC), then: node --env-file=.env server/ingest.js (idempotent upsert).
