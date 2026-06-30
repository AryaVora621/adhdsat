# Future Plans: Mobile Apps + Formal Ads

Status: PLANNING (no implementation yet). Saved 2026-06-30 per user direction.
Current product: React 19 + Vite SPA, Express API on Vercel, Supabase Postgres.
Both tracks below are gated and should NOT start coding until the gate clears.

---

## Track A — Mobile apps (Android first, iOS code-ready)

### Gate
- Android: UNBLOCKED. User has Android Studio installed.
- iOS: BLOCKED. User does not have Xcode installed yet. Write iOS-compatible code,
  but defer the actual build/archive/TestFlight submit until Xcode is set up.

### Recommended approach: Capacitor (not React Native)
Rationale: the app is already a working React + Vite SPA. Capacitor wraps the
existing build in a native WebView shell, so we reuse ~100% of the current UI,
routing, theme system, and API layer instead of rewriting in React Native. One
codebase ships web + Android + iOS. React Native would mean re-implementing every
screen — not justified when the web app is already premium-polished.

When to reconsider RN/Expo: only if we hit WebView perf walls on the Sprint timer/
animations, or need deep native modules beyond billing + notifications.

### Research checklist (do before coding)
- [ ] Confirm Capacitor 6/7 compatibility with current Vite build output (dist/).
- [ ] Plan the native config: app id (e.g. com.adhdsat.app), name, icons/splash
      (reuse the Field Notes bolt mark; generate adaptive icons for Android).
- [ ] Auth on mobile: Supabase magic-link + Google OAuth need deep-link / custom URL
      scheme handling (Capacitor App URL open + redirect allowlist). Research the
      redirect flow inside a WebView; may need @capacitor/browser for OAuth.
- [ ] Offline/asset strategy: bundle the SPA locally vs load remote. Bundling =
      faster cold start + works offline for cached questions; remote = instant
      updates without store review. Likely bundle shell + hit API for data.
- [ ] Safe-area insets / notch handling (already have focus-mode bottom-nav logic).
- [ ] Play Billing (Google) for Pro subscription on Android — must use Play's
      in-app billing, NOT Stripe, for digital goods on the store (store policy).
      This intersects the Stripe track: web uses Stripe, Android uses Play Billing,
      iOS uses StoreKit. Need a server reconciliation of plan state across sources.
- [ ] Push notifications (streak reminders) via @capacitor/push-notifications +
      FCM — high value for an ADHD streak product. Scope as a fast-follow.

### Build order (when unblocked)
1. `npm i @capacitor/core @capacitor/cli && npx cap init`, add android platform.
2. Wire deep-link auth + test guest flow in the Android emulator.
3. Native polish: icons, splash, status-bar color (theme-aware), safe areas.
4. Play Billing for Pro; reconcile with users.plan server-side.
5. Push notifications for streaks.
6. Internal testing track on Play Console -> closed -> production.
7. iOS: add ios platform, repeat native polish + StoreKit (BLOCKED on Xcode).

---

## Track B — Formal advertisement videos

### Gate
- BLOCKED on tooling. The current demo (server/record-demo.mjs, 63s Playwright
  screen capture) is a functional runthrough, not an ad. A real ad needs editing:
  scripted VO/captions, motion graphics, music, pacing, b-roll. We need a
  video-editing MCP / capability connected before producing final cuts.
- Until tooling lands: deliver pre-production only (scripts, storyboards, shot
  lists, captions copy). These are usable the moment editing is available.

### Pre-production to draft now (no tooling needed)
- [ ] Positioning: lead with the ADHD-specific pain (can't start, can't sustain
      focus, generic prep feels like a wall) -> the product's answer (short
      adaptive sprints, instant feedback, visible XP/streak wins, low friction).
- [ ] Three ad cuts to script:
      1. 15s hook (social/Reels/TikTok/Shorts vertical 9:16) — one sharp problem
         line + 2-3 fast in-app moments + CTA.
      2. 30s explainer (16:9 + 9:16) — problem, 3 features, social proof, CTA.
      3. 6s bumper (YouTube pre-roll) — single memorable line + logo.
- [ ] Storyboard each: shot list mapped to real screens (onboarding domain pick,
      a sprint correct-answer XP pop, streak flame, dashboard progress, practice
      test score climb). We can auto-capture clean b-roll with a Playwright script
      (extend record-demo.mjs to emit isolated, captioned clips at 1080p/60).
- [ ] Caption/VO script + on-screen text in the Field Notes voice (warm, plain,
      encouraging; no hype). Hand-drawn Caveat accents as motion callouts.
- [ ] Music brief: warm, momentum-building, not corporate-EDM. Source royalty-free.

### Tooling research (what to connect)
- [ ] Evaluate a video-editing MCP or programmatic editor: Remotion (React-based
      programmatic video — fits our stack perfectly, renders MP4 from components),
      or an editing MCP if one is available. Remotion is the strong candidate: we
      can compose captions + screen recordings + motion in React, version it in
      git, and render deterministically.
- [ ] Asset pipeline: high-DPI Playwright captures -> Remotion timeline -> 1080p
      master -> platform crops (9:16, 1:1, 16:6 bumper).

### Build order (when tooling lands)
1. Finalize the 15s/30s/6s scripts + storyboards (can do now).
2. Capture clean, deterministic b-roll clips (extend record-demo.mjs).
3. Compose in Remotion (captions, Field Notes motion, music).
4. Render masters + platform crops; review with user before publishing.

---

## Immediate next step
Resume the premium-polish loop (cron, every 30m). These two tracks stay in
PLANNING until their gates clear (Xcode for iOS; a video-editing capability for
ads; Android can begin on request). Stripe (web payments) remains the prior
roadmap item, also waiting on the user's Stripe account.
