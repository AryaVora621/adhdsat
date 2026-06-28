# ADHDSat Full Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing skeleton into a fully functional ADHD-focused SAT prep platform with real question bank, adaptive difficulty, Gemini AI, onboarding, and live progress tracking.

**Architecture:** React 19 + Vite frontend routes through /onboarding, /, /sprint, /profile; Express 5 backend on port 3001 proxied by Vite; SQLite via better-sqlite3 for single-user local persistence. Gemini 2.0 Flash handles adaptive question selection, step-by-step explanations (streamed), and score report image parsing.

**Tech Stack:** React 19, Vite 8, Express 5, better-sqlite3, @google/generative-ai, react-router-dom v7, lucide-react, concurrently + nodemon

## Global Constraints

- Stack: React 19 + Vite, Express 5, SQLite/better-sqlite3, Lucide React, dark cyber aesthetic
- Primary color `#00d4ff`, background `#0f0f1a`
- GEMINI_API_KEY in `.env`; all Gemini calls must have rule-based fallback so Sprint never breaks
- No em dashes in UI copy
- No TypeScript; plain JS ES modules (type: "module" in package.json)
- Vite proxies `/api` to `http://localhost:3001`
- Rewrite broken files; do not patch

---

## File Map

**Create:**
- `server/gemini.js` — Gemini client: adaptive, explain (streaming), analyzeReport
- `server/ingest.js` — one-time question bank loader
- `server/data/questions.json` — 80+ SAT questions across all 8 domains
- `src/pages/Onboarding.jsx` — 3-step wizard
- `src/pages/Profile.jsx` — editable profile + stats

**Rewrite:**
- `server/db.js` — add idempotent migrations for new columns
- `server/index.js` — add 8 new endpoints
- `src/App.jsx` — UUID identity, onboarding redirect, all 4 routes
- `src/pages/Sprint.jsx` — adaptive single-fetch, real timer, deep dive
- `src/pages/Dashboard.jsx` — domain grid, predicted score, sprint history
- `src/components/Sidebar.jsx` — nav links, real XP bar, streak

---

### Task 1: Install @google/generative-ai and extend schema

**Files:**
- Modify: `server/db.js`

**Interfaces:**
- Produces: `db` export with `users` table having `baseline_english`, `baseline_math`, `weak_areas`, `onboarding_completed`; `questions` table having `source`

- [ ] **Step 1: Install Gemini SDK**

```bash
cd "/Users/aryavora/Desktop/Personal Projects/adhdsat"
npm install @google/generative-ai
```

Expected: `added N packages` with no errors.

- [ ] **Step 2: Rewrite server/db.js with idempotent migrations**

```js
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'adhdsat.db');
const db = new Database(dbPath);

const initDb = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT,
      total_xp INTEGER DEFAULT 0,
      current_level INTEGER DEFAULT 1,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_active_date TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      section TEXT,
      domain TEXT,
      skill TEXT,
      difficulty TEXT,
      question_text TEXT,
      passage_text TEXT,
      choices TEXT,
      is_grid_in INTEGER DEFAULT 0,
      grid_in_answer REAL,
      explanation TEXT,
      hint_1 TEXT,
      hint_2 TEXT,
      tags TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS user_answers (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      question_id TEXT,
      selected_choice TEXT,
      is_correct INTEGER,
      hints_used INTEGER,
      error_type TEXT,
      time_spent_seconds INTEGER,
      sprint_id TEXT,
      created_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(question_id) REFERENCES questions(id)
    );

    CREATE TABLE IF NOT EXISTS sprints (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      sprint_type TEXT,
      duration_minutes INTEGER,
      questions_attempted INTEGER DEFAULT 0,
      questions_correct INTEGER DEFAULT 0,
      xp_earned INTEGER DEFAULT 0,
      started_at TEXT,
      completed_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  // Idempotent migrations: add missing columns if they don't exist
  const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols.includes('baseline_english')) db.exec("ALTER TABLE users ADD COLUMN baseline_english INTEGER DEFAULT 0");
  if (!userCols.includes('baseline_math')) db.exec("ALTER TABLE users ADD COLUMN baseline_math INTEGER DEFAULT 0");
  if (!userCols.includes('weak_areas')) db.exec("ALTER TABLE users ADD COLUMN weak_areas TEXT DEFAULT '[]'");
  if (!userCols.includes('onboarding_completed')) db.exec("ALTER TABLE users ADD COLUMN onboarding_completed INTEGER DEFAULT 0");

  const qCols = db.prepare("PRAGMA table_info(questions)").all().map(c => c.name);
  if (!qCols.includes('source')) db.exec("ALTER TABLE questions ADD COLUMN source TEXT DEFAULT 'ingest'");
};

initDb();

export default db;
```

- [ ] **Step 3: Verify migrations run without error**

```bash
node -e "import('./server/db.js').then(() => console.log('DB OK'))"
```

Expected: `DB OK` (no SQLite errors).

- [ ] **Step 4: Commit**

```bash
git add server/db.js package.json package-lock.json
git commit -m "feat: add schema migrations and install gemini SDK"
```

---

### Task 2: Gemini client module

**Files:**
- Create: `server/gemini.js`

**Interfaces:**
- Consumes: `process.env.GEMINI_API_KEY`
- Produces:
  - `getAdaptiveCriteria(userProfile: {domainAccuracy: Record<string,number>, weakAreas: string[]}) → Promise<{domain: string, difficulty: 'easy'|'medium'|'hard'}>`
  - `streamExplanation(ctx: {questionText, selectedChoice, correctAnswer}) → AsyncIterable<string>` (text chunks)
  - `analyzeScoreReport(base64Image: string, mimeType: string) → Promise<{english_score: number, math_score: number, weak_areas: string[]}>`

- [ ] **Step 1: Create server/gemini.js**

```js
import { GoogleGenerativeAI } from '@google/generative-ai';

const DOMAINS = [
  'Algebra', 'Advanced Math', 'Problem Solving & Data Analysis', 'Geometry & Trig',
  'Information & Ideas', 'Craft & Structure', 'Expression of Ideas', 'Standard English Conventions'
];

let genAI = null;
const getClient = () => {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

export async function getAdaptiveCriteria(userProfile) {
  const client = getClient();
  if (!client) return null;
  try {
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `You are an SAT prep coach. A student is targeting a 1500-1550 SAT score.

Domain accuracy from last 30 questions (0-1 scale, null means no data yet):
${JSON.stringify(userProfile.domainAccuracy, null, 2)}

Weak areas flagged at onboarding: ${JSON.stringify(userProfile.weakAreas)}

Return ONLY valid JSON with no markdown: {"domain": "<one of the 8 SAT domains>", "difficulty": "<easy|medium|hard>"}
Pick the domain with the most room for improvement. Alternate between weak domains rather than drilling one repeatedly.
Valid domains: ${DOMAINS.join(', ')}`;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
    ]);
    const text = result.response.text().trim().replace(/```json|```/g, '');
    const parsed = JSON.parse(text);
    if (DOMAINS.includes(parsed.domain) && ['easy','medium','hard'].includes(parsed.difficulty)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function* streamExplanation(ctx) {
  const client = getClient();
  if (!client) {
    yield "Explanation streaming requires a Gemini API key. Please check your .env file.";
    return;
  }
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const prompt = `You are an SAT tutor helping a student who answered incorrectly.

Question: ${ctx.questionText}
Student chose: ${ctx.selectedChoice}
Correct answer: ${ctx.correctAnswer}

Give a clear, step-by-step explanation of why the correct answer is right and why the student's choice was wrong. Be concise but thorough. Use numbered steps. Focus on the concept, not just the answer.`;

  const result = await model.generateContentStream(prompt);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

export async function analyzeScoreReport(base64Image, mimeType) {
  const client = getClient();
  if (!client) return null;
  try {
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent([
      {
        inlineData: { data: base64Image, mimeType: mimeType || 'image/jpeg' }
      },
      `This is an SAT score report image. Extract the scores and return ONLY valid JSON with no markdown:
{"english_score": <number 200-800>, "math_score": <number 200-800>, "weak_areas": [<array of domain names from: Algebra, Advanced Math, Problem Solving & Data Analysis, Geometry & Trig, Information & Ideas, Craft & Structure, Expression of Ideas, Standard English Conventions>]}
If you cannot confidently read a value, use 0 for scores and [] for weak_areas.`
    ]);
    const text = result.response.text().trim().replace(/```json|```/g, '');
    return JSON.parse(text);
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/gemini.js
git commit -m "feat: add Gemini client module with adaptive, explain, analyzeReport"
```

---

### Task 3: Rewrite server/index.js with all endpoints

**Files:**
- Rewrite: `server/index.js`

**Interfaces:**
- Consumes: `server/db.js` (db), `server/gemini.js` (getAdaptiveCriteria, streamExplanation, analyzeScoreReport)
- Produces endpoints:
  - GET /api/users/:id
  - POST /api/users
  - PUT /api/users/:id
  - POST /api/users/:id/xp
  - POST /api/onboarding
  - GET /api/questions (bulk, legacy)
  - GET /api/questions/next?userId=
  - POST /api/sprints
  - POST /api/sprints/:id/finish
  - POST /api/answers
  - GET /api/progress?userId=
  - POST /api/explain
  - POST /api/analyze-report

- [ ] **Step 1: Write the full server/index.js**

```js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import db from './db.js';
import { getAdaptiveCriteria, streamExplanation, analyzeScoreReport } from './gemini.js';

if (!process.env.GEMINI_API_KEY) {
  console.warn('[ADHDSat] GEMINI_API_KEY not set — adaptive difficulty and explanations will use fallback mode.');
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
    // Update streak
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

  // Get last 50 seen question IDs to exclude
  const seen = db.prepare('SELECT question_id FROM user_answers WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(userId).map(r => r.question_id);

  // Compute per-domain accuracy from last 30 answers
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

  // Try Gemini adaptive criteria
  let criteria = null;
  try {
    criteria = await getAdaptiveCriteria({ domainAccuracy, weakAreas });
  } catch {}

  // Fallback: pick lowest-accuracy domain (or first weak area)
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

  // Fallback: relax constraints
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
  if (!question) return res.status(404).json({ error: 'No questions available' });

  res.json({ ...question, choices: JSON.parse(question.choices || '[]'), tags: JSON.parse(question.tags || '[]') });
});

// --- Sprints ---

app.post('/api/sprints', (req, res) => {
  const { userId, sprint_type } = req.body;
  try {
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO sprints (id, user_id, sprint_type, started_at) VALUES (?, ?, ?, ?)').run(id, userId, sprint_type || 'standard', new Date().toISOString());
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

  // Per-domain stats: last 20 vs prior 20
  const domainStats = {};
  for (const domain of DOMAINS) {
    const last20 = db.prepare(`
      SELECT is_correct FROM user_answers ua
      JOIN questions q ON ua.question_id = q.id
      WHERE ua.user_id = ? AND q.domain = ?
      ORDER BY ua.created_at DESC LIMIT 20
    `).all(userId, domain);
    const prior20 = db.prepare(`
      SELECT is_correct FROM user_answers ua
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

  // Predicted score (requires 20+ total answers)
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

  // Last 10 sprints
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
  } catch (err) {
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
```

- [ ] **Step 2: Verify server starts**

```bash
node server/index.js &
sleep 2
curl -s http://localhost:3001/api/questions | head -c 100
kill %1
```

Expected: `[]` (empty array since no questions yet) with no crash.

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat: add all backend endpoints with adaptive difficulty and Gemini integration"
```

---

### Task 4: Question bank + ingest.js

**Files:**
- Create: `server/data/questions.json` (80+ SAT questions across all 8 domains)
- Create: `server/ingest.js`

**Interfaces:**
- Produces: `questions` table populated with 80+ rows; `node server/ingest.js` logs `Inserted N, Skipped M`

- [ ] **Step 1: Create server/data/ directory**

```bash
mkdir -p "/Users/aryavora/Desktop/Personal Projects/adhdsat/server/data"
```

- [ ] **Step 2: Create server/data/questions.json**

Write 80 questions (10 per domain) as a JSON array. Each question object:
```json
{
  "id": "alg_001",
  "section": "Math",
  "domain": "Algebra",
  "skill": "Linear equations",
  "difficulty": "medium",
  "question_text": "If 3x + 7 = 22, what is the value of x?",
  "passage_text": null,
  "choices": [
    {"label": "A", "text": "3", "is_correct": false},
    {"label": "B", "text": "5", "is_correct": true},
    {"label": "C", "text": "7", "is_correct": false},
    {"label": "D", "text": "15", "is_correct": false}
  ],
  "is_grid_in": 0,
  "grid_in_answer": null,
  "explanation": "Subtract 7 from both sides: 3x = 15. Divide by 3: x = 5.",
  "hint_1": "Try isolating x by moving constants to the right side.",
  "hint_2": "Subtract 7 from both sides first, then divide.",
  "tags": ["linear", "solve"],
  "source": "ingest"
}
```

Full questions.json is written in Step 2 of this task (see actual file write below).

- [ ] **Step 3: Create server/ingest.js**

```js
import 'dotenv/config';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const raw = require('./data/questions.json');

const insert = db.prepare(`
  INSERT OR IGNORE INTO questions
  (id, section, domain, skill, difficulty, question_text, passage_text, choices, is_grid_in, grid_in_answer, explanation, hint_1, hint_2, tags, source, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let inserted = 0;
let skipped = 0;

const ingestAll = db.transaction(() => {
  for (const q of raw) {
    const result = insert.run(
      q.id,
      q.section,
      q.domain,
      q.skill,
      q.difficulty,
      q.question_text,
      q.passage_text || null,
      JSON.stringify(q.choices || []),
      q.is_grid_in ? 1 : 0,
      q.grid_in_answer || null,
      q.explanation || null,
      q.hint_1 || null,
      q.hint_2 || null,
      JSON.stringify(q.tags || []),
      q.source || 'ingest',
      new Date().toISOString()
    );
    if (result.changes > 0) inserted++;
    else skipped++;
  }
});

ingestAll();
console.log(`[ingest] Done. Inserted: ${inserted}, Skipped (duplicates): ${skipped}`);
process.exit(0);
```

- [ ] **Step 4: Run ingest to verify**

```bash
node server/ingest.js
```

Expected: `[ingest] Done. Inserted: 80, Skipped (duplicates): 0`

- [ ] **Step 5: Commit**

```bash
git add server/data/questions.json server/ingest.js
git commit -m "feat: add question bank (80 SAT questions) and ingest script"
```

---

### Task 5: Rewrite App.jsx (user identity + routing)

**Files:**
- Rewrite: `src/App.jsx`

**Interfaces:**
- Produces: `user` state (includes all DB fields), routes for `/`, `/sprint`, `/onboarding`, `/profile`
- UUID stored in localStorage as `userId`; upserted via POST /api/users on mount
- Redirects to `/onboarding` if `onboarding_completed === 0`

- [ ] **Step 1: Rewrite src/App.jsx**

```jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Sprint from './pages/Sprint';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import './index.css';

function AppInner() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem('userId', userId);
    }

    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, display_name: 'Learner' })
    })
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setLoading(false);
        if (!data.onboarding_completed) {
          navigate('/onboarding');
        }
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', flexDirection: 'column', gap: '16px' }}>
        <div style={{ color: 'var(--primary)', fontSize: '1.5rem', fontWeight: 'bold' }}>ADHDSat</div>
        <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      </div>
    );
  }

  const showSidebar = user?.onboarding_completed;

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh' }}>
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding user={user} setUser={setUser} />} />
          <Route path="/" element={user?.onboarding_completed ? <Dashboard user={user} /> : <Navigate to="/onboarding" />} />
          <Route path="/sprint" element={user?.onboarding_completed ? <Sprint user={user} setUser={setUser} /> : <Navigate to="/onboarding" />} />
          <Route path="/profile" element={user?.onboarding_completed ? <Profile user={user} setUser={setUser} /> : <Navigate to="/onboarding" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
      {showSidebar && <Sidebar user={user} />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "feat: rewrite App.jsx with UUID identity, onboarding redirect, and all routes"
```

---

### Task 6: Onboarding wizard (Onboarding.jsx)

**Files:**
- Create: `src/pages/Onboarding.jsx`

**Interfaces:**
- Consumes: `user` (has `id`), `setUser`
- On complete: calls POST /api/onboarding, sets `user.onboarding_completed = 1`, navigates to `/sprint`

- [ ] **Step 1: Create src/pages/Onboarding.jsx**

```jsx
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ChevronRight, ChevronLeft, Zap } from 'lucide-react';

const MATH_DOMAINS = ['Algebra', 'Advanced Math', 'Problem Solving & Data Analysis', 'Geometry & Trig'];
const ENG_DOMAINS = ['Information & Ideas', 'Craft & Structure', 'Expression of Ideas', 'Standard English Conventions'];

export default function Onboarding({ user, setUser }) {
  const [step, setStep] = useState(1);
  const [englishScore, setEnglishScore] = useState(630);
  const [mathScore, setMathScore] = useState(730);
  const [weakAreas, setWeakAreas] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef();
  const navigate = useNavigate();

  const toggleDomain = (domain) => {
    setWeakAreas(prev => prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg('Analyzing score report...');
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1];
        const mimeType = file.type;
        try {
          const res = await fetch('/api/analyze-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64, mimeType })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.english_score) setEnglishScore(data.english_score);
            if (data.math_score) setMathScore(data.math_score);
            if (data.weak_areas?.length) setWeakAreas(data.weak_areas);
            setUploadMsg('Score report analyzed! Fields pre-filled.');
          } else {
            setUploadMsg('Could not parse report. Please fill manually.');
          }
        } catch {
          setUploadMsg('Analysis failed. Please fill manually.');
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
      setUploadMsg('Upload failed.');
    }
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, baseline_english: englishScore, baseline_math: mathScore, weak_areas: weakAreas })
      });
      const updated = await res.json();
      setUser(updated);
      navigate('/sprint');
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  const containerStyle = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', padding: '48px 24px', maxWidth: '600px', margin: '0 auto'
  };

  const cardStyle = {
    backgroundColor: 'var(--bg-card)', borderRadius: '20px', padding: '48px',
    border: '1px solid #2a2a46', width: '100%'
  };

  return (
    <div style={containerStyle}>
      {/* Step indicators */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '40px' }}>
        {[1,2,3].map(s => (
          <div key={s} style={{
            width: s === step ? '32px' : '8px', height: '8px', borderRadius: '4px',
            backgroundColor: s <= step ? 'var(--primary)' : '#2a2a46',
            transition: 'all 0.3s'
          }} />
        ))}
      </div>

      {step === 1 && (
        <div style={cardStyle}>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Welcome to ADHDSat</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Let's personalize your prep. First, your baseline scores.</p>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              English / Reading & Writing
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <input type="range" min={200} max={800} step={10} value={englishScore}
                onChange={e => setEnglishScore(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--primary)' }} />
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', minWidth: '48px', textAlign: 'right' }}>{englishScore}</span>
            </div>
          </div>

          <div style={{ marginBottom: '40px' }}>
            <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Math
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <input type="range" min={200} max={800} step={10} value={mathScore}
                onChange={e => setMathScore(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--primary)' }} />
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', minWidth: '48px', textAlign: 'right' }}>{mathScore}</span>
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg" style={{ display: 'none' }} onChange={handleImageUpload} />
            <button onClick={() => fileInputRef.current.click()} disabled={uploading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '12px', justifyContent: 'center', borderStyle: 'dashed' }}>
              <Upload size={16} /> {uploading ? 'Analyzing...' : 'Upload past score report (optional)'}
            </button>
            {uploadMsg && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '8px', textAlign: 'center' }}>{uploadMsg}</p>}
          </div>

          <button className="primary" onClick={() => setStep(2)} style={{ width: '100%', padding: '16px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            Next <ChevronRight size={20} />
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Where do you struggle?</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Select all domains you want to focus on. We'll prioritize these.</p>

          {[['Math', MATH_DOMAINS], ['Reading & Writing', ENG_DOMAINS]].map(([section, domains]) => (
            <div key={section} style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>{section}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {domains.map(domain => (
                  <button key={domain} onClick={() => toggleDomain(domain)}
                    style={{
                      textAlign: 'left', padding: '12px 16px', borderRadius: '10px',
                      border: weakAreas.includes(domain) ? '2px solid var(--primary)' : '2px solid #2a2a46',
                      backgroundColor: weakAreas.includes(domain) ? 'rgba(0,212,255,0.08)' : 'var(--bg-main)',
                      color: weakAreas.includes(domain) ? 'var(--primary)' : 'var(--text-primary)',
                      transition: 'all 0.2s'
                    }}>
                    {domain}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setStep(1)} style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ChevronLeft size={20} /> Back
            </button>
            <button className="primary" onClick={() => setStep(3)} style={{ flex: 1, padding: '16px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              Next <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎯</div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Your Starting Point</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Here's what we know about you. Let's close the gap to 1500+.</p>
          </div>

          <div style={{ backgroundColor: 'var(--bg-main)', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{englishScore}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>English</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{mathScore}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Math</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--xp-gold)' }}>{englishScore + mathScore}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total</div>
              </div>
            </div>
            {weakAreas.length > 0 && (
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Focus areas:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {weakAreas.map(a => (
                    <span key={a} style={{ backgroundColor: 'rgba(0,212,255,0.1)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem' }}>{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setStep(2)} style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ChevronLeft size={20} /> Back
            </button>
            <button className="primary animate-pop" onClick={handleComplete} disabled={submitting}
              style={{ flex: 1, padding: '16px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Zap size={20} fill="currentColor" /> {submitting ? 'Starting...' : 'Begin First Sprint'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Onboarding.jsx
git commit -m "feat: add 3-step onboarding wizard with score upload support"
```

---

### Task 7: Rewrite Sprint.jsx

**Files:**
- Rewrite: `src/pages/Sprint.jsx`

**Interfaces:**
- On mount: POST /api/sprints → store sprintId
- Per question: GET /api/questions/next?userId=
- On answer: POST /api/answers with real time_spent_seconds and real sprintId
- On wrong answer: show explanation + "Deep Dive" button streaming /api/explain
- On complete: POST /api/sprints/:id/finish, navigate to /

- [ ] **Step 1: Rewrite src/pages/Sprint.jsx**

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, ChevronRight, AlertCircle, Zap } from 'lucide-react';

export default function Sprint({ user, setUser }) {
  const [sprintId, setSprintId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [questionNum, setQuestionNum] = useState(1);
  const [stats, setStats] = useState({ attempted: 0, correct: 0, xp: 0 });

  const [selectedChoice, setSelectedChoice] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [deepDiveText, setDeepDiveText] = useState('');
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [showDeepDive, setShowDeepDive] = useState(false);

  const timerRef = useRef(null);
  const timeStartRef = useRef(Date.now());
  const navigate = useNavigate();

  const SPRINT_LENGTH = 10;

  useEffect(() => {
    const startSprint = async () => {
      try {
        const res = await fetch('/api/sprints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, sprint_type: 'adaptive' })
        });
        const data = await res.json();
        setSprintId(data.id);
        await fetchNextQuestion();
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    startSprint();
  }, []);

  const fetchNextQuestion = async () => {
    setLoading(true);
    setSelectedChoice(null);
    setIsAnswered(false);
    setHintsUsed(0);
    setDeepDiveText('');
    setShowDeepDive(false);
    timeStartRef.current = Date.now();
    try {
      const res = await fetch(`/api/questions/next?userId=${user.id}`);
      if (!res.ok) throw new Error('No questions');
      const q = await res.json();
      setQuestion(q);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!selectedChoice && question.is_grid_in === 0) return;

    let correct = false;
    if (question.is_grid_in) {
      correct = parseFloat(selectedChoice) === question.grid_in_answer;
    } else {
      const choice = question.choices.find(c => c.label === selectedChoice);
      if (choice?.is_correct) correct = true;
    }

    const timeSpent = Math.round((Date.now() - timeStartRef.current) / 1000);
    const xpGained = correct ? 20 : 5;

    setIsAnswered(true);
    setStats(prev => ({
      attempted: prev.attempted + 1,
      correct: prev.correct + (correct ? 1 : 0),
      xp: prev.xp + xpGained
    }));

    try {
      await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          question_id: question.id,
          selected_choice: selectedChoice,
          is_correct: correct ? 1 : 0,
          hints_used: hintsUsed,
          time_spent_seconds: timeSpent,
          sprint_id: sprintId
        })
      });

      const userRes = await fetch(`/api/users/${user.id}/xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xp_gained: xpGained })
      });
      setUser(await userRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeepDive = async () => {
    setDeepDiveLoading(true);
    setShowDeepDive(true);
    setDeepDiveText('');
    try {
      const correctAnswer = question.choices.find(c => c.is_correct)?.text || question.grid_in_answer?.toString() || 'Unknown';
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: question.question_text,
          selectedChoice: `${selectedChoice}: ${question.choices.find(c => c.label === selectedChoice)?.text || selectedChoice}`,
          correctAnswer
        })
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) setDeepDiveText(prev => prev + parsed.text);
          } catch {}
        }
      }
    } catch (err) {
      setDeepDiveText('Could not load deep dive explanation.');
    } finally {
      setDeepDiveLoading(false);
    }
  };

  const handleNext = async () => {
    if (questionNum >= SPRINT_LENGTH) {
      // Sprint complete
      try {
        await fetch(`/api/sprints/${sprintId}/finish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions_attempted: stats.attempted + 1, questions_correct: stats.correct, xp_earned: stats.xp })
        });
      } catch {}
      navigate('/');
    } else {
      setQuestionNum(n => n + 1);
      await fetchNextQuestion();
    }
  };

  if (loading) return <div style={{ padding: '48px', color: 'var(--text-secondary)' }}>Loading question {questionNum}...</div>;
  if (!question) return <div style={{ padding: '48px' }}>No questions available. Run node server/ingest.js first.</div>;

  const isCorrect = question.is_grid_in
    ? parseFloat(selectedChoice) === question.grid_in_answer
    : question.choices.find(c => c.label === selectedChoice)?.is_correct;

  return (
    <div style={{ padding: '48px', maxWidth: '800px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
        <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
          {Array.from({ length: SPRINT_LENGTH }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: '6px', borderRadius: '3px',
              backgroundColor: i < questionNum - 1 ? 'var(--primary)' : i === questionNum - 1 ? 'rgba(0,212,255,0.5)' : '#2a2a46'
            }} />
          ))}
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
          Q{questionNum}/{SPRINT_LENGTH}
        </div>
      </div>

      {/* Domain header */}
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span>{question.section}</span>
        <span style={{ color: '#2a2a46' }}>•</span>
        <span style={{ color: 'var(--primary)' }}>{question.domain}</span>
        <span style={{ color: '#2a2a46' }}>•</span>
        <span>{question.difficulty}</span>
      </div>

      {/* Question */}
      <div style={{ display: 'flex', gap: '32px', marginBottom: '40px' }}>
        {question.passage_text && (
          <div style={{ flex: 1, borderRight: '1px solid #2a2a46', paddingRight: '32px', fontSize: '1rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
            {question.passage_text}
          </div>
        )}
        <div style={{ flex: question.passage_text ? 1 : 'none', width: question.passage_text ? 'auto' : '100%', fontSize: '1.15rem', lineHeight: 1.6 }}>
          {question.question_text}
        </div>
      </div>

      {/* Hints */}
      {hintsUsed > 0 && (
        <div style={{ backgroundColor: 'rgba(255,215,64,0.08)', border: '1px solid rgba(255,215,64,0.3)', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', gap: '12px' }}>
          <AlertCircle color="var(--xp-gold)" style={{ flexShrink: 0 }} size={20} />
          <div>
            {hintsUsed >= 1 && question.hint_1 && <><div style={{ fontWeight: 'bold', color: 'var(--xp-gold)', marginBottom: '4px' }}>Hint 1</div><div style={{ marginBottom: hintsUsed > 1 ? '12px' : '0' }}>{question.hint_1}</div></>}
            {hintsUsed >= 2 && question.hint_2 && <><div style={{ fontWeight: 'bold', color: 'var(--xp-gold)', marginBottom: '4px' }}>Hint 2</div><div>{question.hint_2}</div></>}
          </div>
        </div>
      )}

      {/* Choices */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        {question.is_grid_in ? (
          <input type="number" value={selectedChoice || ''} onChange={e => setSelectedChoice(e.target.value)}
            disabled={isAnswered}
            style={{ padding: '16px', fontSize: '1.2rem', borderRadius: '8px', border: '1px solid #2a2a46', backgroundColor: 'var(--bg-main)', color: 'white', maxWidth: '300px' }}
            placeholder="Enter your answer" />
        ) : (
          question.choices.map(c => {
            let bgColor = 'var(--bg-card)', borderColor = '#2a2a46';
            if (isAnswered) {
              if (c.is_correct) { bgColor = 'rgba(0,230,118,0.1)'; borderColor = 'var(--success)'; }
              else if (selectedChoice === c.label) { bgColor = 'rgba(255,82,82,0.1)'; borderColor = 'var(--error)'; }
            } else if (selectedChoice === c.label) {
              borderColor = 'var(--primary)'; bgColor = 'rgba(0,212,255,0.08)';
            }
            return (
              <button key={c.label} disabled={isAnswered} onClick={() => setSelectedChoice(c.label)}
                style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', backgroundColor: bgColor, border: `2px solid ${borderColor}`, textAlign: 'left', fontSize: '1rem', gap: '16px', borderRadius: '12px', transition: 'all 0.2s', color: 'var(--text-primary)' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: selectedChoice === c.label && !isAnswered ? 'var(--primary)' : '#2a2a46', color: selectedChoice === c.label && !isAnswered ? '#000' : 'var(--text-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: '0.9rem' }}>
                  {c.label}
                </div>
                <span style={{ flex: 1 }}>{c.text}</span>
                {isAnswered && c.is_correct && <CheckCircle2 size={20} color="var(--success)" />}
                {isAnswered && selectedChoice === c.label && !c.is_correct && <XCircle size={20} color="var(--error)" />}
              </button>
            );
          })
        )}
      </div>

      {/* Post-answer */}
      {isAnswered ? (
        <div>
          {/* Static explanation */}
          {question.explanation && (
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '12px', marginBottom: '16px', borderLeft: '4px solid var(--primary)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '8px', color: 'var(--primary)' }}>Explanation</h3>
              <p style={{ lineHeight: 1.6, color: 'var(--text-primary)' }}>{question.explanation}</p>
            </div>
          )}

          {/* Deep dive (only on wrong answer) */}
          {!isCorrect && (
            <div style={{ marginBottom: '16px' }}>
              {!showDeepDive ? (
                <button onClick={handleDeepDive} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                  <Zap size={16} /> Deep Dive with AI
                </button>
              ) : (
                <div style={{ backgroundColor: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={16} /> {deepDiveLoading ? 'Generating step-by-step breakdown...' : 'AI Step-by-Step Breakdown'}
                  </h3>
                  <p style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>{deepDiveText}</p>
                </div>
              )}
            </div>
          )}

          <button className="primary animate-pop" onClick={handleNext}
            style={{ width: '100%', padding: '16px', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            {questionNum < SPRINT_LENGTH ? 'Next Question' : 'Complete Sprint'} <ChevronRight size={20} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setHintsUsed(h => Math.min(h + 1, 2))} disabled={hintsUsed >= 2}
            style={{ flex: 1, padding: '14px', fontSize: '0.95rem' }}>
            Hint ({2 - hintsUsed} left)
          </button>
          <button className="primary" onClick={handleAnswerSubmit} disabled={!selectedChoice && question.is_grid_in === 0}
            style={{ flex: 2, padding: '14px', fontSize: '1.1rem' }}>
            Check Answer
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Sprint.jsx
git commit -m "feat: rewrite Sprint with adaptive fetch, real timer, sprint records, and Deep Dive"
```

---

### Task 8: Rewrite Dashboard.jsx

**Files:**
- Rewrite: `src/pages/Dashboard.jsx`

**Interfaces:**
- Consumes: GET /api/progress?userId=
- Produces: 8-domain grid, predicted score, sprint history, Start Sprint / Review Errors cards

- [ ] **Step 1: Rewrite src/pages/Dashboard.jsx**

```jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, BookOpen, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const DOMAINS = [
  { name: 'Algebra', section: 'Math' },
  { name: 'Advanced Math', section: 'Math' },
  { name: 'Problem Solving & Data Analysis', section: 'Math' },
  { name: 'Geometry & Trig', section: 'Math' },
  { name: 'Information & Ideas', section: 'English' },
  { name: 'Craft & Structure', section: 'English' },
  { name: 'Expression of Ideas', section: 'English' },
  { name: 'Standard English Conventions', section: 'English' },
];

function DomainCard({ name, stats }) {
  const acc = stats?.accuracy;
  const prior = stats?.priorAccuracy;
  const color = acc === null ? '#2a2a46' : acc > 0.75 ? 'var(--success)' : acc > 0.5 ? 'var(--xp-gold)' : 'var(--error)';
  const trend = acc !== null && prior !== null ? (acc > prior ? 'up' : acc < prior ? 'down' : 'same') : null;

  return (
    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '16px', border: `1px solid ${color}30` }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.3 }}>{name}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: acc === null ? 'var(--text-secondary)' : color }}>
          {acc === null ? '--' : `${Math.round(acc * 100)}%`}
        </div>
        {trend === 'up' && <TrendingUp size={16} color="var(--success)" />}
        {trend === 'down' && <TrendingDown size={16} color="var(--error)" />}
        {trend === 'same' && <Minus size={16} color="var(--text-secondary)" />}
      </div>
      {stats?.count > 0 && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{stats.count} answered</div>}
    </div>
  );
}

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/progress?userId=${user.id}`)
      .then(r => r.json())
      .then(data => { setProgress(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user.id]);

  return (
    <div style={{ padding: '48px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontSize: '2.2rem', marginBottom: '4px' }}>Welcome back, {user.display_name || 'Learner'}!</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>
        {loading ? 'Loading your progress...' : progress?.totalAnswered === 0 ? 'Start your first sprint to see progress here.' : `${progress.totalAnswered} questions answered total.`}
      </p>

      {/* CTA Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
        <div onClick={() => navigate('/sprint')}
          style={{ backgroundColor: 'var(--bg-card)', padding: '28px', borderRadius: '16px', border: '1px solid #2a2a46', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = '#2a2a46'; e.currentTarget.style.transform = 'translateY(0)'; }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <PlayCircle size={32} color="var(--primary)" />
            <h2 style={{ fontSize: '1.3rem' }}>Start Sprint</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>10 adaptive questions, focused on your weak spots.</p>
          <button className="primary" style={{ width: '100%', padding: '10px' }}>Let's Go!</button>
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', padding: '28px', borderRadius: '16px', border: '1px solid #2a2a46', opacity: 0.6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <BookOpen size={32} color="var(--xp-gold)" />
            <h2 style={{ fontSize: '1.3rem' }}>Review Errors</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>Spaced repetition review coming in Phase 2.</p>
          <button disabled style={{ width: '100%', padding: '10px' }}>Coming Soon</button>
        </div>
      </div>

      {/* Predicted Score */}
      {progress?.predictedScore && (
        <div style={{ backgroundColor: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '16px', padding: '24px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '24px' }}>
          <TrendingUp size={32} color="var(--primary)" />
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>PREDICTED SCORE RANGE</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{progress.predictedScore.range}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              English {progress.predictedScore.english} + Math {progress.predictedScore.math}
              {progress.baseline?.english ? ` (baseline: ${progress.baseline.english + progress.baseline.math})` : ''}
            </div>
          </div>
        </div>
      )}

      {/* Domain Grid */}
      <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Domain Performance</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '40px' }}>
        {DOMAINS.map(d => (
          <DomainCard key={d.name} name={d.name} stats={progress?.domainStats?.[d.name]} />
        ))}
      </div>

      {/* Sprint History */}
      {progress?.recentSprints?.length > 0 && (
        <>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Recent Sprints</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {progress.recentSprints.map(s => (
              <div key={s.id} style={{ backgroundColor: 'var(--bg-card)', borderRadius: '10px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #2a2a46' }}>
                <div style={{ flex: 1, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {new Date(s.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div style={{ display: 'flex', gap: '24px', fontSize: '0.9rem' }}>
                  <span>{s.questions_attempted} Qs</span>
                  <span style={{ color: s.questions_attempted > 0 && s.questions_correct / s.questions_attempted > 0.7 ? 'var(--success)' : 'var(--text-primary)' }}>
                    {s.questions_attempted > 0 ? Math.round(s.questions_correct / s.questions_attempted * 100) : 0}%
                  </span>
                  <span style={{ color: 'var(--xp-gold)' }}>+{s.xp_earned} XP</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat: rewrite Dashboard with domain grid, predicted score, and sprint history"
```

---

### Task 9: Profile page + Sidebar rewrite

**Files:**
- Create: `src/pages/Profile.jsx`
- Rewrite: `src/components/Sidebar.jsx`

**Interfaces:**
- Profile: consumes user, setUser; calls GET /api/progress and PUT /api/users/:id
- Sidebar: shows nav links (Dashboard, Sprint, Profile), real XP bar (level N = N*500 XP), streak

- [ ] **Step 1: Create src/pages/Profile.jsx**

```jsx
import React, { useState, useEffect } from 'react';
import { Check, Edit2 } from 'lucide-react';

const MATH_DOMAINS = ['Algebra', 'Advanced Math', 'Problem Solving & Data Analysis', 'Geometry & Trig'];
const ENG_DOMAINS = ['Information & Ideas', 'Craft & Structure', 'Expression of Ideas', 'Standard English Conventions'];
const ALL_DOMAINS = [...MATH_DOMAINS, ...ENG_DOMAINS];

export default function Profile({ user, setUser }) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user.display_name || '');
  const [weakAreas, setWeakAreas] = useState(user.weak_areas || []);
  const [progress, setProgress] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/progress?userId=${user.id}`)
      .then(r => r.json())
      .then(setProgress)
      .catch(() => {});
  }, [user.id]);

  const saveName = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: nameInput })
      });
      setUser(await res.json());
      setEditingName(false);
    } finally { setSaving(false); }
  };

  const saveWeakAreas = async () => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weak_areas: weakAreas })
      });
      setUser(await res.json());
    } catch {}
  };

  const toggleDomain = (domain) => {
    setWeakAreas(prev => prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]);
  };

  const level = Math.floor(user.total_xp / 500) + 1;
  const xpForCurrentLevel = (level - 1) * 500;
  const xpForNextLevel = level * 500;
  const xpProgress = ((user.total_xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;

  const sectionStyle = { backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '28px', marginBottom: '20px', border: '1px solid #2a2a46' };

  return (
    <div style={{ padding: '48px', maxWidth: '700px', margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '32px' }}>Profile</h1>

      {/* Name */}
      <div style={sectionStyle}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Display Name</div>
        {editingName ? (
          <div style={{ display: 'flex', gap: '12px' }}>
            <input value={nameInput} onChange={e => setNameInput(e.target.value)} autoFocus
              style={{ flex: 1, padding: '10px 14px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--primary)', borderRadius: '8px', color: 'white', fontSize: '1.1rem' }}
              onKeyDown={e => e.key === 'Enter' && saveName()} />
            <button className="primary" onClick={saveName} disabled={saving} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={16} /> Save
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{user.display_name || 'Learner'}</span>
            <button onClick={() => setEditingName(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '0.85rem' }}>
              <Edit2 size={14} /> Edit
            </button>
          </div>
        )}
      </div>

      {/* Scores */}
      <div style={sectionStyle}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Scores</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {[
            { label: 'Baseline English', value: user.baseline_english || '--' },
            { label: 'Baseline Math', value: user.baseline_math || '--' },
            { label: 'Predicted Total', value: progress?.predictedScore?.range || (progress?.totalAnswered < 20 ? 'Answer 20+ Qs' : '--') }
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--primary)' }}>{item.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* XP & Level */}
      <div style={sectionStyle}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Progress</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Level', value: level },
            { label: 'Total XP', value: user.total_xp },
            { label: 'Streak', value: `${user.current_streak}d` },
            { label: 'Best Streak', value: `${user.longest_streak}d` }
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center', backgroundColor: 'var(--bg-main)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--xp-gold)' }}>{item.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{item.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Level {level} XP: {user.total_xp - xpForCurrentLevel} / {xpForNextLevel - xpForCurrentLevel}</div>
        <div style={{ height: '8px', backgroundColor: '#0f0f1a', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(xpProgress, 100)}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.5s' }} />
        </div>
      </div>

      {/* Weak Areas */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Weak Areas</div>
          <button className="primary" onClick={saveWeakAreas} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>Save</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {ALL_DOMAINS.map(d => (
            <button key={d} onClick={() => toggleDomain(d)}
              style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem',
                border: weakAreas.includes(d) ? '1px solid var(--primary)' : '1px solid #2a2a46',
                backgroundColor: weakAreas.includes(d) ? 'rgba(0,212,255,0.1)' : 'transparent',
                color: weakAreas.includes(d) ? 'var(--primary)' : 'var(--text-secondary)' }}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Domain accuracy bars */}
      {progress?.domainStats && (
        <div style={sectionStyle}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Domain Accuracy</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ALL_DOMAINS.map(d => {
              const acc = progress.domainStats[d]?.accuracy;
              const color = acc === null ? '#2a2a46' : acc > 0.75 ? 'var(--success)' : acc > 0.5 ? 'var(--xp-gold)' : 'var(--error)';
              return (
                <div key={d}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{d}</span>
                    <span style={{ color }}>{acc === null ? '--' : `${Math.round(acc * 100)}%`}</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: '#2a2a46', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${acc === null ? 0 : acc * 100}%`, height: '100%', backgroundColor: color, transition: 'width 0.5s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sprint history */}
      {progress?.recentSprints?.length > 0 && (
        <div style={sectionStyle}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Sprint History</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={{ padding: '8px 0', fontWeight: 'normal' }}>Date</th>
                <th style={{ padding: '8px 0', fontWeight: 'normal' }}>Questions</th>
                <th style={{ padding: '8px 0', fontWeight: 'normal' }}>Accuracy</th>
                <th style={{ padding: '8px 0', fontWeight: 'normal' }}>XP</th>
              </tr>
            </thead>
            <tbody>
              {progress.recentSprints.map(s => (
                <tr key={s.id} style={{ borderTop: '1px solid #2a2a46' }}>
                  <td style={{ padding: '10px 0' }}>{new Date(s.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td style={{ padding: '10px 0' }}>{s.questions_attempted}</td>
                  <td style={{ padding: '10px 0', color: s.questions_attempted > 0 && s.questions_correct / s.questions_attempted > 0.7 ? 'var(--success)' : 'inherit' }}>
                    {s.questions_attempted > 0 ? `${Math.round(s.questions_correct / s.questions_attempted * 100)}%` : '--'}
                  </td>
                  <td style={{ padding: '10px 0', color: 'var(--xp-gold)' }}>+{s.xp_earned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite src/components/Sidebar.jsx**

```jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Flame, Star, LayoutDashboard, Zap, User } from 'lucide-react';

export default function Sidebar({ user }) {
  const level = Math.floor(user.total_xp / 500) + 1;
  const xpForCurrentLevel = (level - 1) * 500;
  const xpForNextLevel = level * 500;
  const xpProgress = ((user.total_xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;

  const navLinkStyle = ({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px',
    textDecoration: 'none', fontSize: '0.95rem', transition: 'all 0.2s',
    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
    backgroundColor: isActive ? 'rgba(0,212,255,0.08)' : 'transparent',
    border: isActive ? '1px solid rgba(0,212,255,0.2)' : '1px solid transparent'
  });

  return (
    <div style={{ width: '260px', minWidth: '260px', backgroundColor: 'var(--bg-sidebar)', borderLeft: '1px solid #2a2a46', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.2rem', letterSpacing: '0.5px' }}>ADHDSat</div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <NavLink to="/" end style={navLinkStyle}><LayoutDashboard size={18} /> Dashboard</NavLink>
        <NavLink to="/sprint" style={navLinkStyle}><Zap size={18} /> Sprint</NavLink>
        <NavLink to="/profile" style={navLinkStyle}><User size={18} /> Profile</NavLink>
      </nav>

      {/* XP Card */}
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{user.display_name || 'Learner'}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Level {level}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--xp-gold)', fontWeight: 'bold', fontSize: '0.9rem' }}>
            <Star size={16} fill="currentColor" /> {user.total_xp}
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{user.total_xp - xpForCurrentLevel} XP</span><span>{xpForNextLevel - xpForCurrentLevel} to next</span>
        </div>
        <div style={{ height: '6px', backgroundColor: '#0f0f1a', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(xpProgress, 100)}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.5s' }} />
        </div>
      </div>

      {/* Streak */}
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Flame size={28} color="var(--error)" fill="var(--error)" />
        <div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{user.current_streak}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Day Streak</div>
        </div>
        {user.longest_streak > 0 && (
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{user.longest_streak}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Best</div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Profile.jsx src/components/Sidebar.jsx
git commit -m "feat: add Profile page and rewrite Sidebar with nav, real XP bar, streak"
```

---

### Task 10: Write questions.json (80 SAT questions)

This task writes the actual question bank data. The file goes at `server/data/questions.json`.

**Coverage:** 10 questions per domain, mix of easy/medium/hard, all 8 domains.

- [ ] **Step 1: Write server/data/questions.json**

Create a JSON array with 80 SAT questions. Format matches the schema (id, section, domain, skill, difficulty, question_text, passage_text, choices array, is_grid_in, grid_in_answer, explanation, hint_1, hint_2, tags, source).

See the actual file write in execution — the content is too long for a plan code block but the structure is defined in Task 4 Step 2.

Key domain/difficulty distribution:
- Algebra: alg_001 through alg_010 (easy x3, medium x4, hard x3)
- Advanced Math: adv_001 through adv_010
- Problem Solving & Data Analysis: ps_001 through ps_010
- Geometry & Trig: geo_001 through geo_010
- Information & Ideas: info_001 through info_010
- Craft & Structure: cs_001 through cs_010
- Expression of Ideas: exp_001 through exp_010
- Standard English Conventions: sec_001 through sec_010

- [ ] **Step 2: Run ingest to verify**

```bash
node server/ingest.js
```

Expected output: `[ingest] Done. Inserted: 80, Skipped (duplicates): 0`

- [ ] **Step 3: Verify questions appear in API**

```bash
curl -s "http://localhost:3001/api/questions?limit=5" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d)} questions, domains: {set(q[\"domain\"] for q in d)}')"
```

Expected: `5 questions, domains: {...}` (subset of 8 domains)

- [ ] **Step 4: Commit**

```bash
git add server/data/questions.json
git commit -m "feat: add 80 SAT question bank covering all 8 domains"
```

---

### Task 11: End-to-end verification

- [ ] **Step 1: Fresh start**

```bash
npm run dev
```

Expected: Vite dev server starts on :5173, Express starts on :3001, no errors.

- [ ] **Step 2: Onboarding flow**

- Clear localStorage (`localStorage.clear()` in browser console)
- Refresh page
- Should redirect to `/onboarding`
- Complete all 3 steps
- Should land on `/sprint`

- [ ] **Step 3: Sprint flow**

- Sprint should fetch one question at a time adaptively
- Answer 2 questions wrong in same domain
- Timer in DevTools network tab should show real `time_spent_seconds` (not always 30)
- Click "Deep Dive" on a wrong answer -- should stream Gemini text
- Complete sprint -- should navigate to `/`

- [ ] **Step 4: Dashboard**

- Domain grid should show accuracy percentages after answering
- Sprint history should show the completed sprint

- [ ] **Step 5: Profile**

- Edit display name inline and save
- Modify weak areas and save
- Reload page -- changes should persist

- [ ] **Step 6: No-key fallback**

- Temporarily remove GEMINI_API_KEY from .env
- Restart server
- Sprint should still work (fallback to lowest-accuracy domain at medium difficulty)

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete ADHDSat full build -- adaptive SAT prep with Gemini AI"
```
