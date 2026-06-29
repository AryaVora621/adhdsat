# ADHDSat — Launch & Handoff

**Status: LIVE in production — https://adhdsat.vercel.app**
Verified end-to-end in a real browser against the live database. Zero console errors.

## Architecture (production)

- **Frontend**: React 19 + Vite SPA, served from Vercel edge CDN (`dist`).
- **Backend**: Express 5 as a Vercel function via `api/[...slug].js`; `vercel.json`
  rewrites `/api/:path*` to the catch-all.
- **Database**: Supabase Postgres (`adhdsat` schema), accessed via the transaction
  pooler (port 6543). Shared + persistent across cold starts.
- **Region**: functions pinned to `syd1` (co-located with the Sydney DB) — DB-heavy
  endpoints ~0.58s (was ~2.9s from Mumbai).
- **AI**: Gemini 2.5 Flash for adaptive selection + explanations, with rule-based
  fallbacks everywhere (works fully without the key).

## Verified features (all live)

| Area | Verified |
| --- | --- |
| Onboarding + study plan | Persists baseline, weak areas, target, test date |
| Adaptive sprints | Math + English mix, targets weak domains |
| Input | Mouse click and keyboard (1-4, Enter, H) |
| Math | KaTeX rendering |
| Gamification | XP, levels, daily streak, personal best |
| Resume | Picks up an unfinished sprint |
| Sprint summary | Accuracy, grade, 8-domain breakdown, wrong-answer cards |
| Review (SM-2) | Pulls wrong answers, grades, schedules next interval, +25 XP, queue badge |
| Practice Test | Math (22Q/35min) + English (27Q/32min), live countdown, hints disabled |
| Question bank | 529 questions seeded |

## The one action that needs you: rotate the DB password

The `DATABASE_URL` password was shared in chat during setup. Before real users:

1. Supabase dashboard -> Settings -> Database -> Reset database password.
2. Update Vercel:
   ```bash
   vercel env rm DATABASE_URL production --yes
   vercel env add DATABASE_URL production   # paste the new pooler URI
   vercel --prod
   ```
3. Update your local `.env` to match.

## Deploy / operate

```bash
vercel --prod                 # deploy
node server/ingest.js         # push questions.json edits to the live DB
node server/generate-questions.js  # AI-generate more questions (appends to JSON)
```

Env vars live in the Vercel project (Production/Preview/Development):
`DATABASE_URL` (required), `GEMINI_API_KEY` (optional).

## Open future phases (need a product decision)

- Leaderboards / friend challenges
- Push notifications / streak reminders
- Larger question bank (1000+)
- Mobile-specific polish pass
