# ADHDSat — Ad Scripts (Field Notes voice)

Voice: warm, plain, encouraging. Speaks to the ADHD experience without clinical
language or hype. Lead with a real feeling ("can't start"), answer with the
product's actual mechanic (short sprints, instant win, visible streak). Never
over-promise scores. On-screen text does the heavy lifting (most viewers watch
muted); VO is optional and supplementary.

Palette in motion: cream paper #FBF7F0, ink #2A2622, terracotta #E8643C, teal
#2E7D6F, gold #F2B705. Bricolage Grotesque display, Spline Sans body, Caveat for
one hand-drawn accent per cut. Devices: hard offset shadows, organic corners,
slight tilts, paper grain, one hand-drawn underline. Motion is springy but never
chaotic — respect the workspace discipline.

---

## Cut 1 — 15s Hook (vertical 9:16, 1080x1920) — social feed primary

The workhorse for Reels / TikTok / Shorts. One pain, one proof, one CTA.

| t (s) | On-screen | Motion | VO (optional) |
|-------|-----------|--------|---------------|
| 0.0–2.8 | **"Opening a textbook feels impossible."** (Bricolage, ink, large) | Words tilt in one line at a time, slight overshoot | "If starting is the hardest part..." |
| 2.8–4.0 | Small Caveat note scrawls in: *"so we made starting tiny."* | Hand-draw reveal | "...we made starting tiny." |
| 4.0–9.5 | The sprint card (real UI): "If 3x + 7 = 28, what is x?" → tap **x = 7** → turns **teal** ✓ → **+40 XP!** gold sticker pops | Card drops with offset shadow; option fills teal; XP sticker spring-pops + wobble | "One question. Instant win." |
| 9.5–12.5 | **"60-second sprints. Real progress."** + a 🔥 streak counter ticking 1→7 | Streak flames flicker up; number counts | "Small wins add up." |
| 12.5–15.0 | Logo lockup (bolt + **ADHDSat**) · **"Start free — no setup"** · adhdsat.vercel.app | Logo sticker settles with a tilt; CTA underline draws | "Start free." |

End frame holds the logo + URL for 1s.

---

## Cut 2 — 30s Explainer (16:9 1920x1080 master; also crop 9:16)

Problem → 3 mechanics → reassurance → CTA. For YouTube / landing embed.

| t (s) | Beat | On-screen | Motion |
|-------|------|-----------|--------|
| 0–3 | Hook | **"SAT prep that works *with* your brain."** (hand-drawn underline under "with") | Headline staggers in; underline draws |
| 3–9 | Mechanic 1: Sprints | Card: short question, instant feedback, teal correct + XP pop | Card slides in from right, shadow offset |
| 9–15 | Mechanic 2: Spaced repetition | "Miss one? It comes back when it matters." Review card with a due badge | Card flips up; due badge pulses |
| 15–21 | Mechanic 3: Momentum | Dashboard: XP bar climbs, streak flame, predicted-score range nudges up | Numbers count up; bar fills terracotta |
| 21–26 | Reassurance | **"No credit card. No setup. 1,000+ original questions."** on a sticker strip | Tri-color stat stickers pop in sequence |
| 26–30 | CTA | Logo + **"Start your first sprint free"** + URL | Logo settles; CTA button press micro-bounce |

---

## Cut 3 — 6s Bumper (16:9 + 9:16) — YouTube pre-roll / top-of-funnel

One memorable line, one image, logo. No room for nuance.

| t (s) | On-screen | Motion |
|-------|-----------|--------|
| 0–2.5 | **"Studying, in 60-second wins."** | Line snaps in, slight tilt |
| 2.5–4.5 | Sprint card flashes a correct answer + **+40 XP!** sticker | Quick card pop, XP sticker wobble |
| 4.5–6.0 | Logo (bolt + ADHDSat) + "Start free" | Logo sticker lands |

---

## Production notes
- Real UI b-roll: extend server/record-demo.mjs to capture isolated, captioned
  1080p clips (sprint correct-answer, streak, dashboard climb) for compositing —
  OR rebuild those moments natively in Remotion components (cleaner, deterministic,
  no screen-capture jitter). Default to native Remotion recreation for hero shots;
  use real captures only where authenticity matters.
- Music: warm, building, light percussion. Royalty-free. Duck under VO.
- Captions: burned-in, high-contrast ink-on-cream, Spline Sans 600.
- Export masters at 1080p; derive 9:16 / 1:1 / 16:9 crops from the Remotion
  compositions (separate <Composition> sizes share the same scene components).
- Always review with the user before publishing anywhere.
