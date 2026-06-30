# Android app via Capacitor — guide

STATUS (2026-06-30): **Scaffold DONE + committed (v5.0-android).** Capacitor
installed, capacitor.config.json in place, `npx cap add android` run (native
android/ project committed), web assets bundled, the /api fetch shim wired. What's
left is the at-machine build below (needs your JDK/Studio + free disk space — the
headless APK build was blocked only by a full disk, not by any project issue).

Everything here is verified against this project's setup: Vite build → `dist`,
base `/`, React Router `BrowserRouter`, Express API at `/api/*`.

## Run it now (at your machine)
```
npm run cap:sync     # build:mobile (bakes VITE_API_BASE) + cap sync
npm run cap:open     # opens Android Studio
```
In Android Studio: let Gradle sync, then Run ▶ on an emulator or device.
Smoke-test **guest mode** first (no auth config needed). Then wire deep-link auth
(Step 5) for Google/email sign-in.

Steps 1–4 below are already done — kept for reference / reproducing from scratch.

## Why Capacitor (not React Native)
The app is already a polished React + Vite SPA. Capacitor wraps the existing
`dist` build in a native WebView shell, so we reuse 100% of the UI, routing,
theme, and Field Notes design. One codebase → web + Android + iOS. No rewrite.

## Prerequisites
- Android Studio (you have it) + an emulator or a device with USB debugging.
- JDK 17 (Android Studio bundles one).

## Step 1 — install Capacitor
```
npm i @capacitor/core
npm i -D @capacitor/cli
npm i @capacitor/android
```

## Step 2 — capacitor.config.json (repo root)
```json
{
  "appId": "college.tally.app",
  "appName": "Tally",
  "webDir": "dist",
  "backgroundColor": "#221e1a"
}
```
(appId is reverse-domain of tally.college; change if you prefer com.tally.app.)

## Step 3 — THE API-BASE GOTCHA (do this before it'll work)
In the browser, `fetch('/api/...')` hits the same origin. Inside the native shell
the origin is `https://localhost` (Capacitor's server) — there is no backend
there, so every API call 404s. Two ways to fix:

**Option A — bundle + absolute API base (recommended, true installable app):**
1. Add to a new `src/lib/api.js`:
   ```js
   const BASE = import.meta.env.VITE_API_BASE || '';
   export const api = (path) => `${BASE}${path}`;
   ```
2. Replace `fetch('/api/...')` → `fetch(api('/api/...'))` across src
   (there are ~30 call sites; a codemod or find/replace works since they all
   start with `'/api`).
3. Build the mobile bundle with the prod backend:
   `VITE_API_BASE=https://adhdsat.vercel.app npm run build` (swap to
   https://tally.college once that domain is live).
4. Supabase calls already use the SDK with an absolute URL, so they're fine.

**Option B — thin wrapper (fastest, needs connectivity):**
Add `"server": { "url": "https://tally.college" }` to capacitor.config.json.
The native app just loads the live site. Ships in minutes, but it's a WebView of
prod (no offline, no bundled assets). Fine for a v1 / TestFlight-style preview.

Recommendation: Option B to see it running today, then Option A for the real
store build.

## Step 4 — add the platform + run
```
npm run build               # produce dist (with VITE_API_BASE for Option A)
npx cap add android
npx cap sync
npx cap open android        # opens Android Studio → Run on emulator/device
```
After any web change: `npm run build && npx cap sync`.

## Step 5 — deep-link auth (Supabase OAuth)
Google sign-in redirects to a URL; in a WebView that must come back to the app.
- Use `@capacitor/browser` for the OAuth hop, or register an App Link / custom
  scheme and add it to Supabase Auth → URL Configuration → Redirect URLs.
- Email magic-links: same — the link must deep-link back into the app.
- Guest mode needs none of this and works immediately (good for first emulator
  smoke test).

## Step 6 — native polish (fast-follow, after it runs)
- Icons/splash: `@capacitor/assets` from the bolt mark (adaptive icon, warm tile).
- Status bar: `@capacitor/status-bar` → match theme (dark espresso / cream).
- Safe areas: BottomNav already uses `env(safe-area-inset-bottom)`; verify on a
  notched device.
- Play Billing for Pro: Google requires Play's in-app billing for digital goods
  (NOT Stripe) on Android. Reconcile `users.plan` server-side across web (Stripe)
  / Android (Play) / iOS (StoreKit).
- Push notifications (`@capacitor/push-notifications` + FCM): high-value streak
  reminders — schedule as a fast-follow.

## Store submission
- Internal testing track → closed → production on Play Console.
- iOS: `npx cap add ios` repeats this, but BLOCKED until Xcode is installed.

## Status
Foundation documented + verified up to the device step. Next session (with you at
the machine): run Steps 1–4, smoke-test guest mode in the emulator, then wire
Option A + deep-link auth.
