import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import db from './db.js';
import { getAdaptiveCriteria, streamExplanation, analyzeScoreReport } from './gemini.js';

if (!process.env.GEMINI_API_KEY) {
  console.warn('[ADHDSat] GEMINI_API_KEY not set -- adaptive difficulty and explanations will use fallback mode.');
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DOMAINS = [
  'Algebra', 'Advanced Math', 'Problem Solving & Data Analysis', 'Geometry & Trig',
  'Information & Ideas', 'Craft & Structure', 'Expression of Ideas', 'Standard English Conventions'
];

// --- Users ---

app.get('/api/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.weak_areas = JSON.parse(user.weak_areas || '[]');
  res.json(user);
});

app.post('/api/users', (req, res) => {
  const { id, display_name } = req.body;
  try {
    db.prepare('INSERT OR IGNORE INTO users (id, display_name, created_at) VALUES (?, ?, ?)').run(id, display_name || 'Learner', new Date().toISOString());
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    user.weak_areas = JSON.parse(user.weak_areas || '[]');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', (req, res) => {
  const { display_name, weak_areas, baseline_english, baseline_math } = req.body;
  try {
    const fields = [];
    const vals = [];
    if (display_name !== undefined) { fields.push('display_name = ?'); vals.push(display_name); }
    if (weak_areas !== undefined) { fields.push('weak_areas = ?'); vals.push(JSON.stringify(weak_areas)); }
    if (baseline_english !== undefined) { fields.push('baseline_english = ?'); vals.push(baseline_english); }
    if (baseline_math !== undefined) { fields.push('baseline_math = ?'); vals.push(baseline_math); }
    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
    vals.push(req.params.id);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    user.weak_areas = JSON.parse(user.weak_areas || '[]');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:id/xp', (req, res) => {
  const { xp_gained } = req.body;
  try {
    db.prepare('UPDATE users SET total_xp = total_xp + ? WHERE id = ?').run(xp_gained, req.params.id);
    const today = new Date().toISOString().split('T')[0];
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    let newStreak = user.current_streak;
    let longestStreak = user.longest_streak;
    if (user.last_active_date !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      newStreak = user.last_active_date === yesterday ? newStreak + 1 : 1;
      longestStreak = Math.max(longestStreak, newStreak);
      db.prepare('UPDATE users SET current_streak = ?, longest_streak = ?, last_active_date = ? WHERE id = ?')
        .run(newStreak, longestStreak, today, req.params.id);
    }
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    updated.weak_areas = JSON.parse(updated.weak_areas || '[]');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Onboarding ---

app.post('/api/onboarding', (req, res) => {
  const { userId, baseline_english, baseline_math, weak_areas } = req.body;
  try {
    db.prepare(`UPDATE users SET baseline_english = ?, baseline_math = ?, weak_areas = ?, onboarding_completed = 1 WHERE id = ?`)
      .run(baseline_english || 0, baseline_math || 0, JSON.stringify(weak_areas || []), userId);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    user.weak_areas = JSON.parse(user.weak_areas || '[]');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Questions ---

app.get('/api/questions', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const questions = db.prepare('SELECT * FROM questions ORDER BY RANDOM() LIMIT ?').all(limit);
  res.json(questions.map(q => ({ ...q, choices: JSON.parse(q.choices || '[]'), tags: JSON.parse(q.tags || '[]') })));
});

app.get('/api/questions/next', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const seen = db.prepare('SELECT question_id FROM user_answers WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(userId).map(r => r.question_id);

  const recent = db.prepare(`
    SELECT q.domain, ua.is_correct FROM user_answers ua
    JOIN questions q ON ua.question_id = q.id
    WHERE ua.user_id = ? ORDER BY ua.created_at DESC LIMIT 30
  `).all(userId);

  const domainStats = {};
  for (const row of recent) {
    if (!domainStats[row.domain]) domainStats[row.domain] = { correct: 0, total: 0 };
    domainStats[row.domain].total++;
    if (row.is_correct) domainStats[row.domain].correct++;
  }
  const domainAccuracy = {};
  for (const [d, s] of Object.entries(domainStats)) {
    domainAccuracy[d] = s.total > 0 ? s.correct / s.total : null;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const weakAreas = JSON.parse(user?.weak_areas || '[]');

  let criteria = null;
  try {
    criteria = await getAdaptiveCriteria({ domainAccuracy, weakAreas });
  } catch {}

  if (!criteria) {
    let targetDomain = weakAreas[0] || DOMAINS[0];
    let lowestAcc = Infinity;
    for (const [d, acc] of Object.entries(domainAccuracy)) {
      if (acc !== null && acc < lowestAcc) { lowestAcc = acc; targetDomain = d; }
    }
    criteria = { domain: targetDomain, difficulty: 'medium' };
  }

  const placeholders = seen.length > 0 ? seen.map(() => '?').join(',') : "'__none__'";
  let question = db.prepare(
    `SELECT * FROM questions WHERE domain = ? AND difficulty = ? AND id NOT IN (${placeholders}) ORDER BY RANDOM() LIMIT 1`
  ).get(criteria.domain, criteria.difficulty, ...seen);

  if (!question) {
    question = db.prepare(
      `SELECT * FROM questions WHERE domain = ? AND id NOT IN (${placeholders}) ORDER BY RANDOM() LIMIT 1`
    ).get(criteria.domain, ...seen);
  }
  if (!question) {
    question = db.prepare(
      `SELECT * FROM questions WHERE id NOT IN (${placeholders}) ORDER BY RANDOM() LIMIT 1`
    ).get(...seen);
  }
  if (!question) {
    question = db.prepare('SELECT * FROM questions ORDER BY RANDOM() LIMIT 1').get();
  }
  if (!question) return res.status(404).json({ error: 'No questions available. Run: node server/ingest.js' });

  res.json({ ...question, choices: JSON.parse(question.choices || '[]'), tags: JSON.parse(question.tags || '[]') });
});

// --- Sprints ---

app.post('/api/sprints', (req, res) => {
  const { userId, sprint_type } = req.body;
  try {
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO sprints (id, user_id, sprint_type, started_at) VALUES (?, ?, ?, ?)').run(id, userId, sprint_type || 'adaptive', new Date().toISOString());
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sprints/:id/finish', (req, res) => {
  const { questions_attempted, questions_correct, xp_earned } = req.body;
  try {
    db.prepare('UPDATE sprints SET questions_attempted = ?, questions_correct = ?, xp_earned = ?, completed_at = ? WHERE id = ?')
      .run(questions_attempted || 0, questions_correct || 0, xp_earned || 0, new Date().toISOString(), req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Answers ---

app.post('/api/answers', (req, res) => {
  const { id, user_id, question_id, selected_choice, is_correct, hints_used, time_spent_seconds, sprint_id } = req.body;
  try {
    db.prepare(`INSERT INTO user_answers (id, user_id, question_id, selected_choice, is_correct, hints_used, time_spent_seconds, sprint_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id || crypto.randomUUID(), user_id, question_id, selected_choice, is_correct, hints_used || 0, time_spent_seconds || 0, sprint_id, new Date().toISOString());
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Progress ---

app.get('/api/progress', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const totalAnswered = db.prepare('SELECT COUNT(*) as cnt FROM user_answers WHERE user_id = ?').get(userId).cnt;

  const domainStats = {};
  for (const domain of DOMAINS) {
    const last20 = db.prepare(`
      SELECT ua.is_correct FROM user_answers ua
      JOIN questions q ON ua.question_id = q.id
      WHERE ua.user_id = ? AND q.domain = ?
      ORDER BY ua.created_at DESC LIMIT 20
    `).all(userId, domain);
    const prior20 = db.prepare(`
      SELECT ua.is_correct FROM user_answers ua
      JOIN questions q ON ua.question_id = q.id
      WHERE ua.user_id = ? AND q.domain = ?
      ORDER BY ua.created_at DESC LIMIT 40
    `).all(userId, domain).slice(20);

    const acc = (rows) => rows.length === 0 ? null : rows.filter(r => r.is_correct).length / rows.length;
    domainStats[domain] = {
      accuracy: acc(last20),
      priorAccuracy: acc(prior20),
      count: last20.length
    };
  }

  let predictedScore = null;
  if (totalAnswered >= 20) {
    const mathDomains = ['Algebra', 'Advanced Math', 'Problem Solving & Data Analysis', 'Geometry & Trig'];
    const engDomains = ['Information & Ideas', 'Craft & Structure', 'Expression of Ideas', 'Standard English Conventions'];
    const avgAcc = (domains) => {
      const accs = domains.map(d => domainStats[d].accuracy).filter(a => a !== null);
      return accs.length ? accs.reduce((a, b) => a + b, 0) / accs.length : 0.5;
    };
    const mathScore = Math.round(200 + avgAcc(mathDomains) * 600);
    const engScore = Math.round(200 + avgAcc(engDomains) * 600);
    predictedScore = {
      math: mathScore,
      english: engScore,
      total: mathScore + engScore,
      range: `${mathScore + engScore - 30}-${mathScore + engScore + 30}`
    };
  }

  const recentSprints = db.prepare(`
    SELECT * FROM sprints WHERE user_id = ? AND completed_at IS NOT NULL
    ORDER BY completed_at DESC LIMIT 10
  `).all(userId);

  res.json({
    domainStats,
    predictedScore,
    recentSprints,
    totalAnswered,
    baseline: { english: user.baseline_english, math: user.baseline_math }
  });
});

// --- Review Errors ---

app.get('/api/review/next', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  // Find questions answered wrong, excluding those answered correctly most recently
  const wrongIds = db.prepare(`
    SELECT DISTINCT ua.question_id
    FROM user_answers ua
    WHERE ua.user_id = ? AND ua.is_correct = 0
  `).all(userId).map(r => r.question_id);

  if (wrongIds.length === 0) return res.json(null);

  // Exclude questions where the user's MOST RECENT answer was correct
  const toExclude = wrongIds.filter(qid => {
    const latest = db.prepare(`
      SELECT is_correct FROM user_answers
      WHERE user_id = ? AND question_id = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(userId, qid);
    return latest && latest.is_correct === 1;
  });

  const eligible = wrongIds.filter(id => !toExclude.includes(id));
  if (eligible.length === 0) return res.json(null);

  // Pick the one with most wrong attempts that was most recently attempted
  const ranked = db.prepare(`
    SELECT ua.question_id,
           COUNT(*) as wrong_count,
           MAX(ua.created_at) as last_attempt
    FROM user_answers ua
    WHERE ua.user_id = ? AND ua.is_correct = 0
      AND ua.question_id IN (${eligible.map(() => '?').join(',')})
    GROUP BY ua.question_id
    ORDER BY wrong_count DESC, last_attempt DESC
    LIMIT 1
  `).get(userId, ...eligible);

  if (!ranked) return res.json(null);

  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(ranked.question_id);
  if (!q) return res.json(null);
  q.choices = JSON.parse(q.choices || '[]');
  q.tags = JSON.parse(q.tags || '[]');
  res.json(q);
});

app.get('/api/review/count', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const wrong = db.prepare(`
    SELECT DISTINCT ua.question_id
    FROM user_answers ua
    WHERE ua.user_id = ? AND ua.is_correct = 0
  `).all(userId).map(r => r.question_id);

  let reviewable = 0;
  for (const qid of wrong) {
    const latest = db.prepare(`
      SELECT is_correct FROM user_answers WHERE user_id = ? AND question_id = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(userId, qid);
    if (!latest || latest.is_correct === 0) reviewable++;
  }
  res.json({ count: reviewable });
});

// --- Gemini Endpoints ---

app.post('/api/explain', async (req, res) => {
  const { questionText, selectedChoice, correctAnswer } = req.body;
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
  const { image, mimeType } = req.body;
  if (!image) return res.status(400).json({ error: 'image (base64) required' });
  const result = await analyzeScoreReport(image, mimeType);
  if (!result) return res.status(422).json({ error: 'Could not parse score report' });
  res.json(result);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[ADHDSat] Server running on port ${PORT}`);
});
