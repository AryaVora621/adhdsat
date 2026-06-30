// Field Notes design tokens for the ad compositions. Mirrors the app's light
// (paper) palette since ads read best on warm cream, not the dark workspace.

export const fn = {
  paper: '#FBF7F0',
  paperDeep: '#F3ECDF',
  card: '#FFFDF8',
  ink: '#2A2622',
  inkSoft: '#6B6258',
  terra: '#E8643C',
  terraDeep: '#CF522D',
  teal: '#2E7D6F',
  gold: '#F2B705',
  error: '#D8472F',
  border: '#E0D6C5',
} as const;

// Hard offset shadow — the signature risograph "sticker" look.
export const offsetShadow = (px = 6, color = fn.ink) => `${px}px ${px}px 0 ${color}`;

// Organic, slightly irregular corners.
export const orgRadius = '18px 22px 16px 20px';

export const font = {
  display: 'Bricolage Grotesque',
  body: 'Spline Sans',
  hand: 'Caveat',
} as const;
