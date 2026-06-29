/**
 * Audits every question for rendering problems by replicating MathText's
 * currency-aware $...$ parser and running each math segment through KaTeX with
 * throwOnError. Also flags raw LaTeX commands left OUTSIDE math (render literally).
 * Read-only: reports problems, changes nothing.
 */
import katex from 'katex';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const all = JSON.parse(readFileSync(path.join(__dirname, 'data', 'questions.json'), 'utf-8'));

// Mirror of MathText.parseSegments (currency-aware) -> returns {math:[], textOut: string}
function segments(text) {
  const processed = String(text || '');
  const math = [];
  const textRuns = [];
  let i = 0;
  while (i < processed.length) {
    const start = processed.indexOf('$', i);
    if (start === -1) { textRuns.push(processed.slice(i)); break; }
    const afterDollar = processed.slice(start + 1);
    const currencyMatch = afterDollar.match(/^(\d+)(?=\s|[.,;:!?)]|$)/);
    const closeIdx = processed.indexOf('$', start + 1);
    const spanInner = closeIdx === -1 ? '' : processed.slice(start + 1, closeIdx);
    const looksMath = closeIdx !== -1 && (/[\\=<>^{]/.test(spanInner) || /\d[a-zA-Z]/.test(spanInner));
    if (currencyMatch && !looksMath) { textRuns.push(processed.slice(i, start + 1)); i = start + 1; continue; }
    if (start > i) textRuns.push(processed.slice(i, start));
    const end = processed.indexOf('$', start + 1);
    if (end === -1) { textRuns.push(processed.slice(start)); return { math, textOut: textRuns.join(''), unclosed: true }; }
    math.push(processed.slice(start + 1, end));
    i = end + 1;
  }
  return { math, textOut: textRuns.join(''), unclosed: false };
}

const RAW_LATEX = /\\(frac|sqrt|times|cdot|sum|int|alpha|beta|theta|pi|geq|leq|neq|pm|div|circ|degree)\b/;

const fields = (q) => [
  ['question', q.question_text], ['passage', q.passage_text], ['explanation', q.explanation],
  ['hint1', q.hint_1], ['hint2', q.hint_2],
  ...(q.choices || []).map((c, i) => [`choice${c.label || i}`, c.text]),
].filter(([, v]) => typeof v === 'string' && v);

const problems = { katexError: [], rawLatexOutside: [], unclosedDollar: [] };

for (const q of all) {
  for (const [field, text] of fields(q)) {
    const { math, textOut, unclosed } = segments(text);
    if (unclosed) problems.unclosedDollar.push(`${q.id}.${field}`);
    if (RAW_LATEX.test(textOut)) problems.rawLatexOutside.push(`${q.id}.${field}`);
    for (const m of math) {
      try { katex.renderToString(m, { throwOnError: true, strict: false }); }
      catch (e) { problems.katexError.push(`${q.id}.${field}: "${m.slice(0, 40)}" -> ${e.message.split('\n')[0].slice(0, 60)}`); break; }
    }
  }
}

console.log('Audited', all.length, 'questions.');
for (const [k, v] of Object.entries(problems)) {
  console.log(`\n${k}: ${v.length}`);
  v.slice(0, 12).forEach(x => console.log('  ' + x));
}
