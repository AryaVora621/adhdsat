import 'dotenv/config';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn('[ADHDSat] DATABASE_URL not set -- the server cannot reach Postgres. Set it in .env (local) and the Vercel project (prod).');
}

// Supabase requires TLS. Serverless functions run many short-lived instances,
// so keep the per-instance pool small.
const pool = new Pool({
  connectionString,
  ssl: connectionString && /supabase|amazonaws|render|neon/.test(connectionString) ? { rejectUnauthorized: false } : undefined,
  max: 4,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 8000,
});


pool.on('error', (err) => {
  console.error('[ADHDSat] Postgres pool error:', err.message);
});

// Query helpers
export const query = (text, params) => pool.query(text, params);
export const rows = (text, params) => pool.query(text, params).then((r) => r.rows);
export const row = (text, params) => pool.query(text, params).then((r) => r.rows[0] || null);

// --- Idempotent schema bootstrap ---
// Runs the DDL on first boot so a fresh Postgres (any project) is ready without
// a manual migration step. All tables live in the dedicated `adhdsat` schema.
const SCHEMA_DDL = `
CREATE SCHEMA IF NOT EXISTS adhdsat;
CREATE TABLE IF NOT EXISTS adhdsat.users (
  id TEXT PRIMARY KEY, display_name TEXT, total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1, current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0, last_active_date TEXT, created_at TEXT,
  study_plan TEXT DEFAULT NULL, baseline_english INTEGER DEFAULT 0,
  baseline_math INTEGER DEFAULT 0, weak_areas TEXT DEFAULT '[]',
  onboarding_completed INTEGER DEFAULT 0, subscores TEXT DEFAULT NULL,
  plan TEXT DEFAULT 'free'
);
ALTER TABLE adhdsat.users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE adhdsat.users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE adhdsat.users ADD COLUMN IF NOT EXISTS is_guest INTEGER DEFAULT 1;
CREATE TABLE IF NOT EXISTS adhdsat.questions (
  id TEXT PRIMARY KEY, section TEXT, domain TEXT, skill TEXT, difficulty TEXT,
  question_text TEXT, passage_text TEXT, choices TEXT, is_grid_in INTEGER DEFAULT 0,
  grid_in_answer DOUBLE PRECISION, explanation TEXT, hint_1 TEXT, hint_2 TEXT,
  tags TEXT, source TEXT DEFAULT 'ingest', created_at TEXT
);
CREATE TABLE IF NOT EXISTS adhdsat.user_answers (
  id TEXT PRIMARY KEY, user_id TEXT, question_id TEXT, selected_choice TEXT,
  is_correct INTEGER, hints_used INTEGER, error_type TEXT, time_spent_seconds INTEGER,
  sprint_id TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS adhdsat.sprints (
  id TEXT PRIMARY KEY, user_id TEXT, sprint_type TEXT, duration_minutes INTEGER,
  questions_attempted INTEGER DEFAULT 0, questions_correct INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0, started_at TEXT, completed_at TEXT
);
CREATE TABLE IF NOT EXISTS adhdsat.review_cards (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, question_id TEXT NOT NULL,
  next_review_at TEXT NOT NULL, interval_days DOUBLE PRECISION DEFAULT 1,
  ease_factor DOUBLE PRECISION DEFAULT 2.5, rep_count INTEGER DEFAULT 0,
  last_reviewed_at TEXT, UNIQUE(user_id, question_id)
);
CREATE TABLE IF NOT EXISTS adhdsat.practice_test_results (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
  rw_score INTEGER, math_score INTEGER, total_score INTEGER,
  rw_correct INTEGER, rw_total INTEGER, math_correct INTEGER, math_total INTEGER,
  taken_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ptr_user ON adhdsat.practice_test_results(user_id, taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_ua_user ON adhdsat.user_answers(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ua_sprint ON adhdsat.user_answers(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprints_user ON adhdsat.sprints(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_rc_user ON adhdsat.review_cards(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_q_domain_diff ON adhdsat.questions(domain, difficulty);
`;

// --- One-time schema + question seed (idempotent, shared across all instances) ---
// Because the DB is now shared, this runs once for the whole deployment: the
// first instance to boot with an empty questions table seeds it; everyone else
// sees the rows and skips.
let seedPromise = null;

async function doSeed() {
  try {
    await pool.query(SCHEMA_DDL);
    const r = await pool.query('SELECT COUNT(*)::int AS cnt FROM adhdsat.questions');
    if (r.rows[0].cnt > 0) return;

    const jsonPath = path.join(__dirname, 'data', 'questions.json');
    if (!existsSync(jsonPath)) {
      console.warn('[ADHDSat] questions.json not found; skipping seed.');
      return;
    }
    const questions = JSON.parse(readFileSync(jsonPath, 'utf8'));
    const now = new Date().toISOString();

    // Batch insert in chunks to keep round-trips low.
    const CHUNK = 100;
    for (let i = 0; i < questions.length; i += CHUNK) {
      const slice = questions.slice(i, i + CHUNK);
      const values = [];
      const params = [];
      let p = 0;
      for (const q of slice) {
        values.push(`($${++p},$${++p},$${++p},$${++p},$${++p},$${++p},$${++p},$${++p},$${++p},$${++p},$${++p},$${++p},$${++p},$${++p},$${++p},$${++p})`);
        params.push(
          q.id, q.section, q.domain, q.skill, q.difficulty,
          q.question_text, q.passage_text || null,
          JSON.stringify(q.choices || []),
          q.is_grid_in ? 1 : 0, q.grid_in_answer ?? null,
          q.explanation || null, q.hint_1 || null, q.hint_2 || null,
          JSON.stringify(q.tags || []), q.source || 'ingest', now
        );
      }
      await pool.query(
        `INSERT INTO adhdsat.questions
          (id, section, domain, skill, difficulty, question_text, passage_text, choices,
           is_grid_in, grid_in_answer, explanation, hint_1, hint_2, tags, source, created_at)
         VALUES ${values.join(',')}
         ON CONFLICT (id) DO NOTHING`,
        params
      );
    }
    console.log(`[ADHDSat] Seeded ${questions.length} questions into Postgres.`);
  } catch (e) {
    console.error('[ADHDSat] Seed failed:', e.message);
  }
}

export function ensureSeed() {
  if (!seedPromise) seedPromise = doSeed();
  return seedPromise;
}

export default pool;
