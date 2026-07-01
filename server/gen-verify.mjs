/**
 * Generate SAT questions via Gemini, then VERIFY each one by independently
 * re-solving it with a fresh model call. Only questions whose independent solve
 * matches the marked answer key are kept. Output goes to a staging file for
 * review + ingest, never directly to the live bank.
 *
 * Usage: node --env-file=.env server/gen-verify.mjs <perDomainTarget> [chunkSize]
 */
import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUESTIONS_PATH = path.join(__dirname, 'data', 'questions.json');
const STAGING_PATH = path.join(__dirname, 'data', 'generated-staging.json');

const DOMAINS = [
  { name: 'Algebra', section: 'Math', prefix: 'galg' },
  { name: 'Advanced Math', section: 'Math', prefix: 'gadv' },
  { name: 'Problem Solving & Data Analysis', section: 'Math', prefix: 'gps' },
  { name: 'Geometry & Trig', section: 'Math', prefix: 'ggeo' },
  { name: 'Information & Ideas', section: 'English', prefix: 'ginfo' },
  { name: 'Craft & Structure', section: 'English', prefix: 'gcs' },
  { name: 'Expression of Ideas', section: 'English', prefix: 'gexp' },
  { name: 'Standard English Conventions', section: 'English', prefix: 'gsec' },
];

const SKILLS = {
  'Algebra': ['Linear equations in one variable', 'Systems of linear equations', 'Linear inequalities', 'Linear functions', 'Slope and intercepts'],
  'Advanced Math': ['Quadratic equations', 'Polynomial operations', 'Nonlinear functions', 'Equivalent expressions', 'Radical and rational equations', 'Exponents'],
  'Problem Solving & Data Analysis': ['Ratios and proportions', 'Percentages', 'Statistics: mean/median/mode', 'Probability', 'Interpreting data', 'Unit conversion', 'Rates'],
  'Geometry & Trig': ['Area and volume', 'Lines, angles, triangles', 'Right triangles and trigonometry', 'Circles', 'Coordinate geometry'],
  'Information & Ideas': ['Central ideas and details', 'Command of evidence', 'Inferences'],
  'Craft & Structure': ['Words in context', 'Text structure and purpose'],
  'Expression of Ideas': ['Rhetorical synthesis', 'Transitions'],
  'Standard English Conventions': ['Sentence boundaries', 'Subject-verb agreement', 'Pronoun reference', 'Punctuation', 'Verb tense'],
};

function sanitize(raw) {
  let inString = false, escaped = false, out = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i], code = ch.charCodeAt(0);
    if (escaped) { out += ch; escaped = false; continue; }
    if (ch === '\\' && inString) { out += ch; escaped = true; continue; }
    if (ch === '"') { inString = !inString; out += ch; continue; }
    if (inString && code < 0x20) {
      if (code === 0x09) out += '\\t'; else if (code === 0x0a) out += '\\n';
      else if (code === 0x0d) out += '\\r'; else out += `\\u${code.toString(16).padStart(4, '0')}`;
      continue;
    }
    out += ch;
  }
  return out;
}

function extractObjects(text) {
  const out = [];
  let depth = 0, inStr = false, esc = false, start = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\' && inStr) { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') { if (depth === 0) start = i; depth++; }
    else if (ch === '}') { depth--; if (depth === 0 && start !== -1) { try { out.push(JSON.parse(sanitize(text.slice(start, i + 1)))); } catch {} start = -1; } }
  }
  return out;
}

async function callModel(prompt, retries = 4) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const text = execFileSync('agy', ['-p', prompt], { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 10 });
      return text.trim();
    } catch (err) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, attempt * 8000));
        continue;
      }
      console.error('  agy error:', err.message);
      return null;
    }
  }
  return null;
}

function genPrompt(domain, section, count) {
  const isEng = section === 'English';
  return `You are an expert SAT item writer. Generate exactly ${count} ORIGINAL, high-quality, highly intelligent digital SAT practice questions for the domain "${domain}" (${section} section). Do not copy any copyrighted material.

${isEng ? 'Each question MUST include a realistic 3-6 sentence academic passage in "passage_text".\nCRITICAL FORMATTING: The "question_text" MUST contain a clear question prompt (e.g., "Which choice completes the text...?"). Use a blank "______" for missing text. Do NOT use brackets like "[word]" without a question prompt.' : 'Set "passage_text" to null. Every numeric/algebraic answer must be verifiably correct.'}

CRITICAL INSTRUCTIONS FOR QUALITY & INTELLIGENCE:
- Avoid repetitive tropes (no Bob/Alice, no simple coin/apple counting).
- Use highly creative, realistic scenarios: astrophysics, economics, biology, literature, or advanced theoretical concepts.
- "Hard" questions must require deep abstract reasoning and multi-step synthesis, not just tedious arithmetic.
- Ensure high variance in sentence structure and question formats.

Requirements:
- Difficulty mix: ~30% easy, 40% medium, 30% hard.
- Cover these skills: ${SKILLS[domain].join(', ')}.
- Exactly one of the 4 choices is correct. The other three must be plausible distractors.
- The marked correct answer MUST be genuinely correct. Double-check math.
- Explanations are step-by-step and accurate.
- Use plain text only: NO markdown (no **bold**, _italics_, # headers, or backticks). Write math inline (x^2, sqrt(9), (a/b)) or in $...$ for fractions.

Return ONLY a JSON array. Each object:
{"section":"${section}","domain":"${domain}","skill":"<one skill>","difficulty":"easy|medium|hard","question_text":"...","passage_text":${isEng ? '"..."' : 'null'},"choices":[{"label":"A","text":"...","is_correct":false},{"label":"B","text":"...","is_correct":false},{"label":"C","text":"...","is_correct":false},{"label":"D","text":"...","is_correct":false}],"is_grid_in":0,"grid_in_answer":null,"explanation":"...","hint_1":"...","hint_2":"...","tags":["..."],"source":"generated"}
Exactly one choice has is_correct:true. No text outside the array.`;
}

function verifyPrompt(batch) {
  const items = batch.map((q, i) => {
    const passage = q.passage_text ? `Passage: ${q.passage_text}\n` : '';
    const choices = q.choices.map(c => `${c.label}) ${c.text}`).join('\n');
    return `Q${i}: ${passage}${q.question_text}\n${choices}`;
  }).join('\n\n');
  return `You are an SAT answer key checker. Independently solve each question below and give the single best answer. Do NOT assume any provided key. For reading/grammar, pick the one best standard-SAT answer.

${items}

Return ONLY a JSON array of objects like {"q":0,"answer":"A"} for every question, in order. No other text.`;
}

function parseArray(text) {
  if (!text) return [];
  let t = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  t = sanitize(t);
  try { const a = JSON.parse(t); if (Array.isArray(a)) return a; } catch {}
  return extractObjects(t);
}

function structurallyValid(q) {
  if (!q.question_text || !Array.isArray(q.choices) || q.choices.length !== 4) return false;
  if (q.choices.filter(c => c.is_correct === true).length !== 1) return false;
  if (!q.explanation) return false;
  if (q.section === 'English' && !q.passage_text) return false;
  return true;
}

async function verifyBatch(batch) {
  const text = await callModel(verifyPrompt(batch));
  const verdicts = parseArray(text);
  const byIndex = {};
  for (const v of verdicts) if (typeof v.q === 'number' && v.answer) byIndex[v.q] = String(v.answer).trim().toUpperCase().charAt(0);
  return batch.filter((q, i) => {
    const marked = q.choices.find(c => c.is_correct)?.label;
    return byIndex[i] && byIndex[i] === marked;
  });
}

async function main() {
  const perDomain = parseInt(process.argv[2] || '50', 10);
  const chunk = parseInt(process.argv[3] || '10', 10);

  const existing = JSON.parse(readFileSync(QUESTIONS_PATH, 'utf-8'));
  const existingIds = new Set(existing.map(q => q.id));
  const staged = existsSync(STAGING_PATH) ? JSON.parse(readFileSync(STAGING_PATH, 'utf-8')) : [];
  for (const q of staged) existingIds.add(q.id);

  const counters = {};
  for (const d of DOMAINS) {
    counters[d.prefix] = Math.max(0, ...[...existingIds].filter(id => id.startsWith(d.prefix + '_')).map(id => parseInt(id.split('_').pop(), 10) || 0));
  }

  let grandKept = 0, grandGen = 0;
  for (const d of DOMAINS) {
    let kept = 0, rounds = 0;
    const maxRounds = Math.ceil(perDomain / chunk) + 3;
    while (kept < perDomain && rounds < maxRounds) {
      rounds++;
      const want = Math.min(chunk, perDomain - kept);
      const raw = parseArray(await callModel(genPrompt(d.name, d.section, want)));
      grandGen += raw.length;
      const valid = raw.filter(structurallyValid);
      if (!valid.length) { console.log(`  ${d.name}: round ${rounds} produced 0 valid`); continue; }
      const verified = await verifyBatch(valid);
      for (const q of verified) {
        const id = `${d.prefix}_${String(++counters[d.prefix]).padStart(3, '0')}`;
        staged.push({
          id, section: d.section, domain: d.name, skill: q.skill || 'General',
          difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
          question_text: String(q.question_text), passage_text: q.passage_text || null,
          choices: q.choices.map((c, ci) => ({ label: c.label || ['A', 'B', 'C', 'D'][ci], text: String(c.text), is_correct: Boolean(c.is_correct) })),
          is_grid_in: 0, grid_in_answer: null,
          explanation: q.explanation || '', hint_1: q.hint_1 || '', hint_2: q.hint_2 || '',
          tags: Array.isArray(q.tags) ? q.tags : [], source: 'generated-verified',
        });
        kept++;
      }
      console.log(`  ${d.name}: round ${rounds} kept ${verified.length}/${valid.length} (total ${kept}/${perDomain})`);
      writeFileSync(STAGING_PATH, JSON.stringify(staged, null, 2)); // checkpoint each round
    }
    grandKept += kept;
    console.log(`[${d.name}] done: ${kept} verified.`);
  }
  console.log(`\nDone. Generated ~${grandGen}, kept ${grandKept} verified. Staging total: ${staged.length} at ${STAGING_PATH}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
