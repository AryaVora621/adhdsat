import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Renders text with inline math expressions.
 * Supports two syntaxes:
 *   - Explicit: $...$  → inline LaTeX
 *   - Auto-upgraded ASCII: x^2 → x², sqrt(...) → √..., etc.
 */

// Convert ASCII math notation to LaTeX when no $ delimiters are present.
// We only convert the most common SAT math patterns to avoid over-triggering.
function asciiToLatex(text) {
  // Already has LaTeX delimiters -- pass through
  if (text.includes('$')) return text;

  // Fraction: (a/b) surrounded by spaces or at boundaries → \frac{a}{b}
  // Only when both a and b are short algebraic expressions
  let out = text.replace(/\(([^()]+)\/([^()]+)\)/g, (_, num, den) => {
    // Only convert if simple (no nested parens, reasonably short)
    if (num.length < 20 && den.length < 20) {
      return `$\\frac{${num}}{${den}}$`;
    }
    return _; // leave as-is
  });

  // Exponents: x^2, x^{...}, (x+1)^2 etc.
  out = out.replace(/([a-zA-Z0-9_])\^(\{[^}]+\}|[0-9]+|-?[a-zA-Z])/g, (match, base, exp) => {
    const cleanExp = exp.startsWith('{') ? exp.slice(1, -1) : exp;
    return `$${base}^{${cleanExp}}$`;
  });

  // sqrt(x) → √x
  out = out.replace(/sqrt\(([^)]+)\)/g, (_, inner) => `$\\sqrt{${inner}}$`);

  return out;
}

function parseSegments(text) {
  if (!text) return [];

  // asciiToLatex may produce adjacent $a$$b$ spans; the parser handles them correctly as-is
  const processed = asciiToLatex(String(text));

  const segments = [];
  let i = 0;
  while (i < processed.length) {
    const start = processed.indexOf('$', i);
    if (start === -1) {
      segments.push({ type: 'text', content: processed.slice(i) });
      break;
    }
    // Currency: $<digits-only> (e.g. $75, $1,200) is a dollar amount, not a math delimiter.
    // Distinguish from math like $2x+3$ by checking the token after $ is purely numeric.
    // A currency amount is digits (+ commas/periods) followed by a non-alpha char or end.
    const afterDollar = processed.slice(start + 1);
    // Currency: $<digits> immediately followed by whitespace or sentence punctuation.
    // This correctly rejects $2^{3}$ (^ is not punctuation) and $3$ ($ is not punctuation).
    const currencyMatch = afterDollar.match(/^(\d+)(?=\s|[.,;:!?)]|$)/);
    // But a '$<digits>...' can also be a math span that just starts with a number, e.g.
    // $165 = 45 + 30h$ or $1.50c + 0.75p \le 180$. Treat as money only when there is no
    // closing $, or the enclosed span carries no math signal (LaTeX command, a relational/
    // exponent operator, or a coefficient like 30h). Otherwise render it as math.
    const closeIdx = processed.indexOf('$', start + 1);
    const spanInner = closeIdx === -1 ? '' : processed.slice(start + 1, closeIdx);
    const looksMath = closeIdx !== -1 && (/[\\=<>^{]/.test(spanInner) || /\d[a-zA-Z]/.test(spanInner));
    if (currencyMatch && !looksMath) {
      const textSoFar = processed.slice(i, start + 1);
      if (segments.length > 0 && segments[segments.length - 1].type === 'text') {
        segments[segments.length - 1].content += textSoFar;
      } else {
        segments.push({ type: 'text', content: textSoFar });
      }
      i = start + 1;
      continue;
    }
    if (start > i) {
      segments.push({ type: 'text', content: processed.slice(i, start) });
    }
    const end = processed.indexOf('$', start + 1);
    if (end === -1) {
      // Unclosed $ -- treat rest as text
      segments.push({ type: 'text', content: processed.slice(start) });
      break;
    }
    segments.push({ type: 'math', content: processed.slice(start + 1, end) });
    i = end + 1;
  }
  return segments;
}

// Render a plain string as inline text + math nodes (the original behavior).
function renderInline(text, keyBase) {
  return parseSegments(text).map((seg, i) =>
    seg.type === 'math'
      ? renderMathSegment(seg.content, `${keyBase}-${i}`)
      : <span key={`${keyBase}-${i}`}>{seg.content}</span>
  );
}

const isPipeRow = (l) => /^\s*\|.*\|\s*$/.test(l);
// Separator row: only pipes, dashes, colons and spaces, and contains a dash.
const isSeparatorRow = (l) => /-/.test(l) && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(l);

const toCells = (l) =>
  l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

// Split text into text blocks and GitHub-flavored markdown tables (header row +
// dash separator + data rows). Returns a single text block when no table exists,
// so non-table content renders exactly as before.
function splitTableBlocks(text) {
  const lines = String(text).split('\n');
  const blocks = [];
  let buf = [];
  const flush = () => {
    if (buf.length) { blocks.push({ type: 'text', content: buf.join('\n') }); buf = []; }
  };
  let i = 0;
  while (i < lines.length) {
    if (isPipeRow(lines[i]) && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      flush();
      const header = toCells(lines[i]);
      let j = i + 2;
      const body = [];
      while (j < lines.length && isPipeRow(lines[j])) { body.push(toCells(lines[j])); j++; }
      blocks.push({ type: 'table', header, body });
      i = j;
    } else {
      buf.push(lines[i]);
      i++;
    }
  }
  flush();
  return blocks;
}

function renderMathSegment(latex, key) {
  try {
    const html = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
      strict: false,
      trust: false,
    });
    return <span key={key} dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return <code key={key} style={{ fontFamily: 'monospace' }}>{latex}</code>;
  }
}

const cellStyle = {
  border: '1px solid #2a2a46',
  padding: '7px 12px',
  textAlign: 'left',
  fontSize: '0.9em',
  whiteSpace: 'nowrap',
};

function renderTable(block, key) {
  return (
    <div key={key} style={{ overflowX: 'auto', maxWidth: '100%', margin: '12px 0' }}>
      <table style={{ borderCollapse: 'collapse', minWidth: 'min(100%, 280px)' }}>
        <thead>
          <tr>
            {block.header.map((c, ci) => (
              <th key={ci} style={{ ...cellStyle, fontWeight: 700, color: 'var(--primary)', backgroundColor: 'rgba(0,212,255,0.06)' }}>
                {renderInline(c, `h-${ci}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.body.map((row, ri) => (
            <tr key={ri}>
              {row.map((c, ci) => (
                <td key={ci} style={cellStyle}>{renderInline(c, `c-${ri}-${ci}`)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MathText({ children, style, className }) {
  const text = typeof children === 'string' ? children : String(children ?? '');
  const blocks = splitTableBlocks(text);

  // Fast path: no tables -> render inline exactly as before (zero regression risk).
  if (blocks.length === 1 && blocks[0].type === 'text') {
    return (
      <span style={style} className={className}>
        {renderInline(text, 'r')}
      </span>
    );
  }

  // Mixed content: render as a block so tables can sit between text runs.
  return (
    <span style={{ display: 'block', ...style }} className={className}>
      {blocks.map((b, bi) =>
        b.type === 'table'
          ? renderTable(b, `t-${bi}`)
          : <span key={`b-${bi}`} style={{ whiteSpace: 'pre-line' }}>{renderInline(b.content, `b-${bi}`)}</span>
      )}
    </span>
  );
}
