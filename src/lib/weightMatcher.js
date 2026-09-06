// Maps a question's domain/skill/tags to your personal 6-bucket + sub-bucket system.
// See audit: counts are comfortable except regression (5 total). This matcher is
// the single source of truth for My Focus / My Drills weighting.

export const MY_BUCKETS = [
  { key: 'sec', label: 'Standard English Conventions', pct: 30, color: '#e8643c' },
  { key: 'math_weak', label: 'Math: transformations, scaling & PSDA', pct: 30, color: '#2e7d6f' },
  { key: 'info', label: 'Reading: inference & evidence', pct: 15, color: '#c98a2e' },
  { key: 'exp', label: 'Expression of Ideas', pct: 10, color: '#6b7bb5' },
  { key: 'math_maint', label: 'Math maintenance', pct: 10, color: '#8a6b9e' },
  { key: 'craft', label: 'Vocabulary / Craft & Structure', pct: 5, color: '#46b79f' },
];

// Sub-weights inside the two 30% buckets (from your table)
export const SEC_SUB = [
  { key: 'boundaries', label: 'Sentence boundaries / punctuation', pct: 40, test: q => hasSkill(q, /boundary|boundaries|punctuation|form\/structure.*sense|possessive|apostrophe/) || hasTag(q, /punctuation|boundary|comma|semicolon|colon|apostrophe/) },
  { key: 'sva', label: 'Subject-verb + verb forms', pct: 35, test: q => hasSkill(q, /subject-verb|verb tense|verb|agreement/) || hasTag(q, /subject-verb|verb|agreement|tense/) },
  { key: 'modifiers', label: 'Modifiers / pronouns', pct: 15, test: q => hasSkill(q, /modifier|pronoun/) || hasTag(q, /modifier|pronoun|dangling/) },
  { key: 'sec_mixed', label: 'Mixed grammar', pct: 10, test: () => true },
];

export const MATH_WEAK_SUB = [
  { key: 'percentages', label: 'Percentages', pct: 25, test: q => hasSkill(q, /percentage|percent/) || hasTag(q, /percentage|percent/) },
  { key: 'ratios', label: 'Ratios / proportions', pct: 20, test: q => hasSkill(q, /ratio|proportion/) || hasTag(q, /\bratio|proport/) },
  { key: 'transforms', label: 'Function transformations', pct: 20, test: q => hasSkill(q, /nonlinear function|function notation|composition|quadratic.*vertex|exponential/) || hasTag(q, /transform|shift|vertex|function/) },
  { key: 'stats', label: 'Statistics / means', pct: 15, test: q => hasSkill(q, /statistics: mean|interpreting data|probability/) || hasTag(q, /mean|median|statistic|probability/) },
  { key: 'regression', label: 'Regression / scatterplots', pct: 10, test: q => hasSkill(q, /scatter/) || hasTag(q, /scatter|correlation|regression/) },
  { key: 'scaling', label: 'Area / volume scaling', pct: 10, test: q => hasSkill(q, /area and volume|similar triangle|area|volume|circle/) || hasTag(q, /area|volume|scale|similar|circle/) },
];

function hasTag(q, re) {
  const tags = q.tags ? (typeof q.tags === 'string' ? JSON.parse(q.tags) : q.tags) : [];
  return Array.isArray(tags) && tags.some(t => re.test(String(t).toLowerCase()));
}
function hasSkill(q, re) {
  return re.test(String(q.skill || '').toLowerCase());
}

// Returns bucket key for a question. Order matters: SEC first captures grammar,
// then PSDA-derived weaknesses, then the rest. Math maint is fallback for math.
export function bucketFor(q) {
  const domain = q.domain || '';
  if (domain === 'Standard English Conventions') return 'sec';
  if (domain === 'Information & Ideas') return 'info';
  if (domain === 'Expression of Ideas') return 'exp';
  if (domain === 'Craft & Structure') return 'craft';
  // Math
  if (domain === 'Problem Solving & Data Analysis') {
    // PSDA is always the weakness bucket except when it's thin coverage fallback
    return 'math_weak';
  }
  if (domain === 'Geometry & Trig' && (hasSkill(q, /area and volume|similar|circle/) || hasTag(q, /area|volume|scale|similar/))) {
    return 'math_weak';
  }
  if (domain === 'Advanced Math' && (hasSkill(q, /nonlinear function|exponential|quadratic.*vertex/) || hasTag(q, /transform|vertex/))) {
    return 'math_weak';
  }
  // remaining math -> maintenance
  if (['Algebra', 'Advanced Math', 'Geometry & Trig'].includes(domain)) return 'math_maint';
  return 'math_maint';
}

export function subBucketFor(q, bucketKey) {
  if (bucketKey === 'sec') {
    for (const s of SEC_SUB) if (s.test(q)) return s.key;
    return 'sec_mixed';
  }
  if (bucketKey === 'math_weak') {
    for (const s of MATH_WEAK_SUB) if (s.test(q)) return s.key;
    return 'scaling';
  }
  return null;
}

// Default study_weights JSON for seeding. Percentages sum to 100.
// Stored in adhdsat.users.study_weights as TEXT JSON.
export const DEFAULT_STUDY_WEIGHTS = {
  version: 1,
  buckets: { sec: 30, math_weak: 30, info: 15, exp: 10, math_maint: 10, craft: 5 },
  sec_sub: { boundaries: 40, sva: 35, modifiers: 15, sec_mixed: 10 },
  math_weak_sub: { percentages: 25, ratios: 20, transforms: 20, stats: 15, regression: 10, scaling: 10 },
};

// Draw a bucket key weighted by buckets map {sec:30,...}. Deterministic-ish but random.
export function drawBucket(weights = DEFAULT_STUDY_WEIGHTS.buckets) {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  let r = Math.random() * total;
  for (const [k, v] of entries) {
    r -= v;
    if (r <= 0) return k;
  }
  return entries[0][0];
}
export function drawSubBucket(bucketKey, weights = DEFAULT_STUDY_WEIGHTS) {
  const table = bucketKey === 'sec' ? SEC_SUB : bucketKey === 'math_weak' ? MATH_WEAK_SUB : null;
  if (!table) return null;
  const subWeights = bucketKey === 'sec' ? weights.sec_sub : weights.math_weak_sub;
  const total = table.reduce((s, entry) => s + (subWeights[entry.key] || 0), 0);
  let r = Math.random() * total;
  for (const entry of table) {
    r -= (subWeights[entry.key] || 0);
    if (r <= 0) return entry.key;
  }
  return table[0].key;
}
