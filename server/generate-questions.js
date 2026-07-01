/**
 * Generates additional SAT questions via Gemini and appends them to questions.json.
 * Usage: node server/generate-questions.js [domain] [count]
 * Example: node server/generate-questions.js "Algebra" 20
 * Leave domain blank to generate for all 8 domains.
 */
import 'dotenv/config';
import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUESTIONS_PATH = path.join(__dirname, 'data', 'questions.json');

const DOMAINS = [
  { name: 'Algebra', section: 'Math', prefix: 'alg' },
  { name: 'Advanced Math', section: 'Math', prefix: 'adv' },
  { name: 'Problem Solving & Data Analysis', section: 'Math', prefix: 'ps' },
  { name: 'Geometry & Trig', section: 'Math', prefix: 'geo' },
  { name: 'Information & Ideas', section: 'English', prefix: 'info' },
  { name: 'Craft & Structure', section: 'English', prefix: 'cs' },
  { name: 'Expression of Ideas', section: 'English', prefix: 'exp' },
  { name: 'Standard English Conventions', section: 'English', prefix: 'sec' },
];

const SKILLS_BY_DOMAIN = {
  'Algebra': ['Linear equations in one variable', 'Systems of linear equations', 'Linear inequalities', 'Linear functions', 'Interpreting linear functions'],
  'Advanced Math': ['Nonlinear equations', 'Polynomial operations', 'Nonlinear functions', 'Equivalent expressions', 'Radical and rational equations'],
  'Problem Solving & Data Analysis': ['Ratios and proportions', 'Percentages', 'Statistics: mean, median, mode', 'Statistics: spread', 'Probability', 'Interpreting data', 'Scatter plots and correlation', 'Unit conversion'],
  'Geometry & Trig': ['Area and volume', 'Lines, angles, triangles', 'Right triangles and trigonometry', 'Circles', 'Coordinate geometry'],
  'Information & Ideas': ['Central ideas and details', 'Command of evidence', 'Inferences', 'Cross-text connections'],
  'Craft & Structure': ['Words in context', 'Text structure and purpose', 'Cross-text connections'],
  'Expression of Ideas': ['Rhetorical synthesis', 'Transitions', 'Rhetorical purpose'],
  'Standard English Conventions': ['Boundaries', 'Form/structure/sense', 'Subject-verb agreement', 'Pronoun reference', 'Punctuation'],
};

function buildPrompt(domain, section, existingIds, count) {
  const skills = SKILLS_BY_DOMAIN[domain] || [];
  const isEnglish = section === 'English';

  const englishPassageNote = isEnglish ? `
For English questions, include a realistic short passage (3-6 sentences) in the "passage_text" field. The passage should be academic or literary in style -- the kind found in the SAT. 
CRITICAL FORMATTING: The "question_text" MUST contain a clear question prompt (e.g., "Which choice completes the text so that it conforms to the conventions of Standard English?"). Use a blank "______" in the passage or question text where the missing word/phrase goes. Do NOT use brackets like "[word]" without a question prompt.
` : `For Math questions, set "passage_text" to null.`;

  return `You are an expert SAT question writer. Generate exactly ${count} high-quality, highly intelligent SAT practice questions for the domain "${domain}" (${section} section).

${englishPassageNote}

CRITICAL INSTRUCTIONS FOR QUALITY & INTELLIGENCE:
- **Avoid Repetitive Tropes**: Do not use generic names (Bob, Alice) or overused scenarios (buying apples, simple speed/distance).
- **Be Highly Creative**: Frame questions using realistic scientific contexts, historical data, abstract theoretical concepts, and advanced vocabulary.
- **Deep Complexity**: "Hard" questions must be genuinely difficult, requiring multi-step abstract reasoning, synthesizing information, or recognizing complex patterns—not just tedious arithmetic.
- **Diverse Topics**: Span a wide range of subjects (astrophysics, economics, biology, literature, global history) across the batch.

Requirements:
- Mix of difficulties: roughly 30% easy, 40% medium, 30% hard
- Skills to cover (mix them): ${skills.join(', ')}
- All questions must be 100% mathematically/logically correct
- Each question must have exactly one correct answer among 4 choices
- Explanations must be clear, step-by-step, and accurate
- Hints should guide without giving away the answer
- Do NOT reuse these existing IDs: ${existingIds.slice(0, 20).join(', ')}

Return ONLY a valid JSON array (no markdown, no explanation outside the array). Each object must have exactly these fields:
{
  "id": "unique_id_string",
  "section": "${section}",
  "domain": "${domain}",
  "skill": "skill name from the list above",
  "difficulty": "easy" | "medium" | "hard",
  "question_text": "The question text",
  "passage_text": ${isEnglish ? '"A short passage (3-6 sentences) that the question refers to"' : 'null'},
  "choices": [
    {"label": "A", "text": "...", "is_correct": false},
    {"label": "B", "text": "...", "is_correct": true},
    {"label": "C", "text": "...", "is_correct": false},
    {"label": "D", "text": "...", "is_correct": false}
  ],
  "is_grid_in": 0,
  "grid_in_answer": null,
  "explanation": "Step-by-step explanation of why the correct answer is right",
  "hint_1": "A helpful nudge without giving away the answer",
  "hint_2": "A stronger hint that narrows down the approach",
  "tags": ["tag1", "tag2"],
  "source": "generated"
}

Make sure exactly one choice has is_correct: true. Do not include any text outside the JSON array.`;
}

// Try to extract valid JSON objects from a partial/broken array string
function rescuePartialArray(text) {
  const rescued = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let objStart = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === '{') {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && objStart !== -1) {
        const slice = text.slice(objStart, i + 1);
        try {
          rescued.push(JSON.parse(sanitizeJsonString(slice)));
        } catch {}
        objStart = -1;
      }
    }
  }
  return rescued;
}

// Fix literal control characters that Gemini sometimes embeds inside JSON string values
function sanitizeJsonString(raw) {
  let inString = false;
  let escaped = false;
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    const code = ch.charCodeAt(0);
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\' && inString) {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    if (inString && code < 0x20) {
      // Escape bare control characters inside strings
      if (code === 0x09) out += '\\t';
      else if (code === 0x0a) out += '\\n';
      else if (code === 0x0d) out += '\\r';
      else out += `\\u${code.toString(16).padStart(4, '0')}`;
      continue;
    }
    out += ch;
  }
  return out;
}

async function generateForDomain(domain, section, prefix, existingQuestions, count) {
  const existingIds = existingQuestions.map(q => q.id);
  const existingCount = existingQuestions.filter(q => q.domain === domain).length;

  console.log(`[generate] ${domain}: ${existingCount} existing, generating ${count} more...`);

  const prompt = buildPrompt(domain, section, existingIds, count);

  let text = '';
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      console.log(`[generate] Running agy CLI (attempt ${attempt}/4)...`);
      text = execFileSync('agy', ['-p', prompt], { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 10 });
      break;
    } catch (err) {
      console.error(`[generate] agy error for ${domain}:`, err.message);
      if (attempt < 4) {
        const delay = attempt * 8000;
        console.log(`[generate] retrying in ${delay/1000}s (attempt ${attempt}/4)...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return [];
    }
  }
  
  if (!text) return [];

  text = text.trim();

  // Strip markdown code fences if present
  let jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  // Sanitize: remove literal control characters inside JSON strings (Gemini sometimes embeds them)
  // Strategy: process char by char, escaping control chars that appear inside string values
  jsonText = sanitizeJsonString(jsonText);

  let questions;
  try {
    questions = JSON.parse(jsonText);
  } catch (err) {
    console.error(`[generate] JSON parse error for ${domain}:`, err.message);
    // Try to rescue partial array: extract individual JSON objects
    const rescued = rescuePartialArray(jsonText);
    if (rescued.length > 0) {
      console.log(`[generate] Rescued ${rescued.length} objects from partial JSON for ${domain}`);
      questions = rescued;
    } else {
      console.error('Raw response (first 500 chars):', text.slice(0, 500));
      return [];
    }
  }

  if (!Array.isArray(questions)) {
    console.error(`[generate] Expected array for ${domain}, got:`, typeof questions);
    return [];
  }

  // Assign fresh sequential IDs: find max numeric suffix for this prefix, filtering out NaN
  const numericSuffixes = existingQuestions
    .filter(q => q.id.startsWith(prefix + '_'))
    .map(q => {
      const parts = q.id.split('_');
      const last = parts[parts.length - 1];
      return parseInt(last, 10);
    })
    .filter(n => !isNaN(n));
  const maxIdx = numericSuffixes.length > 0 ? Math.max(...numericSuffixes) : 0;

  const validated = [];
  questions.forEach((q, i) => {
    // Ensure required fields
    if (!q.question_text || !Array.isArray(q.choices) || q.choices.length !== 4) {
      console.warn(`[generate] Skipping malformed question at index ${i} for ${domain}`);
      return;
    }
    const hasCorrect = q.choices.filter(c => c.is_correct === true).length === 1;
    if (!hasCorrect) {
      console.warn(`[generate] Skipping question without exactly one correct answer at index ${i} for ${domain}`);
      return;
    }

    validated.push({
      id: `${prefix}_${String(maxIdx + i + 1).padStart(3, '0')}`,
      section: q.section || section,
      domain: q.domain || domain,
      skill: q.skill || 'General',
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
      question_text: String(q.question_text),
      passage_text: q.passage_text || null,
      choices: q.choices.map((c, ci) => ({
        label: c.label || ['A', 'B', 'C', 'D'][ci],
        text: String(c.text),
        is_correct: Boolean(c.is_correct),
      })),
      is_grid_in: 0,
      grid_in_answer: null,
      explanation: q.explanation || '',
      hint_1: q.hint_1 || '',
      hint_2: q.hint_2 || '',
      tags: Array.isArray(q.tags) ? q.tags : [],
      source: 'generated',
    });
  });

  console.log(`[generate] ${domain}: got ${validated.length} valid questions`);
  return validated;
}

async function main() {
  const targetDomain = process.argv[2] || null;
  const count = parseInt(process.argv[3] || '20', 10);

  let existing = [];
  try {
    existing = JSON.parse(readFileSync(QUESTIONS_PATH, 'utf-8'));
    console.log(`[generate] Loaded ${existing.length} existing questions`);
  } catch {
    console.log('[generate] No existing questions.json, starting fresh');
  }

  const domainsToProcess = targetDomain
    ? DOMAINS.filter(d => d.name.toLowerCase() === targetDomain.toLowerCase())
    : DOMAINS;

  if (domainsToProcess.length === 0) {
    console.error(`[generate] Unknown domain: ${targetDomain}`);
    console.error('Available:', DOMAINS.map(d => d.name).join(', '));
    process.exit(1);
  }

  let allNew = [];
  for (const { name, section, prefix } of domainsToProcess) {
    const newQs = await generateForDomain(name, section, prefix, existing, count);
    allNew = allNew.concat(newQs);
    // Small delay between domains to avoid rate limits
    if (domainsToProcess.length > 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // Merge: deduplicate by ID
  const existingIds = new Set(existing.map(q => q.id));
  const merged = [...existing];
  let added = 0;
  for (const q of allNew) {
    if (!existingIds.has(q.id)) {
      merged.push(q);
      existingIds.add(q.id);
      added++;
    }
  }

  writeFileSync(QUESTIONS_PATH, JSON.stringify(merged, null, 2));
  console.log(`\n[generate] Done. Added ${added} new questions. Total: ${merged.length}`);
  console.log('[generate] Run `node server/ingest.js` to load them into the database.');
}

main().catch(err => {
  console.error('[generate] Fatal:', err);
  process.exit(1);
});
