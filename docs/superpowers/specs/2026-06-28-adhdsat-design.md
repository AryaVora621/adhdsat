# ADHDSat Design Spec
**Date:** 2026-06-28
**Status:** Approved

---

## Context

The builder (Arya) is preparing for the SAT in 1-2 months with a current score of ~1370 (English ~630, Math ~730) and a target of 1500-1550. The platform needs to be personally usable immediately while also being architected for a broader ADHD-focused audience.

The existing codebase has a working Sprint loop (React + Vite), Express + SQLite backend, XP/leveling system, and a dark cyber aesthetic. The gap is: no real question bank, no onboarding, no adaptive difficulty, and no progress visibility. This spec fills those gaps.

---

## Goals

- Ship a personally usable SAT prep tool within the 1-2 month exam window
- Ingest a real SAT question bank (500+ questions) immediately
- Gemini-powered adaptive difficulty and answer explanations
- Onboarding flow that captures baseline scores and weak areas
- Dashboard with domain-level progress visibility
- Optional score report upload (image) to auto-populate baseline

---

## Out of Scope (Phase 2)

- Google OAuth / multi-user accounts
- Supabase migration (SQLite is fine for single-user personal use)
- PDF score report upload (only PNG/JPG for MVP)
- Spaced repetition review engine (placeholder exists in Dashboard)
- AI question generation (Phase 2 after real bank is exhausted)

---

## Architecture

```
Frontend (React + Vite)
├── Onboarding wizard        /onboarding
├── Dashboard                /             (enhanced)
├── Sprint loop              /sprint        (upgraded)
└── Score report upload      (modal within onboarding)

Backend (Express + SQLite, port 3001)
├── POST /api/onboarding          save baseline + weak areas
├── GET  /api/questions/next      Gemini adaptive criteria → DB query
├── POST /api/sprints             create sprint record
├── POST /api/sprints/:id/finish  mark sprint complete
├── POST /api/answers             existing, unchanged
├── GET  /api/progress            domain stats over time
├── POST /api/analyze-report      Gemini Vision: parse score screenshot
└── existing user/xp endpoints   unchanged

Gemini API (google/generative-ai SDK)
├── Adaptive criteria     given user history → return { domain, difficulty }
├── Explanations          on wrong answer → step-by-step explanation
└── Score report parsing  given image → return { english_score, math_score, weak_areas[] }

Data pipeline (one-time)
└── server/ingest.js      load public SAT JSON dataset → SQLite questions table
```

**Gemini key:** stored in `.env` as `GEMINI_API_KEY`. Server checks for it on startup and logs a clear error if missing. All Gemini calls have a rule-based fallback (see Adaptive Difficulty section).

---

## Data Model Changes

The existing schema needs two changes:

### 1. Extend `users` table

```sql
ALTER TABLE users ADD COLUMN baseline_english INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN baseline_math INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN weak_areas TEXT DEFAULT '[]';  -- JSON array of domain strings
ALTER TABLE users ADD COLUMN onboarding_completed INTEGER DEFAULT 0;
```

Run these as idempotent migrations in `db.js` using `IF NOT EXISTS` column checks via `PRAGMA table_info`.

### 2. Add `source` field to `questions` table

```sql
ALTER TABLE questions ADD COLUMN source TEXT DEFAULT 'ingest';
-- values: 'ingest' | 'ai_generated'
```

Enables filtering by origin. Existing seed questions get `source = 'seed'`.

---

## Question Bank Ingestion

**Source:** A public GitHub SAT question JSON dataset (e.g., sat-practice-data repos with College Board practice test questions parsed into structured JSON). Target: 500-1000 questions covering all domains.

**Script:** `server/ingest.js`
- Reads a local JSON file (`server/data/questions.json`)
- Maps each question to the existing `questions` table schema
- Skips duplicates by ID
- Logs ingestion summary (N inserted, N skipped)
- Run once: `node server/ingest.js`

**Domain coverage targets for 1500-1550 prep:**

| Section | Domain | Priority |
|---------|--------|----------|
| Math | Algebra | High |
| Math | Advanced Math | High |
| Math | Problem Solving & Data Analysis | Medium |
| Math | Geometry & Trig | Medium |
| English | Information & Ideas | High |
| English | Craft & Structure | High |
| English | Expression of Ideas | Medium |
| English | Standard English Conventions | Medium |

---

## Onboarding Flow

**Route:** `/onboarding` — shown automatically on first load if `onboarding_completed = 0`. Skipped if already completed (checked via localStorage `userId` + DB lookup).

**Step 1 — Scores**
- Input: estimated English score (400-800 slider or number input)
- Input: estimated Math score (400-800 slider or number input)
- Optional: "Upload past score report" button → opens image upload modal

**Step 2 — Weak Areas (multi-select)**
Two columns (Math / English), checkboxes per domain. Pre-selected based on score report analysis if uploaded.

Math domains: Algebra, Advanced Math, Problem Solving & Data Analysis, Geometry & Trig
English domains: Information & Ideas, Craft & Structure, Expression of Ideas, Standard English Conventions

**Step 3 — Confirm**
Summary card: "Starting point: English 630, Math 730. Weak areas: Craft & Structure, Advanced Math. Let's go."
CTA: "Begin First Sprint"

**Score report upload (optional modal within Step 1):**
- Accepts PNG/JPG only (not PDF)
- Image sent to `POST /api/analyze-report` as base64
- Gemini Vision extracts: `{ english_score, math_score, weak_areas[] }`
- Pre-fills Step 1 and Step 2 fields
- If Gemini fails or returns low-confidence result, user fills manually

---

## Adaptive Difficulty Engine

**Endpoint:** `GET /api/questions/next?userId=<id>`

**Flow:**
1. Backend loads user's last 30 `user_answers` with domain, skill, difficulty, is_correct
2. Computes accuracy per domain: `{ "Algebra": 0.72, "Craft & Structure": 0.41, ... }`
3. Calls Gemini with a compact prompt:

```
User SAT prep profile:
- Target score: 1500-1550
- Domain accuracy (last 30 questions): { ... }
- Weak areas flagged at onboarding: [ ... ]

Return JSON: { "domain": "<domain>", "difficulty": "easy|medium|hard" }
Pick the domain with the most room for improvement. 
Alternate between weak domains rather than drilling one repeatedly.
```

4. Gemini returns criteria. Backend queries:
```sql
SELECT * FROM questions
WHERE domain = ? AND difficulty = ?
  AND id NOT IN (last 50 seen question IDs for this user)
ORDER BY RANDOM() LIMIT 1
```
5. Returns question to frontend.

**Fallback (if Gemini call fails or times out):**
- Sort domains by ascending accuracy
- Pick lowest-accuracy domain
- Select random question at `medium` difficulty from that domain
- No Gemini dependency; Sprint loop never breaks

**Sprint pre-load vs. single-fetch:**
Sprint.jsx currently pre-loads 5 questions at once. Change to single-question fetch per question (`/api/questions/next`) so adaptive selection runs after every answer. Latency is acceptable (~200-500ms) given the user reads the explanation first.

---

## Gemini Explanations

After a wrong answer, the existing static `explanation` field is shown. Enhance this:

1. Show the stored `explanation` immediately (no latency)
2. Below it, show a "Deep Dive" button
3. On click, POST to `/api/explain` with `{ questionId, selectedChoice, correctAnswer, questionText }`
4. Gemini generates a step-by-step walkthrough tailored to the wrong answer chosen
5. Stream the response to the frontend (Gemini supports streaming; use `streamGenerateContent`)

This avoids blocking the answer reveal on a Gemini call while still offering richer explanations on demand.

---

## Dashboard Enhancements

The existing Dashboard shows XP, level, and streak (in Sidebar). Add:

**Domain Performance Grid**
- 8 cards (4 Math domains, 4 English domains)
- Each card shows: domain name, accuracy % (last 20 questions), trend arrow (up/down vs. prior 20)
- Color coded: green >75%, yellow 50-75%, red <50%
- Data source: `GET /api/progress?userId=<id>`

**Predicted Score**
- Simple formula: weighted accuracy across domains mapped to SAT score range
- Math section score = f(avg accuracy across 4 Math domains)
- English section score = f(avg accuracy across 4 English domains)
- Displayed as a range: "Predicted: 1420-1480" based on last 50 answers
- Not shown until user has answered 20+ questions total

**Sprint History**
- List of last 10 completed sprints: date, questions attempted, % correct, XP earned
- Data source: `sprints` table (currently never written to — fix in Sprint.jsx)

---

## Sprint Loop Fixes

Three bugs in `Sprint.jsx` to fix as part of this work:

1. **No real sprint record:** Call `POST /api/sprints` on sprint start, store `sprintId` in component state. Call `POST /api/sprints/:id/finish` when sprint ends.

2. **Hardcoded `sprint_id: 'sprint_1'`:** Replace with real `sprintId` from state.

3. **Mocked `time_spent_seconds: 30`:** Add a `useRef` timer that starts when question renders, records elapsed seconds on answer submit.

4. **Pre-loaded 5 questions → single-fetch adaptive:** Replace the upfront `fetch('/api/questions?limit=5')` with a per-question fetch to `/api/questions/next`. Update progress bar to show current question number (e.g., "Question 8") instead of a fixed-length bar.

---

## User Identity (No Auth)

- On first load, generate a UUID and store in `localStorage` as `userId`
- Call `POST /api/users` to create profile (already exists)
- If `onboarding_completed = 0`, redirect to `/onboarding`
- All API calls include `userId` as query param or request body
- Clearing localStorage = fresh start (acceptable for personal use)

---

## Environment

`.env` (not committed):
```
GEMINI_API_KEY=your_key_here
PORT=3001
```

Add `.env` to `.gitignore` (already present for `*.env` patterns — verify).

---

## Build Order

This is sequenced to get the tool personally usable as fast as possible:

1. **Question bank** — source JSON dataset, write `ingest.js`, seed SQLite (Day 1-2)
2. **Schema migrations** — add `baseline_english`, `baseline_math`, `weak_areas`, `onboarding_completed`, `source` fields (Day 1)
3. **Onboarding flow** — wizard UI + `POST /api/onboarding` + score report upload (Day 2-4)
4. **Adaptive difficulty** — `/api/questions/next`, Gemini criteria call, fallback logic (Day 3-5)
5. **Sprint loop fixes** — real sprint IDs, timer, single-question adaptive fetch (Day 4-5)
6. **Gemini explanations** — `/api/explain` endpoint + "Deep Dive" button in Sprint (Day 5-6)
7. **Dashboard enhancements** — domain grid, predicted score, sprint history (Day 6-8)

---

## Verification

- `npm run dev` starts both Vite and Express without errors
- Fresh load redirects to `/onboarding`, completes without errors, lands on Dashboard
- Sprint starts, fetches one question at a time adaptively, records answers and sprint record
- After 5 wrong answers in one domain, next questions skew toward that domain
- Dashboard domain grid shows accurate per-domain accuracy after 20+ answers
- Score report upload (JPG) correctly pre-fills onboarding fields via Gemini
- If `GEMINI_API_KEY` is missing or invalid, Sprint still works via fallback question selection
- `node server/ingest.js` loads questions and logs summary without errors
