/**
 * Sync the question bank (server/data/questions.json) into Postgres.
 *
 * Run after expanding the bank with generate-questions.js:
 *   node server/generate-questions.js   # appends to questions.json
 *   node server/ingest.js               # upserts questions.json into Postgres
 *
 * Idempotent: upserts by id, so re-running refreshes edited questions and adds
 * new ones without duplicating. Requires DATABASE_URL.
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import pool, { ensureSeed } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(path.join(__dirname, 'data', 'questions.json'), 'utf8'));

// ensureSeed runs the schema DDL (and seeds an empty table), guaranteeing the
// adhdsat schema + questions table exist before we upsert.
await ensureSeed();

const now = new Date().toISOString();
const CHUNK = 100;
let processed = 0;

for (let i = 0; i < raw.length; i += CHUNK) {
  const slice = raw.slice(i, i + CHUNK);
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
     ON CONFLICT (id) DO UPDATE SET
       section = EXCLUDED.section, domain = EXCLUDED.domain, skill = EXCLUDED.skill,
       difficulty = EXCLUDED.difficulty, question_text = EXCLUDED.question_text,
       passage_text = EXCLUDED.passage_text, choices = EXCLUDED.choices,
       is_grid_in = EXCLUDED.is_grid_in, grid_in_answer = EXCLUDED.grid_in_answer,
       explanation = EXCLUDED.explanation, hint_1 = EXCLUDED.hint_1, hint_2 = EXCLUDED.hint_2,
       tags = EXCLUDED.tags, source = EXCLUDED.source`,
    params
  );
  processed += slice.length;
}

const total = (await pool.query('SELECT COUNT(*)::int AS cnt FROM adhdsat.questions')).rows[0].cnt;
console.log(`[ingest] Synced ${processed} questions from questions.json. Bank now holds ${total}.`);
await pool.end();
process.exit(0);
