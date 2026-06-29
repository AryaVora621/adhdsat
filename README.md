# ADHDSat

An ADHD-oriented SAT prep tool. Short adaptive sprints, instant feedback, spaced
repetition, XP and streaks, and an AI coach. Built for focus: small wins,
visible progress, and low friction to start.

## Features

- **Adaptive sprints** (5/10/15/20 questions) that target your weakest domains
- **Full practice-test simulations** (timed math/english modules)
- **Spaced repetition** (SM-2) for wrong answers via the Review queue
- **Predicted SAT score** with a difficulty-weighted model once you've answered 10+
- **AI coach insights** and on-demand "Deep Dive" explanations (Gemini)
- **Gamification**: XP, levels, daily streaks, milestone nudges, confetti
- **Study plan**: target score, test date, daily sprint pacing
- KaTeX math rendering, keyboard shortcuts, mobile + desktop layouts

## Stack

- **Frontend**: React 19 + Vite, React Router
- **Backend**: Express 5 (also runs as a Vercel serverless function)
- **Database**: Postgres (Supabase) via `pg`, in a dedicated `adhdsat` schema
- **AI**: Google Gemini 2.5 Flash (optional; rule-based fallbacks everywhere)

## Environment variables

| Name             | Required | Purpose                                                        |
| ---------------- | -------- | -------------------------------------------------------------- |
| `DATABASE_URL`   | yes      | Postgres connection string (Supabase **transaction pooler**)   |
| `GEMINI_API_KEY` | no       | Enables adaptive AI + AI insights/explanations (falls back)    |

`DATABASE_URL` should be the Supabase **Transaction pooler** URI (port 6543),
which is built for serverless:

```
postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

## Local development

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL (and optionally GEMINI_API_KEY)
npm run dev            # vite + express together
```

On first boot the server seeds the 583-question bank from
`server/data/questions.json` into Postgres (idempotent — it only runs when the
`questions` table is empty).

- Frontend: http://localhost:5173
- API: http://localhost:3001 (proxied)

## Database

Schema lives in the `adhdsat` Postgres schema. Tables: `users`, `questions`,
`user_answers`, `sprints`, `review_cards`. The server sets `search_path` to
`adhdsat` on every connection, so queries are unqualified.

To re-create the schema on a fresh Postgres, apply the DDL in
`server/db.js`'s sibling migration (see the `adhdsat_init_schema` migration that
created the schema), or run it through your migration tool of choice.

## Deploy (Vercel)

1. Set both env vars in the Vercel project (Production, Preview, Development):
   ```bash
   vercel env add DATABASE_URL
   vercel env add GEMINI_API_KEY
   ```
2. Deploy:
   ```bash
   vercel --prod
   ```

`api/[...slug].js` proxies all `/api/*` requests to the Express app; the SPA is
served from `dist`. Because the database is shared Postgres (not local SQLite),
user progress persists across cold starts and function instances.

## Expanding the question bank

The bank lives in `server/data/questions.json` and is seeded into Postgres on
first boot. To add more questions:

```bash
node server/generate-questions.js   # AI-generates questions, appends to questions.json
node server/ingest.js               # upserts questions.json into Postgres (by id)
```

`ingest.js` is idempotent: it refreshes edited questions and adds new ones
without duplicating. (Auto-seed on boot only runs when the table is empty, so
run `ingest.js` to push later additions to the live DB.)

## Scripts

- `npm run dev` — Vite + Express (nodemon)
- `npm run build` — production build to `dist`
- `npm start` — run the Express server (serves `dist` if present)
- `npm run lint` — oxlint
- `node server/ingest.js` — sync `questions.json` into Postgres
- `node server/generate-questions.js` — AI-generate more questions
