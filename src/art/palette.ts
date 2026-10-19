/**
 * The shared Codeweald palette: warm, saturated, "cozy-adventurous".
 * Outlines are dark plum/brown rather than pure black.
 *
 * Each colour has a one-character key so sprites can be drawn as text.
 * `'.'` is reserved for transparency and never appears here.
 */
export const PALETTE = {
  K: '#2b1d2e', // outline (dark plum)
  k: '#4a2f2a', // dark brown (ink, text marks)
  n: '#1d1424', // near-black (pupils, deep shadow)
  W: '#fff6e0', // warm white
  w: '#efdcb4', // cream
  G: '#6cbf4a', // grass
  g: '#4a9a3c', // grass shade
  h: '#a6e06a', // grass highlight
  F: '#2f6b3c', // deep foliage
  f: '#3f8f45', // foliage
  P: '#e6c088', // path light
  p: '#c99560', // path mid
  q: '#94643c', // path dark
  B: '#4a98dc', // water
  b: '#2f68b0', // deep water
  c: '#9ad8f2', // water highlight
  A: '#b4e6ff', // pale sky / glass
  R: '#cf5a3e', // terracotta roof
  r: '#93392c', // roof shade
  O: '#f39a45', // orange
  Y: '#f7cd4f', // gold
  y: '#c9972f', // gold shade
  S: '#c2bab0', // stone light
  s: '#918780', // stone mid
  d: '#625868', // stone dark
  T: '#bd7d4c', // wood
  t: '#7d4b30', // wood dark
  M: '#ec6f9c', // pink
  V: '#8c5fcc', // violet
  L: '#cdb0f2', // lavender
  E: '#52d8a6', // mint glow
  N: '#f2dc9e', // sand
  m: '#d6b46e', // sand shade
} as const satisfies Record<string, string>;

export type PaletteKey = keyof typeof PALETTE;

/** The shared palette as a plain record (sprites keep a reference to it). */
export const SHARED_PALETTE: Record<string, string> = PALETTE;
