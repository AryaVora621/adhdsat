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

## Premium polish loop continued (2026-06-30, tags v1.5 - v2.1)
- v1.5-og-chrome: on-brand OG social card (bolt + gradient headline); theme-adaptive
  browser chrome (color-scheme light dark + media theme-color metas).
- v1.6-mobile-polish: fixed inverted reduced-motion media query; features grid
  3/2/1-col responsive. QA'd landing/auth/dashboard at 390px.
- v1.7-sprint-microinteractions: correct-answer scale pop + explanation fade-slide
  on Sprint and Review. Verified full loop live (answered a question).
- v1.8-upgrade-polish: removed last purple remnants (Upgrade Pro card + Dashboard
  CTA -> brand gold); added cyan->gold 'Recommended' badge to Pro plan.
- v1.9-profile-account: extracted shared src/components/AuthModal.jsx; Profile
  Account section (email+Sign out for authed; 'Save my progress' for guests ->
  opens auth modal -> /api/users/claim migrates progress). Closes the in-app
  guest-to-account gap. Verified live.
- v2.0-score-countup: useCountUp hook (easeOutCubic, reduced-motion aware); the
  practice-test total + section scores climb from 0 on the results reveal.
- v2.1-focus-a11y: global :focus-visible box-shadow ring (keyboard-only, on-brand).
  Verified the ring shows on Tab.
- v2.2-code-splitting: React.lazy route splitting; initial JS 241KB -> 136KB gzip.
- v2.3-route-prefetch: idle-prefetch high-traffic chunks (instant nav). Verified.
- v2.4-homescreen-routing: FIX root URL bounced returning guests to /onboarding;
  now / shows Landing (not onboarded) or Dashboard (onboarded); onboarding only
  via CTA (createGuest / startOnboarding). Verified both paths live.

## DESIGN PIVOT — "Field Notes" aesthetic (2026-06-30)
- User: site looked "AI-generated". Ran a UI research agent -> diagnosis (median
  cyan-on-black palette, mesh blobs, gradient headline, symmetric 6-card grid).
  Offered 3 directions; user reviewed rendered mockups and chose C "Field Notes".
- See memory design-direction-field-notes.md for the full spec. Warm paper/cream
  + warm-espresso dark, terracotta + teal + gold, Bricolage/Spline Sans/Caveat,
  risograph stickers (offset shadows, 2px ink borders, organic corners, tilts,
  grain, hand-drawn underline). Workspace stays disciplined; boldness in shell.
- v2.5-landing-fieldnotes: Landing fully rebuilt in Field Notes (scoped --fn-*
  vars). Verified light + dark live. Added Spline Sans + Caveat to index.html.
- NEXT for the loop: roll Field Notes into index.css design tokens, then restyle
  in-app screens (Dashboard, Sprint, Profile, Upgrade, Onboarding, AuthModal) so
  the post-login app matches the new landing. Tag each vN.M.
- v2.6-app-fieldnotes-tokens: Field Notes palette mapped into index.css tokens
  (terracotta/teal/gold), 42 cyan->terracotta replacements, Spline Sans body /
  Bricolage headings app-wide. Verified Onboarding + Dashboard live.
- v2.7-tint-cohesion: audited in-app source for orphan colors. Purged the old
  #00e676 spring-green correct-answer tints + #e040fb magenta confetti across
  Sprint/ReviewSprint/PracticeTest/Profile/Dashboard -> Field Notes teal/terra/
  gold. Build clean, deployed. Cleaned up test guest + .playwright-mcp artifacts.
- Source audit confirms NO orphan old-palette hex (#00d4ff/cyan/purple) remain;
  the 4 surviving gradients are all on-brand terracotta/gold/teal tints.
- v2.8-sidebar-chrome: sidebar wordmark -> Bricolage display face; streak flame
  recolored from --error (alarm red) to --primary terracotta (on-brand, the
  Dashboard 'at risk' flame correctly stays red as a real alert).
- v2.9-wordmark-unify: brought the loading screen, API-error screen, and
  onboarding header wordmarks into the same Bricolage brand treatment. The
  ADHDSat wordmark is now identical across landing, app chrome, full-screen
  states, and onboarding. Verified landing live (Field Notes fully cohesive).
- Future plans saved: PLAN_MOBILE_AND_ADS.md (Android via Capacitor first, iOS
  deferred until Xcode; formal ads via Remotion once a video capability connects).

## ADS TRACK — Remotion ad set (2026-06-30, tags v3.0 / v3.1)
- Remotion installed by user -> ads track unblocked. Built isolated ads/ workspace
  (own package.json + node_modules, gitignored; never touches the Vite bundle).
- v3.0-ads: ADS_SCRIPTS.md (all 3 cuts scripted) + shared Field Notes scene
  components (SprintCard w/ XP pop, Logo, hand-drawn Underline, Grain, theme
  tokens, deterministic Google Fonts) + HookVertical (15s 1080x1920). Rendered +
  frame-by-frame QA'd (fixed XP-sticker/label collision).
- v3.1-ads: Explainer (30s 1920x1080: hook -> sprints -> spaced rep -> momentum
  -> reassurance -> CTA) + Bumper (6s). Fixed white-on-gold contrast. All 3
  registered in Root.tsx.
- Deliverables in ~/Desktop/adhdsatads/ (hook-15s, explainer-30s, bumper-6s MP4s
  + poster stills + scripts). User cannot receive SMS from here, so folder is the
  delivery channel. Re-render: cd ads && npm run render:all (or render:hook etc).
- NEXT for ads (optional polish): add a soft music bed, derive 9:16 crops of the
  explainer/bumper, optimize font loading (load only 600/700/800 weights to cut
  the 21-request warning + speed renders).
- STILL PENDING (next active track): Android Capacitor scaffold (unblocked).

## REBRAND — ADHDSat → Tally (2026-06-30, tags v4.0 / v4.1 / v4.2)
- Name was a personal placeholder. Rebranded to **Tally** (counts every small
  win; fits the Field Notes tally-mark identity; drops 'SAT' from the name, which
  College Board trademarks). Domain **tally.college** confirmed available (whois).
  Full plan + launch steps in REBRAND.md.
- v4.0-rebrand: app UI + meta (index.html title/OG/Twitter, warm theme-colors;
  wordmark+copy in Sidebar/App/Onboarding/Landing/Upgrade/Profile; manifest;
  sw.js -> tally-v2). Kept localStorage key 'adhdsat-theme' + backend adhdsat
  schema (internal). Deployed + verified landing shows 'Tally' live.
- v4.1-rebrand: ads/src/brand.ts single source of truth; ad Logo + CTA URLs ->
  Tally/tally.college; new OgImage composition -> regenerated public/og-image.png;
  re-rendered all 3 cuts. Redeployed so new OG is live.
- v4.2-ads: 9:16 crops (ExplainerVertical + BumperVertical, aspect-ratio-aware
  beats, QA'd) + Music infra (Music.tsx, off by default, MUSIC.md sourcing).
- Ad deliverables in ~/Desktop/adhdsatads/ (Tally-* : hook-15s, explainer-30s +
  vertical, bumper-6s + vertical, og-card, scripts).
- HUMAN before launch: register tally.college, add to Vercel, swap absolute
  asset/canonical URLs off adhdsat.vercel.app; for music, drop a licensed track
  in ads/public/audio/ and enable <Music/>; don't publish ads showing
  tally.college until the domain resolves.

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
