# ADHDSat Checkpoint

**Updated:** 2026-06-28

## Status: SHIPPABLE -- Ready to push and deploy

## Completed This Session

### Critical MathText Fixes
- **Root cause fixed**: `asciiToLatex` converts `2^3` → `$2^{3}$`; old heuristic matched `$2` as currency (digits followed by `^`) leaving an orphaned `$` that greedily consumed all following text as one garbled italic block. New regex `/^(\d+)(?=\s|[.,;:!?)]|$)/` only treats `$N` as currency when followed by whitespace or sentence punctuation.
- **Multi-line explanation fix**: Removed `mergeDollarSpans` which was incorrectly concatenating adjacent-line math spans like `$x=3$\n$x-4=0...$` into one broken block.
- **Answer choices fix**: `$3$`, `$4$`, `$7$` now render correctly as math (not as `$3` currency + `$` orphan).

### Vercel Deployment
- `server/db.js`: Detects `VERCEL` env, copies `adhdsat.db` → `/tmp`, auto-seeds from `data/questions.json` if empty.
- `server/index.js`: Exports app for serverless; `app.listen()` skipped on Vercel.
- `vercel.json`: Rewrites `/api/*` → Express function, `/*` → SPA.

### UI Polish
- Dashboard: `progress.predictedScore.english` null → shows `--` not blank.
- Sprint summary stat grid: Reduced padding/gap, `minWidth: 0` -- no more XP card clipping on mobile.
- Sprint mode `←` button: Replaced unicode arrow with `ChevronLeft` Lucide icon.
- Sprint milestone toast `✓`: Replaced with `CheckCircle2` Lucide icon.

## Git Log (latest 10)
```
0a4a887 fix: replace unicode arrow in sprint mode button with ChevronLeft icon
5f028a6 fix: summary stat cards fit mobile, Dashboard R&W shows '--' when no data
ccf64f8 fix: remove functions section from vercel config
0e2ad9f fix: MathText currency regex (root cause)
18a4c09 feat: Vercel deployment + MathText multi-line fix
448f330 fix: MathText $3$ renders as math not currency
3d9c5a4 fix: MathText currency heuristic (digit-only token check)
047182c fix: MathText currency dollar signs not math delimiters
2683c3d feat: production static file serving + Sprint Again restarts same mode
```

## What Works (verified via Playwright live testing)
- Adaptive/math/english sprint modes, 5/10/15/20Q
- Practice test mode (22q math / 27q english with timers)
- SM-2 spaced repetition review queue
- MathText: currency (`$75 for`), math (`$2x$`, `$2^{3}$`, `$3$`), multi-line explanations
- Sprint Again restarts same mode instantly (no picker round-trip)
- Session recovery prompt (Zap icon, no emoji)
- Pre-fetch covers all questions including last
- XP scaling by difficulty (15/20/30 sprint; 20/25/35 review)
- Difficulty-weighted score prediction (shown after 10+ answers)
- Domain performance tracking and visualization
- Level-up toast on XP milestones
- Confetti on personal best accuracy
- Domain breakdown on sprint summary screen
- Wrong answer cards (expandable, show correct answer + explanation)
- ErrorBoundary with recovery button
- Streak tracking (daily)
- Zero raw emoji across entire codebase (all replaced with Lucide icons)

## Next Action (human)
1. `git push origin main`
2. Create Vercel project, connect repo
3. Add env var: `GEMINI_API_KEY` in Vercel dashboard
4. Deploy

## Known Limitations
- SQLite on Vercel: user data resets on cold starts. Questions always available from bundled JSON. Acceptable for MVP.
- English subscore shows `--` until 3+ English questions answered.
