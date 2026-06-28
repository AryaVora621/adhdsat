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

const MATH_DOMAINS = ['Algebra', 'Advanced Math', 'Problem Solving & Data Analysis', 'Geometry & Trig'];
const ENG_DOMAINS = ['Information & Ideas', 'Craft & Structure', 'Expression of Ideas', 'Standard English Conventions'];
const DOMAINS = [...MATH_DOMAINS, ...ENG_DOMAINS];

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
  const { userId, section } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  // Determine which domains are in scope for this sprint
  const allowedDomains = section === 'math' ? MATH_DOMAINS : section === 'english' ? ENG_DOMAINS : DOMAINS;

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

  // Validate that Gemini's pick is within the allowed section; if not, fall through to rule-based
  if (!criteria || !allowedDomains.includes(criteria.domain)) {
    let targetDomain = weakAreas[0] || allowedDomains[0];
    let lowestAcc = Infinity;
    for (const [d, acc] of Object.entries(domainAccuracy)) {
      if (!allowedDomains.includes(d)) continue;
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
  // Fallback: any question from the allowed section not recently seen
  if (!question) {
    const domainClause = allowedDomains.map(() => '?').join(',');
    question = db.prepare(
      `SELECT * FROM questions WHERE domain IN (${domainClause}) AND id NOT IN (${placeholders}) ORDER BY RANDOM() LIMIT 1`
    ).get(...allowedDomains, ...seen);
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
  if (totalAnswered >= 10) {
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

// --- Sprint domain breakdown ---
app.get('/api/sprints/:id/breakdown', (req, res) => {
  const rows = db.prepare(`
    SELECT q.domain, ua.is_correct, ua.time_spent_seconds
    FROM user_answers ua
    JOIN questions q ON ua.question_id = q.id
    WHERE ua.sprint_id = ?
  `).all(req.params.id);

  const byDomain = {};
  let totalTime = 0;
  for (const r of rows) {
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

// --- Review Errors (SM-2 Spaced Repetition) ---

// Ensure a review card exists for every wrong answer the user has made
function syncReviewCards(userId) {
  const wrongIds = db.prepare(`
    SELECT DISTINCT ua.question_id
    FROM user_answers ua
    WHERE ua.user_id = ? AND ua.is_correct = 0
  `).all(userId).map(r => r.question_id);

  const now = new Date().toISOString();
  const insertCard = db.prepare(`
    INSERT OR IGNORE INTO review_cards (id, user_id, question_id, next_review_at, interval_days, ease_factor, rep_count)
    VALUES (?, ?, ?, ?, 1, 2.5, 0)
  `);
  const txn = db.transaction(() => {
    for (const qid of wrongIds) {
      insertCard.run(crypto.randomUUID(), userId, qid, now);
    }
  });
  txn();
}

// SM-2 algorithm: given quality (0=wrong, 1=correct), update the card
function sm2Update(card, quality) {
  // quality: 0 = wrong (reset), 1 = correct (advance)
  const q = quality === 1 ? 4 : 1; // map to 0-5 scale
  let { ease_factor, interval_days, rep_count } = card;

  if (q < 3) {
    // Reset: start over from interval 1
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

app.get('/api/review/next', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  syncReviewCards(userId);

  const now = new Date().toISOString();

  // First: find a due card (next_review_at <= now)
  let card = db.prepare(`
    SELECT rc.*, q.id as q_id FROM review_cards rc
    JOIN questions q ON rc.question_id = q.id
    WHERE rc.user_id = ? AND rc.next_review_at <= ?
    ORDER BY rc.next_review_at ASC
    LIMIT 1
  `).get(userId, now);

  // Fallback: if no card is due yet, return the one due soonest
  if (!card) {
    card = db.prepare(`
      SELECT rc.*, q.id as q_id FROM review_cards rc
      JOIN questions q ON rc.question_id = q.id
      WHERE rc.user_id = ?
      ORDER BY rc.next_review_at ASC
      LIMIT 1
    `).get(userId);
  }

  if (!card) return res.json(null);

  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(card.question_id);
  if (!q) return res.json(null);
  q.choices = JSON.parse(q.choices || '[]');
  q.tags = JSON.parse(q.tags || '[]');

  // Include SM-2 metadata so frontend can show "Next review in N days"
  q._sm2 = {
    card_id: card.id,
    interval_days: card.interval_days,
    rep_count: card.rep_count,
    next_review_at: card.next_review_at,
  };
  res.json(q);
});

app.post('/api/review/answer', (req, res) => {
  const { userId, questionId, isCorrect } = req.body;
  if (!userId || !questionId) return res.status(400).json({ error: 'userId and questionId required' });

  syncReviewCards(userId);

  const card = db.prepare('SELECT * FROM review_cards WHERE user_id = ? AND question_id = ?').get(userId, questionId);
  if (!card) return res.status(404).json({ error: 'Card not found' });

  const quality = isCorrect ? 1 : 0;
  const updated = sm2Update(card, quality);

  db.prepare(`
    UPDATE review_cards
    SET ease_factor = ?, interval_days = ?, rep_count = ?, next_review_at = ?, last_reviewed_at = ?
    WHERE id = ?
  `).run(updated.ease_factor, updated.interval_days, updated.rep_count, updated.next_review_at, new Date().toISOString(), card.id);

  // If answered correctly twice in a row (rep_count >= 2 and correct), remove from active review
  const updatedCard = db.prepare('SELECT * FROM review_cards WHERE id = ?').get(card.id);
  res.json({ success: true, next_review_at: updatedCard.next_review_at, interval_days: updatedCard.interval_days });
});

app.get('/api/review/count', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  syncReviewCards(userId);

  const now = new Date().toISOString();
  const due = db.prepare(`
    SELECT COUNT(*) as cnt FROM review_cards
    WHERE user_id = ? AND next_review_at <= ?
  `).get(userId, now).cnt;

  // Also count upcoming (not yet due)
  const total = db.prepare(`
    SELECT COUNT(*) as cnt FROM review_cards WHERE user_id = ?
  `).get(userId).cnt;

  res.json({ count: due, total });
});

// --- Study Plan ---

app.get('/api/study-plan/:userId', (req, res) => {
  const user = db.prepare('SELECT study_plan FROM users WHERE id = ?').get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user.study_plan ? JSON.parse(user.study_plan) : null);
});

app.put('/api/study-plan/:userId', (req, res) => {
  const { target_score, test_date } = req.body;
  if (!target_score || !test_date) return res.status(400).json({ error: 'target_score and test_date required' });
  const plan = JSON.stringify({ target_score, test_date });
  db.prepare('UPDATE users SET study_plan = ? WHERE id = ?').run(plan, req.params.userId);
  res.json({ target_score, test_date });
});

// --- AI Insights ---

app.get('/api/insights/:userId', async (req, res) => {
  const userId = req.params.userId;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const totalAnswered = db.prepare('SELECT COUNT(*) as cnt FROM user_answers WHERE user_id = ?').get(userId).cnt;

  // Per-domain accuracy from last 30 answers
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
    domainAccuracy[d] = s.total > 0 ? Math.round(s.correct / s.total * 100) : null;
  }

  const weakAreas = JSON.parse(user.weak_areas || '[]');
  const subscores = user.subscores ? JSON.parse(user.subscores) : null;
  const studyPlan = user.study_plan ? JSON.parse(user.study_plan) : null;
  const dueReviews = db.prepare(`SELECT COUNT(*) as cnt FROM review_cards WHERE user_id = ? AND next_review_at <= ?`).get(userId, new Date().toISOString()).cnt;

  // Rule-based insights that always work (no Gemini needed)
  const insights = [];

  if (dueReviews > 0) {
    insights.push({ type: 'review', priority: 1, text: `${dueReviews} card${dueReviews > 1 ? 's' : ''} due for review — complete these first to lock in the concepts.` });
  }

  // Find weakest domain with data
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
    insights.push({ type: 'start', priority: 3, text: `You've answered ${totalAnswered} questions. Do ${10 - totalAnswered} more to unlock your predicted score.` });
  }

  if (weakAreas.length > 0 && Object.keys(domainAccuracy).length === 0) {
    insights.push({ type: 'focus', priority: 2, text: `You flagged ${weakAreas.slice(0, 2).join(' and ')} as weak areas. Start with an Adaptive sprint to build your baseline there.` });
  }

  // Domain neglect alert: domains with no data while total answered >= 20
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

  // Try AI insight if Gemini is available and we have enough data
  let aiInsight = null;
  const geminiClient = process.env.GEMINI_API_KEY;
  if (geminiClient && totalAnswered >= 5) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
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
  const { image, mimeType, userId } = req.body;
  if (!image) return res.status(400).json({ error: 'image (base64) required' });
  const result = await analyzeScoreReport(image, mimeType);
  if (!result) return res.status(422).json({ error: 'Could not parse score report' });

  // Persist subscores to user profile so adaptive AI can use them
  if (userId && result.subscores && Object.keys(result.subscores).length > 0) {
    try {
      db.prepare('UPDATE users SET subscores = ? WHERE id = ?').run(JSON.stringify(result.subscores), userId);
    } catch {}
  }

  res.json(result);
});

// --- Reset Profile ---
app.post('/api/users/:id/reset', (req, res) => {
  const id = req.params.id;
  try {
    db.prepare('DELETE FROM user_answers WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM sprints WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM review_cards WHERE user_id = ?').run(id);
    db.prepare(`UPDATE users SET
      total_xp = 0, current_level = 1, current_streak = 0, longest_streak = 0,
      baseline_english = 0, baseline_math = 0, weak_areas = '[]',
      onboarding_completed = 0, study_plan = NULL, last_active_date = NULL, subscores = NULL
    WHERE id = ?`).run(id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    user.weak_areas = JSON.parse(user.weak_areas || '[]');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CSV Export ---
app.get('/api/users/:id/export', (req, res) => {
  const id = req.params.id;
  const rows = db.prepare(`
    SELECT
      ua.created_at as date,
      q.section,
      q.domain,
      q.difficulty,
      ua.is_correct,
      ua.time_spent_seconds,
      ua.hints_used,
      s.sprint_type
    FROM user_answers ua
    JOIN questions q ON ua.question_id = q.id
    LEFT JOIN sprints s ON ua.sprint_id = s.id
    WHERE ua.user_id = ?
    ORDER BY ua.created_at ASC
  `).all(id);

  const header = 'date,section,domain,difficulty,correct,time_seconds,hints_used,sprint_type';
  const lines = rows.map(r =>
    [r.date, r.section, r.domain, r.difficulty, r.is_correct ? 'yes' : 'no', r.time_spent_seconds, r.hints_used, r.sprint_type || 'adaptive'].join(',')
  );
  const csv = [header, ...lines].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="adhdsat-history.csv"');
  res.send(csv);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[ADHDSat] Server running on port ${PORT}`);
});
