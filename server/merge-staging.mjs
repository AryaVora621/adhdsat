/**
 * Merge verified, generated questions from generated-staging.json into the live
 * bank (questions.json). Cleans backtick code-spans (MathText renders them
 * literally), validates structure, and drops id or near-text duplicates.
 *
 * Usage: node server/merge-staging.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUESTIONS_PATH = path.join(__dirname, 'data', 'questions.json');
const STAGING_PATH = path.join(__dirname, 'data', 'generated-staging.json');

const stripTicks = (s) => typeof s === 'string' ? s.replace(/`/g, '').trim() : s;
const normText = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9 ]/g, '').trim().slice(0, 120);

function clean(q) {
  return {
    ...q,
    question_text: stripTicks(q.question_text),
    passage_text: q.passage_text ? stripTicks(q.passage_text) : null,
    choices: q.choices.map(c => ({ ...c, text: stripTicks(c.text) })),
    explanation: stripTicks(q.explanation),
    hint_1: stripTicks(q.hint_1),
    hint_2: stripTicks(q.hint_2),
  };
}

function valid(q) {
  if (!q.question_text || !Array.isArray(q.choices) || q.choices.length !== 4) return 'bad-structure';
  if (q.choices.filter(c => c.is_correct === true).length !== 1) return 'not-one-correct';
  if (!q.explanation) return 'no-explanation';
  if (q.section === 'English' && !q.passage_text) return 'english-no-passage';
  return null;
}

function main() {
  if (!existsSync(STAGING_PATH)) { console.error('No staging file.'); process.exit(1); }
  const bank = JSON.parse(readFileSync(QUESTIONS_PATH, 'utf-8'));
  const staged = JSON.parse(readFileSync(STAGING_PATH, 'utf-8'));

  const ids = new Set(bank.map(q => q.id));
  const texts = new Set(bank.map(q => normText(q.question_text)));

  const rejected = {};
  let added = 0;
  const byDomain = {};
  for (const raw of staged) {
    const q = clean(raw);
    const why = valid(q);
    if (why) { rejected[why] = (rejected[why] || 0) + 1; continue; }
    if (ids.has(q.id)) { rejected['dup-id'] = (rejected['dup-id'] || 0) + 1; continue; }
    const nt = normText(q.question_text);
    if (texts.has(nt)) { rejected['dup-text'] = (rejected['dup-text'] || 0) + 1; continue; }
    ids.add(q.id); texts.add(nt);
    bank.push(q); added++;
    byDomain[q.domain] = (byDomain[q.domain] || 0) + 1;
  }

  writeFileSync(QUESTIONS_PATH, JSON.stringify(bank, null, 2));
  console.log(`Merged ${added} questions. Bank now: ${bank.length}`);
  console.log('By domain:', JSON.stringify(byDomain, null, 0));
  if (Object.keys(rejected).length) console.log('Rejected:', JSON.stringify(rejected));
}

main();
