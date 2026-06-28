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
