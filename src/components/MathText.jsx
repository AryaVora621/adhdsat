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

// Merge adjacent $...$ spans so we don't produce $a$$b$ sequences
function mergeDollarSpans(text) {
  return text.replace(/\$([^$]+)\$\s*\$([^$]+)\$/g, (_, a, b) => `$${a} ${b}$`);
}

function parseSegments(text) {
  if (!text) return [];

  // Run ASCII upgrader first, then merge
  const processed = mergeDollarSpans(asciiToLatex(String(text)));

  const segments = [];
  let i = 0;
  while (i < processed.length) {
    const start = processed.indexOf('$', i);
    if (start === -1) {
      segments.push({ type: 'text', content: processed.slice(i) });
      break;
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

export default function MathText({ children, style, className }) {
  const text = typeof children === 'string' ? children : String(children ?? '');
  const segments = parseSegments(text);

  return (
    <span style={style} className={className}>
      {segments.map((seg, i) =>
        seg.type === 'math'
          ? renderMathSegment(seg.content, i)
          : <span key={i}>{seg.content}</span>
      )}
    </span>
  );
}
