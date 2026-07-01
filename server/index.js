import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { query, rows, row, ensureSeed } from './db.js';
import { getAdaptiveCriteria, streamExplanation, analyzeScoreReport } from './gemini.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.GEMINI_API_KEY) {
  console.warn('[ADHDSat] GEMINI_API_KEY not set -- adaptive difficulty and explanations will use fallback mode.');
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure the shared question bank is seeded before serving any API request.
// The promise is memoized, so this is a no-op after the first call per instance.
app.use((req, res, next) => {
  ensureSeed().then(() => next()).catch(() => next());
});

const MATH_DOMAINS = ['Algebra', 'Advanced Math', 'Problem Solving & Data Analysis', 'Geometry & Trig'];
const ENG_DOMAINS = ['Information & Ideas', 'Craft & Structure', 'Expression of Ideas', 'Standard English Conventions'];
const DOMAINS = [...MATH_DOMAINS, ...ENG_DOMAINS];

const toInt = (v) => (v ? 1 : 0); // coerce boolean/number to the 0/1 integer columns use

// --- Health ---

app.get('/api/health', async (req, res) => {
  const r = await row('SELECT COUNT(*)::int AS cnt FROM adhdsat.questions');
  res.json({ status: 'ok', questions: r?.cnt ?? 0, ts: new Date().toISOString() });
});

// --- Users ---

app.get('/api/users/:id', async (req, res) => {
  const user = await row('SELECT * FROM adhdsat.users WHERE id = $1', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.weak_areas = JSON.parse(user.weak_areas || '[]');
  res.json(user);
});

app.post('/api/users', async (req, res) => {
  const { id, display_name } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  try {
    await query(
      'INSERT INTO adhdsat.users (id, display_name, created_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
      [id, display_name || 'Learner', new Date().toISOString()]
    );
    const user = await row('SELECT * FROM adhdsat.users WHERE id = $1', [id]);
    user.weak_areas = JSON.parse(user.weak_areas || '[]');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Link a Supabase-authenticated identity to a backend user row. If the visitor
// was previously a guest (anonymous localStorage id) with progress, that progress
// is migrated into the real account on first sign-in. Idempotent: returning users
// just get their existing row back.
const CHILD_TABLES = ['user_answers', 'sprints', 'review_cards', 'practice_test_results'];

app.post('/api/users/claim', async (req, res) => {
  const { authId, email, guestId, display_name } = req.body;
  if (!authId) return res.status(400).json({ error: 'authId required' });
  try {
    let existing = await row('SELECT * FROM adhdsat.users WHERE id = $1', [authId]);

    // First-time sign-in: if a guest row carries progress, adopt it under the real id.
    const guestUsable = guestId && guestId !== authId
      ? await row('SELECT * FROM adhdsat.users WHERE id = $1', [guestId])
      : null;

    if (!existing) {
      if (guestUsable) {
        // Promote the guest row to the authenticated identity, then re-point children.
        await query(
          `INSERT INTO adhdsat.users
             (id, display_name, total_xp, current_level, current_streak, longest_streak,
              last_active_date, created_at, study_plan, baseline_english, baseline_math,
              weak_areas, onboarding_completed, subscores, plan, email, is_guest)
           SELECT $1, display_name, total_xp, current_level, current_streak, longest_streak,
              last_active_date, created_at, study_plan, baseline_english, baseline_math,
              weak_areas, onboarding_completed, subscores, plan, $2, 0
           FROM adhdsat.users WHERE id = $3`,
          [authId, email || null, guestId]
        );
        for (const t of CHILD_TABLES) {
          await query(`UPDATE adhdsat.${t} SET user_id = $1 WHERE user_id = $2`, [authId, guestId]);
        }
        await query('DELETE FROM adhdsat.users WHERE id = $1', [guestId]);
      } else {
        await query(
          `INSERT INTO adhdsat.users (id, display_name, email, is_guest, created_at)
           VALUES ($1, $2, $3, 0, $4) ON CONFLICT (id) DO NOTHING`,
          [authId, display_name || 'Learner', email || null, new Date().toISOString()]
        );
      }
      existing = await row('SELECT * FROM adhdsat.users WHERE id = $1', [authId]);
    } else if (email && existing.email !== email) {
      await query('UPDATE adhdsat.users SET email = $1, is_guest = 0 WHERE id = $2', [email, authId]);
      existing = await row('SELECT * FROM adhdsat.users WHERE id = $1', [authId]);
    }

    existing.weak_areas = JSON.parse(existing.weak_areas || '[]');
    res.json(existing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { display_name, weak_areas, baseline_english, baseline_math } = req.body;
  try {
    const fields = [];
    const vals = [];
    let p = 0;
    if (display_name !== undefined) { fields.push(`display_name = $${++p}`); vals.push(display_name); }
    if (weak_areas !== undefined) { fields.push(`weak_areas = $${++p}`); vals.push(JSON.stringify(weak_areas)); }
    if (baseline_english !== undefined) { fields.push(`baseline_english = $${++p}`); vals.push(baseline_english); }
    if (baseline_math !== undefined) { fields.push(`baseline_math = $${++p}`); vals.push(baseline_math); }
    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
    vals.push(req.params.id);
    await query(`UPDATE adhdsat.users SET ${fields.join(', ')} WHERE id = $${++p}`, vals);
    const user = await row('SELECT * FROM adhdsat.users WHERE id = $1', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.weak_areas = JSON.parse(user.weak_areas || '[]');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:id/xp', async (req, res) => {
  const { xp_gained } = req.body;
  try {
    await query('UPDATE adhdsat.users SET total_xp = total_xp + $1 WHERE id = $2', [xp_gained || 0, req.params.id]);
    const today = new Date().toISOString().split('T')[0];
    const user = await row('SELECT * FROM adhdsat.users WHERE id = $1', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    let newStreak = user.current_streak;
    let longestStreak = user.longest_streak;
    if (user.last_active_date !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      newStreak = user.last_active_date === yesterday ? newStreak + 1 : 1;
      longestStreak = Math.max(longestStreak, newStreak);
      await query('UPDATE adhdsat.users SET current_streak = $1, longest_streak = $2, last_active_date = $3 WHERE id = $4',
        [newStreak, longestStreak, today, req.params.id]);
    }
    const updated = await row('SELECT * FROM adhdsat.users WHERE id = $1', [req.params.id]);
    updated.weak_areas = JSON.parse(updated.weak_areas || '[]');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Onboarding ---
// Upsert so onboarding succeeds even if the initial /api/users call never
// reached this instance (the old SQLite-in-/tmp bug). Idempotent.

app.post('/api/onboarding', async (req, res) => {
  const { userId, baseline_english, baseline_math, weak_areas } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  try {
    await query(
      `INSERT INTO adhdsat.users (id, display_name, created_at, baseline_english, baseline_math, weak_areas, onboarding_completed)
       VALUES ($1, 'Learner', $2, $3, $4, $5, 1)
       ON CONFLICT (id) DO UPDATE SET
         baseline_english = EXCLUDED.baseline_english,
         baseline_math = EXCLUDED.baseline_math,
         weak_areas = EXCLUDED.weak_areas,
         onboarding_completed = 1`,
      [userId, new Date().toISOString(), baseline_english || 0, baseline_math || 0, JSON.stringify(weak_areas || [])]
    );
    const user = await row('SELECT * FROM adhdsat.users WHERE id = $1', [userId]);
    user.weak_areas = JSON.parse(user.weak_areas || '[]');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Questions ---

app.get('/api/questions', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const qs = await rows('SELECT * FROM adhdsat.questions ORDER BY random() LIMIT $1', [limit]);
  res.json(qs.map(q => ({ ...q, choices: JSON.parse(q.choices || '[]'), tags: JSON.parse(q.tags || '[]') })));
});

app.get('/api/questions/next', async (req, res) => {
  const { userId, section } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const allowedDomains = section === 'math' ? MATH_DOMAINS : section === 'english' ? ENG_DOMAINS : DOMAINS;

  const seen = (await rows('SELECT question_id FROM adhdsat.user_answers WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [userId])).map(r => r.question_id);

  const recent = await rows(`
    SELECT q.domain, ua.is_correct FROM adhdsat.user_answers ua
    JOIN adhdsat.questions q ON ua.question_id = q.id
    WHERE ua.user_id = $1 ORDER BY ua.created_at DESC LIMIT 30
  `, [userId]);

  const domainStats = {};
  for (const r of recent) {
    if (!domainStats[r.domain]) domainStats[r.domain] = { correct: 0, total: 0 };
    domainStats[r.domain].total++;
    if (r.is_correct) domainStats[r.domain].correct++;
  }
  const domainAccuracy = {};
  for (const [d, s] of Object.entries(domainStats)) {
    domainAccuracy[d] = s.total > 0 ? s.correct / s.total : null;
  }

  const user = await row('SELECT * FROM adhdsat.users WHERE id = $1', [userId]);
  const allWeakAreas = JSON.parse(user?.weak_areas || '[]');
  const weakAreas = allWeakAreas.filter(d => allowedDomains.includes(d));
  const subscores = user?.subscores ? JSON.parse(user.subscores) : null;
  const studyPlan = user?.study_plan ? JSON.parse(user.study_plan) : null;
  const targetScore = studyPlan?.target_score || null;
  const baseline = { english: user?.baseline_english || 0, math: user?.baseline_math || 0 };

  let criteria = null;
  try {
    criteria = await getAdaptiveCriteria({ domainAccuracy, weakAreas, subscores, targetScore, baseline });
  } catch {}

  if (!criteria || !allowedDomains.includes(criteria.domain)) {
    let targetDomain = null;
    let lowestAcc = Infinity;
    const untriedDomains = allowedDomains.filter(d => domainAccuracy[d] === undefined);
    if (untriedDomains.length > 0) {
      targetDomain = untriedDomains.find(d => weakAreas.includes(d)) || untriedDomains[0];
    } else {
      for (const [d, acc] of Object.entries(domainAccuracy)) {
        if (!allowedDomains.includes(d) || acc === null) continue;
        if (acc < lowestAcc) { lowestAcc = acc; targetDomain = d; }
      }
      if (!targetDomain) targetDomain = weakAreas[0] || allowedDomains[0];
    }
    const domainAcc = domainAccuracy[targetDomain];
    const difficulty = domainAcc === undefined || domainAcc === null ? 'medium'
      : domainAcc < 0.4 ? 'easy'
      : domainAcc > 0.75 ? 'hard'
      : 'medium';
    criteria = { domain: targetDomain, difficulty };
  }

  let question = await row(
    `SELECT * FROM adhdsat.questions WHERE domain = $1 AND difficulty = $2 AND id <> ALL($3::text[]) ORDER BY random() LIMIT 1`,
    [criteria.domain, criteria.difficulty, seen]
  );
  if (!question) {
    question = await row(
      `SELECT * FROM adhdsat.questions WHERE domain = $1 AND id <> ALL($2::text[]) ORDER BY random() LIMIT 1`,
      [criteria.domain, seen]
    );
  }
  if (!question) {
    question = await row(
      `SELECT * FROM adhdsat.questions WHERE domain = ANY($1::text[]) AND id <> ALL($2::text[]) ORDER BY random() LIMIT 1`,
      [allowedDomains, seen]
    );
  }
  if (!question) {
    question = await row('SELECT * FROM adhdsat.questions ORDER BY random() LIMIT 1');
  }
  if (!question) return res.status(404).json({ error: 'No questions available.' });

  res.json({ ...question, choices: JSON.parse(question.choices || '[]'), tags: JSON.parse(question.tags || '[]') });
});

// --- Batch fetch for background prefetching ---
app.get('/api/questions/batch', async (req, res) => {
  const { userId, section, count = 10 } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const allowedDomains = section === 'math' ? MATH_DOMAINS : section === 'english' ? ENG_DOMAINS : DOMAINS;

  const recent = await rows(`
    SELECT q.domain, ua.is_correct FROM adhdsat.user_answers ua
    JOIN adhdsat.questions q ON ua.question_id = q.id
    WHERE ua.user_id = $1 ORDER BY ua.created_at DESC LIMIT 50
  `, [userId]);

  let correctCount = 0;
  for (const r of recent) {
    if (r.is_correct) correctCount++;
  }
  const overallAccuracy = recent.length > 0 ? correctCount / recent.length : 0.5;

  // Optional: save user_score to db for external visibility
  await query('UPDATE adhdsat.users SET current_level = $1 WHERE id = $2', [Math.round(overallAccuracy * 100), userId]);

  const numQuestions = parseInt(count, 10);
  let easyCount = 0, mediumCount = 0, hardCount = 0;

  if (overallAccuracy < 0.4) {
    easyCount = Math.floor(numQuestions * 0.6);
    mediumCount = Math.floor(numQuestions * 0.4);
    hardCount = numQuestions - easyCount - mediumCount;
  } else if (overallAccuracy < 0.7) {
    easyCount = Math.floor(numQuestions * 0.2);
    mediumCount = Math.floor(numQuestions * 0.6);
    hardCount = numQuestions - easyCount - mediumCount;
  } else {
    easyCount = Math.floor(numQuestions * 0.1);
    mediumCount = Math.floor(numQuestions * 0.3);
    hardCount = numQuestions - easyCount - mediumCount;
  }

  const seen = (await rows('SELECT question_id FROM adhdsat.user_answers WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [userId])).map(r => r.question_id);
  const picked = [];

  async function fetchQuestions(difficulty, needed) {
    if (needed <= 0) return;
    const qs = await rows(
      `SELECT * FROM adhdsat.questions 
       WHERE domain = ANY($1::text[]) AND difficulty = $2 AND id <> ALL($3::text[]) 
       ORDER BY random() LIMIT $4`,
      [allowedDomains, difficulty, seen.concat(picked.map(q => q.id)), needed]
    );
    picked.push(...qs);
  }

  await fetchQuestions('easy', easyCount);
  await fetchQuestions('medium', mediumCount);
  await fetchQuestions('hard', hardCount);

  if (picked.length < numQuestions) {
    const fallback = await rows(
      `SELECT * FROM adhdsat.questions 
       WHERE domain = ANY($1::text[]) AND id <> ALL($2::text[]) 
       ORDER BY random() LIMIT $3`,
      [allowedDomains, seen.concat(picked.map(q => q.id)), numQuestions - picked.length]
    );
    picked.push(...fallback);
  }

  picked.sort(() => Math.random() - 0.5);

  res.json({
    userScore: Math.round(overallAccuracy * 100),
    questions: picked.map(q => ({ ...q, choices: JSON.parse(q.choices || '[]'), tags: JSON.parse(q.tags || '[]') }))
  });
});

// --- Full practice test: serve a whole module of distinct, mixed-difficulty
// questions in one call (module 1 of the digital SAT is a broad easy/medium/hard
// mix across the section's domains). Returns the answer keys too, since the
// practice-test client scores locally at the end of each timed module.
app.get('/api/practice-test', async (req, res) => {
  const { section, userId } = req.query;
  if (await getPlan(userId) !== 'paid') {
    return res.status(403).json({ error: 'upgrade_required', feature: 'Full practice tests' });
  }
  const count = Math.min(parseInt(req.query.count, 10) || 27, 30);
  const domains = section === 'math' ? MATH_DOMAINS : ENG_DOMAINS;
  const perDiff = Math.ceil(count / 3);
  const seen = new Set();
  const picked = [];
  for (const diff of ['easy', 'medium', 'hard']) {
    const qs = await rows(
      `SELECT * FROM adhdsat.questions WHERE domain = ANY($1::text[]) AND difficulty = $2 ORDER BY random() LIMIT $3`,
      [domains, diff, perDiff]
    );
    for (const q of qs) if (!seen.has(q.id)) { seen.add(q.id); picked.push(q); }
  }
  if (picked.length < count) {
    const more = await rows(
      `SELECT * FROM adhdsat.questions WHERE domain = ANY($1::text[]) AND id <> ALL($2::text[]) ORDER BY random() LIMIT $3`,
      [domains, [...seen], count - picked.length]
    );
    for (const q of more) if (!seen.has(q.id)) { seen.add(q.id); picked.push(q); }
  }
  // Shuffle so the module isn't ordered easy -> hard.
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  const out = picked.slice(0, count).map(q => ({
    ...q, choices: JSON.parse(q.choices || '[]'), tags: JSON.parse(q.tags || '[]')
  }));
  res.json({ section: section || 'mixed', count: out.length, questions: out });
});

// Save a completed practice-test result so students can track score trends.
app.post('/api/practice-test/result', async (req, res) => {
  const { userId, rw_score, math_score, rw_correct, rw_total, math_correct, math_total } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  try {
    const id = crypto.randomUUID();
    const total = (rw_score || 0) + (math_score || 0);
    await query(
      `INSERT INTO adhdsat.practice_test_results
        (id, user_id, rw_score, math_score, total_score, rw_correct, rw_total, math_correct, math_total, taken_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, userId, rw_score || 0, math_score || 0, total, rw_correct || 0, rw_total || 0, math_correct || 0, math_total || 0, new Date().toISOString()]
    );
    res.json({ id, total_score: total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Past practice-test results (most recent first), for the score-trend view.
app.get('/api/practice-test/history/:userId', async (req, res) => {
  try {
    const results = await rows(
      `SELECT total_score, rw_score, math_score, taken_at
       FROM adhdsat.practice_test_results WHERE user_id = $1
       ORDER BY taken_at DESC LIMIT 20`,
      [req.params.userId]
    );
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Sprints ---

// --- Plan / tier gating ---
// Free: up to 3 sprints/day + unlimited review. Paid: unlimited sprints, full
// practice tests, timed modules, and all AI features.
const FREE_DAILY_SPRINTS = 3;
async function getPlan(userId) {
  if (!userId) return 'free';
  const u = await row('SELECT plan FROM adhdsat.users WHERE id = $1', [userId]);
  return u?.plan === 'paid' ? 'paid' : 'free';
}

app.post('/api/sprints', async (req, res) => {
  const { userId, sprint_type } = req.body;
  try {
    const plan = await getPlan(userId);
    const isTimedModule = sprint_type === 'test-math' || sprint_type === 'test-english';
    if (plan === 'free') {
      if (isTimedModule) {
        return res.status(403).json({ error: 'upgrade_required', feature: 'Timed practice modules' });
      }
      const today = new Date().toISOString().slice(0, 10);
      const startedToday = (await row(
        `SELECT COUNT(*)::int AS cnt FROM adhdsat.sprints
         WHERE user_id = $1 AND started_at >= $2 AND sprint_type NOT IN ('review', 'test-math', 'test-english')`,
        [userId, today + 'T00:00:00.000Z']
      )).cnt;
      if (startedToday >= FREE_DAILY_SPRINTS) {
        return res.status(403).json({ error: 'daily_limit', limit: FREE_DAILY_SPRINTS });
      }
    }
    const id = crypto.randomUUID();
    await query('INSERT INTO adhdsat.sprints (id, user_id, sprint_type, started_at) VALUES ($1, $2, $3, $4)',
      [id, userId, sprint_type || 'adaptive', new Date().toISOString()]);
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upgrade / downgrade a user's plan. Plan-flag only for now (no payment
// processor yet); the upgrade screen calls this to grant access.
app.post('/api/users/:id/plan', async (req, res) => {
  const { plan } = req.body;
  if (!['free', 'paid'].includes(plan)) return res.status(400).json({ error: 'plan must be free or paid' });
  try {
    const user = await row('UPDATE adhdsat.users SET plan = $1 WHERE id = $2 RETURNING *', [plan, req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.weak_areas = JSON.parse(user.weak_areas || '[]');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sprints/:id/finish', async (req, res) => {
  const { questions_attempted, questions_correct, xp_earned } = req.body;
  try {
    await query('UPDATE adhdsat.sprints SET questions_attempted = $1, questions_correct = $2, xp_earned = $3, completed_at = $4 WHERE id = $5',
      [questions_attempted || 0, questions_correct || 0, xp_earned || 0, new Date().toISOString(), req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Answers ---

app.post('/api/answers', async (req, res) => {
  const { id, user_id, question_id, selected_choice, is_correct, hints_used, time_spent_seconds, sprint_id } = req.body;
  try {
    await query(
      `INSERT INTO adhdsat.user_answers (id, user_id, question_id, selected_choice, is_correct, hints_used, time_spent_seconds, sprint_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id || crypto.randomUUID(), user_id, question_id, selected_choice, toInt(is_correct), hints_used || 0, time_spent_seconds || 0, sprint_id, new Date().toISOString()]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batch-record answers (used by the full practice test). Recording them in
// user_answers means missed questions flow into the SM-2 review queue via
// syncReviewCards, and the questions inform domain stats / predicted score.
app.post('/api/answers/batch', async (req, res) => {
  const { user_id, answers } = req.body;
  if (!user_id || !Array.isArray(answers) || !answers.length) {
    return res.status(400).json({ error: 'user_id and a non-empty answers array are required' });
  }
  try {
    const now = new Date().toISOString();
    const values = [];
    const params = [];
    let p = 0;
    for (const a of answers) {
      values.push(`($${++p}, $${++p}, $${++p}, $${++p}, $${++p}, 0, $${++p}, NULL, $${++p})`);
      params.push(crypto.randomUUID(), user_id, a.question_id, a.selected_choice ?? null, toInt(a.is_correct), a.time_spent_seconds || 0, now);
    }
    await query(
      `INSERT INTO adhdsat.user_answers (id, user_id, question_id, selected_choice, is_correct, hints_used, time_spent_seconds, sprint_id, created_at)
       VALUES ${values.join(',')}`,
      params
    );
    res.json({ success: true, inserted: answers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Progress ---

app.get('/api/progress', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const user = await row('SELECT * FROM adhdsat.users WHERE id = $1', [userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const totalAnswered = (await row('SELECT COUNT(*)::int AS cnt FROM adhdsat.user_answers WHERE user_id = $1', [userId])).cnt;

  const domainStats = {};
  for (const domain of DOMAINS) {
    const last40 = await rows(`
      SELECT ua.is_correct FROM adhdsat.user_answers ua
      JOIN adhdsat.questions q ON ua.question_id = q.id
      WHERE ua.user_id = $1 AND q.domain = $2
      ORDER BY ua.created_at DESC LIMIT 40
    `, [userId, domain]);
    const last20 = last40.slice(0, 20);
    const prior20 = last40.slice(20);
    const acc = (arr) => arr.length === 0 ? null : arr.filter(r => r.is_correct).length / arr.length;
    domainStats[domain] = {
      accuracy: acc(last20),
      priorAccuracy: acc(prior20),
      count: last20.length
    };
  }

  let predictedScore = null;
  if (totalAnswered >= 10) {
    const DIFF_WEIGHT = { easy: 1, medium: 1.5, hard: 2 };
    const weightedAcc = async (domains) => {
      const rs = await rows(`
        SELECT ua.is_correct, q.difficulty
        FROM adhdsat.user_answers ua JOIN adhdsat.questions q ON ua.question_id = q.id
        WHERE ua.user_id = $1 AND q.domain = ANY($2::text[])
        ORDER BY ua.created_at DESC LIMIT 60
      `, [userId, domains]);
      if (rs.length < 3) return null;
      let earned = 0, possible = 0;
      for (const r of rs) {
        const w = DIFF_WEIGHT[r.difficulty] || 1.5;
        possible += w;
        if (r.is_correct) earned += w;
      }
      return possible > 0 ? earned / possible : null;
    };
    const mathAcc = await weightedAcc(MATH_DOMAINS);
    const engAcc = await weightedAcc(ENG_DOMAINS);
    const toScore = (acc) => acc === null ? null : Math.min(800, Math.max(200, Math.round((200 + acc * 620) / 10) * 10));
    const mathScore = toScore(mathAcc);
    const engScore = toScore(engAcc);
    if (mathScore !== null || engScore !== null) {
      const mS = mathScore || 400;
      const eS = engScore || 400;
      predictedScore = {
        math: mathScore,
        english: engScore,
        total: mS + eS,
        range: `${mS + eS - 40}-${mS + eS + 40}`
      };
    }
  }

  const recentSprints = await rows(`
    SELECT * FROM adhdsat.sprints WHERE user_id = $1 AND completed_at IS NOT NULL
    ORDER BY completed_at DESC LIMIT 10
  `, [userId]);

  res.json({
    domainStats,
    predictedScore,
    recentSprints,
    totalAnswered,
    baseline: { english: user.baseline_english, math: user.baseline_math }
  });
});

// --- Sprint domain breakdown ---
app.get('/api/sprints/:id/breakdown', async (req, res) => {
  const rs = await rows(`
    SELECT q.domain, ua.is_correct, ua.time_spent_seconds
    FROM adhdsat.user_answers ua
    JOIN adhdsat.questions q ON ua.question_id = q.id
    WHERE ua.sprint_id = $1
  `, [req.params.id]);

  const byDomain = {};
  let totalTime = 0;
  for (const r of rs) {
    if (!byDomain[r.domain]) byDomain[r.domain] = { correct: 0, total: 0 };
    byDomain[r.domain].total++;
    if (r.is_correct) byDomain[r.domain].correct++;
    if (r.time_spent_seconds) totalTime += r.time_spent_seconds;
  }

  const domains = Object.entries(byDomain).map(([domain, s]) => ({
    domain,
    correct: s.correct,
    total: s.total,
    accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0
  })).sort((a, b) => a.accuracy - b.accuracy);

  res.json({ domains, totalTime });
});

app.get('/api/sprints', async (req, res) => {
  const { userId, days = 7 } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const rs = await rows(`
    SELECT s.id, s.sprint_type, s.questions_correct, s.questions_attempted, s.xp_earned,
           s.started_at, s.completed_at,
           COALESCE(SUM(ua.time_spent_seconds), 0) AS duration_seconds
    FROM adhdsat.sprints s
    LEFT JOIN adhdsat.user_answers ua ON s.id = ua.sprint_id
    WHERE s.user_id = $1 AND s.completed_at IS NOT NULL AND s.started_at > $2
    GROUP BY s.id
    ORDER BY s.started_at DESC
  `, [userId, daysAgo]);

  const sprints = rs.map(r => ({
    id: r.id,
    sprint_type: r.sprint_type,
    correct_count: r.questions_correct,
    total_count: r.questions_attempted,
    xp_earned: r.xp_earned,
    duration_seconds: Number(r.duration_seconds),
    created_at: r.completed_at || r.started_at
  }));

  res.json({ sprints });
});

// --- Review Errors (SM-2 Spaced Repetition) ---

async function syncReviewCards(userId) {
  const wrong = await rows(`
    SELECT DISTINCT question_id FROM adhdsat.user_answers
    WHERE user_id = $1 AND is_correct = 0
  `, [userId]);
  if (!wrong.length) return;

  const now = new Date().toISOString();
  const values = [];
  const params = [];
  let p = 0;
  for (const r of wrong) {
    values.push(`($${++p}, $${++p}, $${++p}, $${++p}, 1, 2.5, 0)`);
    params.push(crypto.randomUUID(), userId, r.question_id, now);
  }
  await query(
    `INSERT INTO adhdsat.review_cards (id, user_id, question_id, next_review_at, interval_days, ease_factor, rep_count)
     VALUES ${values.join(',')}
     ON CONFLICT (user_id, question_id) DO NOTHING`,
    params
  );
}

function sm2Update(card, quality) {
  const q = quality === 1 ? 4 : 1;
  let { ease_factor, interval_days, rep_count } = card;

  if (q < 3) {
    rep_count = 0;
    interval_days = 1;
  } else {
    rep_count += 1;
    if (rep_count === 1) interval_days = 1;
    else if (rep_count === 2) interval_days = 6;
    else interval_days = Math.round(interval_days * ease_factor);
    ease_factor = Math.max(1.3, ease_factor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  }

  const next = new Date(Date.now() + interval_days * 86400000).toISOString();
  return { ease_factor, interval_days, rep_count, next_review_at: next };
}

app.get('/api/review/next', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  await syncReviewCards(userId);
  const now = new Date().toISOString();

  let card = await row(`
    SELECT rc.* FROM adhdsat.review_cards rc
    JOIN adhdsat.questions q ON rc.question_id = q.id
    WHERE rc.user_id = $1 AND rc.next_review_at <= $2
    ORDER BY rc.next_review_at ASC
    LIMIT 1
  `, [userId, now]);

  if (!card) {
    card = await row(`
      SELECT rc.* FROM adhdsat.review_cards rc
      JOIN adhdsat.questions q ON rc.question_id = q.id
      WHERE rc.user_id = $1
      ORDER BY rc.next_review_at ASC
      LIMIT 1
    `, [userId]);
  }

  if (!card) return res.json(null);

  const q = await row('SELECT * FROM adhdsat.questions WHERE id = $1', [card.question_id]);
  if (!q) return res.json(null);
  q.choices = JSON.parse(q.choices || '[]');
  q.tags = JSON.parse(q.tags || '[]');

  q._sm2 = {
    card_id: card.id,
    interval_days: card.interval_days,
    rep_count: card.rep_count,
    next_review_at: card.next_review_at,
  };
  res.json(q);
});

app.post('/api/review/answer', async (req, res) => {
  const { userId, questionId, isCorrect } = req.body;
  if (!userId || !questionId) return res.status(400).json({ error: 'userId and questionId required' });

  await syncReviewCards(userId);

  const card = await row('SELECT * FROM adhdsat.review_cards WHERE user_id = $1 AND question_id = $2', [userId, questionId]);
  if (!card) return res.status(404).json({ error: 'Card not found' });

  const quality = isCorrect ? 1 : 0;
  const updated = sm2Update(card, quality);

  await query(`
    UPDATE adhdsat.review_cards
    SET ease_factor = $1, interval_days = $2, rep_count = $3, next_review_at = $4, last_reviewed_at = $5
    WHERE id = $6
  `, [updated.ease_factor, updated.interval_days, updated.rep_count, updated.next_review_at, new Date().toISOString(), card.id]);

  res.json({ success: true, next_review_at: updated.next_review_at, interval_days: updated.interval_days });
});

app.get('/api/review/count', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  await syncReviewCards(userId);
  const now = new Date().toISOString();
  const due = (await row('SELECT COUNT(*)::int AS cnt FROM adhdsat.review_cards WHERE user_id = $1 AND next_review_at <= $2', [userId, now])).cnt;
  const total = (await row('SELECT COUNT(*)::int AS cnt FROM adhdsat.review_cards WHERE user_id = $1', [userId])).cnt;
  res.json({ count: due, total });
});

// --- Study Plan ---

app.get('/api/study-plan/:userId', async (req, res) => {
  const user = await row('SELECT study_plan FROM adhdsat.users WHERE id = $1', [req.params.userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user.study_plan ? JSON.parse(user.study_plan) : null);
});

app.put('/api/study-plan/:userId', async (req, res) => {
  const { target_score, test_date } = req.body;
  if (!target_score) return res.status(400).json({ error: 'target_score required' });
  const existing = await row('SELECT study_plan FROM adhdsat.users WHERE id = $1', [req.params.userId]);
  const prev = existing?.study_plan ? JSON.parse(existing.study_plan) : {};
  const plan = JSON.stringify({ ...prev, target_score, ...(test_date ? { test_date } : {}) });
  await query('UPDATE adhdsat.users SET study_plan = $1 WHERE id = $2', [plan, req.params.userId]);
  res.json(JSON.parse(plan));
});

// --- AI Insights ---

app.get('/api/insights/:userId', async (req, res) => {
  const userId = req.params.userId;
  const user = await row('SELECT * FROM adhdsat.users WHERE id = $1', [userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const totalAnswered = (await row('SELECT COUNT(*)::int AS cnt FROM adhdsat.user_answers WHERE user_id = $1', [userId])).cnt;

  const recent = await rows(`
    SELECT q.domain, ua.is_correct FROM adhdsat.user_answers ua
    JOIN adhdsat.questions q ON ua.question_id = q.id
    WHERE ua.user_id = $1 ORDER BY ua.created_at DESC LIMIT 30
  `, [userId]);

  const domainStats = {};
  for (const r of recent) {
    if (!domainStats[r.domain]) domainStats[r.domain] = { correct: 0, total: 0 };
    domainStats[r.domain].total++;
    if (r.is_correct) domainStats[r.domain].correct++;
  }

  const domainAccuracy = {};
  for (const [d, s] of Object.entries(domainStats)) {
    domainAccuracy[d] = s.total > 0 ? Math.round(s.correct / s.total * 100) : null;
  }

  const weakAreas = JSON.parse(user.weak_areas || '[]');
  const subscores = user.subscores ? JSON.parse(user.subscores) : null;
  const studyPlan = user.study_plan ? JSON.parse(user.study_plan) : null;
  const dueReviews = (await row('SELECT COUNT(*)::int AS cnt FROM adhdsat.review_cards WHERE user_id = $1 AND next_review_at <= $2', [userId, new Date().toISOString()])).cnt;

  const insights = [];

  if (dueReviews > 0) {
    insights.push({ type: 'review', priority: 1, text: `${dueReviews} card${dueReviews > 1 ? 's' : ''} due for review -- complete these first to lock in the concepts.` });
  }

  let weakestDomain = null, weakestAcc = Infinity;
  for (const [d, acc] of Object.entries(domainAccuracy)) {
    if (acc !== null && acc < weakestAcc) { weakestAcc = acc; weakestDomain = d; }
  }

  if (weakestDomain && weakestAcc < 70) {
    insights.push({ type: 'focus', priority: 2, text: `Your accuracy in ${weakestDomain} is ${weakestAcc}%. Try a Math or English sprint focused here.`, domain: weakestDomain });
  }

  if (studyPlan) {
    const daysLeft = Math.max(0, Math.round((new Date(studyPlan.test_date) - Date.now()) / 86400000));
    const gap = studyPlan.target_score - ((user.baseline_english || 0) + (user.baseline_math || 0));
    if (daysLeft <= 14 && daysLeft > 0) {
      insights.push({ type: 'urgency', priority: 1, text: `${daysLeft} days until your test. Focus on ${weakestDomain || weakAreas[0] || 'your weakest areas'} and do at least 2 sprints today.` });
    } else if (gap > 200 && totalAnswered < 20) {
      insights.push({ type: 'ramp', priority: 3, text: `You're targeting a ${gap}-point improvement. Complete at least 3 sprints today to build momentum.` });
    }
  }

  if (totalAnswered === 0) {
    insights.push({ type: 'start', priority: 0, text: 'Welcome! Start your first sprint to get a baseline and unlock personalized insights.' });
  } else if (totalAnswered < 10) {
    insights.push({ type: 'start', priority: 3, text: `You've answered ${totalAnswered} question${totalAnswered === 1 ? '' : 's'}. Do ${10 - totalAnswered} more to unlock your predicted score.` });
  }

  if (weakAreas.length > 0 && Object.keys(domainAccuracy).length === 0) {
    insights.push({ type: 'focus', priority: 2, text: `You flagged ${weakAreas.slice(0, 2).join(' and ')} as weak areas. Start with an Adaptive sprint to build your baseline there.` });
  }

  if (totalAnswered >= 20) {
    const practicedDomains = new Set(Object.keys(domainAccuracy));
    const neglectedMath = MATH_DOMAINS.filter(d => !practicedDomains.has(d));
    const neglectedEng = ENG_DOMAINS.filter(d => !practicedDomains.has(d));
    if (neglectedMath.length >= 2) {
      insights.push({ type: 'neglect', priority: 2, text: `Hyperfocus alert: you haven't practiced ${neglectedMath.slice(0, 2).join(' or ')} yet. These could hide on test day.` });
    } else if (neglectedEng.length >= 2) {
      insights.push({ type: 'neglect', priority: 2, text: `Hyperfocus alert: you haven't practiced ${neglectedEng.slice(0, 2).join(' or ')} yet. Don't let English sections catch you off guard.` });
    }
  }

  let aiInsight = null;
  // The AI-written insight is a paid feature; free users still get the
  // rule-based insights above.
  if (user.plan === 'paid' && process.env.GEMINI_API_KEY && totalAnswered >= 5) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
      const prompt = `You are a concise SAT prep coach. Give a single motivating, specific insight for this student in 1-2 sentences max.

Domain accuracy (last 30 Qs): ${JSON.stringify(domainAccuracy)}
Weak areas: ${JSON.stringify(weakAreas)}
${subscores ? `Score report priorities: ${JSON.stringify(subscores)}` : ''}
${studyPlan ? `Target: ${studyPlan.target_score}, test in ${Math.round((new Date(studyPlan.test_date) - Date.now()) / 86400000)} days` : ''}
Total questions answered: ${totalAnswered}
Due review cards: ${dueReviews}

Return ONLY the insight text, no JSON, no labels.`;
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      ]);
      aiInsight = result.response.text().trim();
    } catch {}
  }

  res.json({
    insights: insights.sort((a, b) => a.priority - b.priority),
    aiInsight,
    domainAccuracy,
    dueReviews,
    totalAnswered
  });
});

// --- Gemini Endpoints ---

app.post('/api/explain', async (req, res) => {
  const { questionText, selectedChoice, correctAnswer, userId } = req.body;
  if (await getPlan(userId) !== 'paid') {
    return res.status(403).json({ error: 'upgrade_required', feature: 'AI breakdowns' });
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    for await (const chunk of streamExplanation({ questionText, selectedChoice, correctAnswer })) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }
  } catch {
    res.write(`data: ${JSON.stringify({ text: 'Error generating explanation.' })}\n\n`);
  }
  res.write('data: [DONE]\n\n');
  res.end();
});

app.post('/api/analyze-report', async (req, res) => {
  const { image, mimeType, userId } = req.body;
  if (!image) return res.status(400).json({ error: 'image (base64) required' });
  if (await getPlan(userId) !== 'paid') {
    return res.status(403).json({ error: 'upgrade_required', feature: 'Score report import' });
  }
  const result = await analyzeScoreReport(image, mimeType);
  if (!result) return res.status(422).json({ error: 'Could not parse score report' });

  if (userId && result.subscores && Object.keys(result.subscores).length > 0) {
    try {
      await query('UPDATE adhdsat.users SET subscores = $1 WHERE id = $2', [JSON.stringify(result.subscores), userId]);
    } catch {}
  }

  res.json(result);
});

// --- Reset Profile ---
app.post('/api/users/:id/reset', async (req, res) => {
  const id = req.params.id;
  try {
    await query('DELETE FROM adhdsat.user_answers WHERE user_id = $1', [id]);
    await query('DELETE FROM adhdsat.sprints WHERE user_id = $1', [id]);
    await query('DELETE FROM adhdsat.review_cards WHERE user_id = $1', [id]);
    await query(`UPDATE adhdsat.users SET
      total_xp = 0, current_level = 1, current_streak = 0, longest_streak = 0,
      baseline_english = 0, baseline_math = 0, weak_areas = '[]',
      onboarding_completed = 0, study_plan = NULL, last_active_date = NULL, subscores = NULL
    WHERE id = $1`, [id]);
    const user = await row('SELECT * FROM adhdsat.users WHERE id = $1', [id]);
    user.weak_areas = JSON.parse(user.weak_areas || '[]');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CSV Export ---
app.get('/api/users/:id/export', async (req, res) => {
  const id = req.params.id;
  const rs = await rows(`
    SELECT
      ua.created_at AS date,
      q.section,
      q.domain,
      q.difficulty,
      ua.is_correct,
      ua.time_spent_seconds,
      ua.hints_used,
      s.sprint_type
    FROM adhdsat.user_answers ua
    JOIN adhdsat.questions q ON ua.question_id = q.id
    LEFT JOIN adhdsat.sprints s ON ua.sprint_id = s.id
    WHERE ua.user_id = $1
    ORDER BY ua.created_at ASC
  `, [id]);

  const header = 'date,section,domain,difficulty,correct,time_seconds,hints_used,sprint_type';
  const lines = rs.map(r =>
    [r.date, r.section, r.domain, r.difficulty, r.is_correct ? 'yes' : 'no', r.time_spent_seconds, r.hints_used, r.sprint_type || 'adaptive'].join(',')
  );
  const csv = [header, ...lines].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="adhdsat-history.csv"');
  res.send(csv);
});

// --- Activity days (for streak calendar) ---
app.get('/api/activity-days/:userId', async (req, res) => {
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const days = await rows(`
    SELECT DISTINCT substr(created_at, 1, 10) AS day
    FROM adhdsat.user_answers
    WHERE user_id = $1 AND created_at >= $2
    ORDER BY day
  `, [req.params.userId, cutoff]);
  res.json(days.map(r => r.day));
});

app.get('/api/today/:userId', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const sprints = (await row(`
    SELECT COUNT(*)::int AS cnt FROM adhdsat.sprints
    WHERE user_id = $1 AND completed_at >= $2 AND sprint_type <> 'review'
  `, [req.params.userId, today + 'T00:00:00.000Z'])).cnt;
  const answers = (await row(`
    SELECT COUNT(*)::int AS cnt FROM adhdsat.user_answers
    WHERE user_id = $1 AND substr(created_at, 1, 10) = $2
  `, [req.params.userId, today])).cnt;
  res.json({ sprints_today: sprints, answers_today: answers });
});

// JSON error handler: keep API responses as JSON even on unexpected failures.
app.use((err, req, res, next) => {
  console.error('[API Error]', err?.stack || err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Serve frontend build in production
const distPath = join(__dirname, '..', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(join(distPath, 'index.html'));
  });
}

// Local dev: start the HTTP server. On Vercel, the app is exported and wrapped serverlessly.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`[ADHDSat] Server running on port ${PORT}`);
  });
}

export default app;
