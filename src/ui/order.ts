// Deterministic orderings for the UI (no imports, so tests can use them directly).

/** 0..n-1 in an order fixed by `seed` (a new seed per attempt gives a new order). */
export function shuffledOrder(n: number, seed: string): number[] {
  const hash = (s: string) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  };
  return [...Array(n).keys()].sort((a, b) => hash(`${seed}:${a}`) - hash(`${seed}:${b}`));
}
