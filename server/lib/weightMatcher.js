export const MY_BUCKETS = [
  { key: 'sec', label: 'Standard English Conventions', pct: 30, domains: ['Standard English Conventions'] },
  { key: 'math_weak', label: 'Math: transformations, scaling & PSDA', pct: 30, domains: ['Problem Solving & Data Analysis', 'Advanced Math', 'Geometry & Trig'] },
  { key: 'info', label: 'Reading: inference & evidence', pct: 15, domains: ['Information & Ideas'] },
  { key: 'exp', label: 'Expression of Ideas', pct: 10, domains: ['Expression of Ideas'] },
  { key: 'math_maint', label: 'Math maintenance', pct: 10, domains: ['Algebra', 'Advanced Math', 'Geometry & Trig'] },
  { key: 'craft', label: 'Vocabulary / Craft & Structure', pct: 5, domains: ['Craft & Structure'] },
];

export const DEFAULT_WEIGHTS = {
  version: 1,
  buckets: { sec: 30, math_weak: 30, info: 15, exp: 10, math_maint: 10, craft: 5 },
  sec_sub: { boundaries: 40, sva: 35, modifiers: 15, sec_mixed: 10 },
  math_weak_sub: { percentages: 25, ratios: 20, transforms: 20, stats: 15, regression: 10, scaling: 10 },
};

function hasTag(q, re) {
  const tags = q.tags ? (typeof q.tags === 'string' ? JSON.parse(q.tags) : q.tags) : [];
  return Array.isArray(tags) && tags.some(t => re.test(String(t).toLowerCase()));
}
function hasSkill(q, re) { return re.test(String(q.skill || '').toLowerCase()); }

export const SEC_SUB = [
  { key: 'boundaries', test: q => hasSkill(q, /boundary|boundaries|punctuation|form\/structure.*sense|possessive|apostrophe/) || hasTag(q, /punctuation|boundary|comma|semicolon|colon|apostrophe/) },
  { key: 'sva', test: q => hasSkill(q, /subject-verb|verb tense|verb|agreement/) || hasTag(q, /subject-verb|verb|agreement|tense/) },
  { key: 'modifiers', test: q => hasSkill(q, /modifier|pronoun/) || hasTag(q, /modifier|pronoun|dangling/) },
  { key: 'sec_mixed', test: () => true },
];
export const MATH_WEAK_SUB = [
  { key: 'percentages', test: q => hasSkill(q, /percentage|percent/) || hasTag(q, /percentage|percent/) },
  { key: 'ratios', test: q => hasSkill(q, /ratio|proportion/) || hasTag(q, /\bratio|proport/) },
  { key: 'transforms', test: q => hasSkill(q, /nonlinear function|function notation|composition|quadratic.*vertex|exponential/) || hasTag(q, /transform|shift|vertex|function/) },
  { key: 'stats', test: q => hasSkill(q, /statistics: mean|interpreting data|probability/) || hasTag(q, /mean|median|statistic|probability/) },
  { key: 'regression', test: q => hasSkill(q, /scatter/) || hasTag(q, /scatter|correlation|regression/) },
  { key: 'scaling', test: q => hasSkill(q, /area and volume|similar triangle|area|volume|circle/) || hasTag(q, /area|volume|scale|similar|circle/) },
];

export function bucketFor(q) {
  const d = q.domain || '';
  if (d === 'Standard English Conventions') return 'sec';
  if (d === 'Information & Ideas') return 'info';
  if (d === 'Expression of Ideas') return 'exp';
  if (d === 'Craft & Structure') return 'craft';
  if (d === 'Problem Solving & Data Analysis') return 'math_weak';
  if (d === 'Geometry & Trig' && (hasSkill(q, /area and volume|similar|circle/) || hasTag(q, /area|volume|scale|similar/))) return 'math_weak';
  if (d === 'Advanced Math' && (hasSkill(q, /nonlinear function|exponential|quadratic.*vertex/) || hasTag(q, /transform|vertex/))) return 'math_weak';
  if (['Algebra', 'Advanced Math', 'Geometry & Trig'].includes(d)) return 'math_maint';
  return 'math_maint';
}
export function subBucketFor(q, bucketKey) {
  if (bucketKey === 'sec') { for (const s of SEC_SUB) if (s.test(q)) return s.key; return 'sec_mixed'; }
  if (bucketKey === 'math_weak') { for (const s of MATH_WEAK_SUB) if (s.test(q)) return s.key; return 'scaling'; }
  return null;
}
export function drawBucket(weights = DEFAULT_WEIGHTS.buckets) {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  let r = Math.random() * total;
  for (const [k, v] of entries) { r -= v; if (r <= 0) return k; }
  return entries[0][0];
}
export function drawSubBucket(bucketKey, weights = DEFAULT_WEIGHTS) {
  const table = bucketKey === 'sec' ? SEC_SUB : bucketKey === 'math_weak' ? MATH_WEAK_SUB : null;
  if (!table) return null;
  const subWeights = bucketKey === 'sec' ? weights.sec_sub : weights.math_weak_sub;
  const total = table.reduce((s, e) => s + (subWeights[e.key] || 0), 0);
  let r = Math.random() * total;
  for (const e of table) { r -= (subWeights[e.key] || 0); if (r <= 0) return e.key; }
  return table[0].key;
}
export function domainsForBucket(key) {
  const b = MY_BUCKETS.find(x => x.key === key);
  return b ? b.domains : [];
}
