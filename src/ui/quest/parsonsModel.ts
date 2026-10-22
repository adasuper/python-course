// Parsons puzzle rules, kept free of the DOM so they can be unit-tested (docs/specs.md §9.2).
import type { ParsonsSpec } from '../../content/types';
import { t } from '../../i18n/en';

export interface Block {
  /** Index into the puzzle's lines, then its distractors. */
  id: number;
  text: string;
  indent: number;
}

export interface ParsonsLists {
  scraps: Block[];
  spell: Block[];
}

/** Deterministic shuffle, so every student sees the same puzzle (and tests are stable). */
export function shuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  // Never start already solved.
  if (out.every((x, i) => x === items[i]) && out.length > 1) out.push(out.shift()!);
  return out;
}

/** How deep a line is indented, from the spaces written in front of it in the YAML. */
export function lineIndent(line: string): number {
  return Math.floor((line.length - line.trimStart().length) / 4);
}

export function initialBlocks(spec: ParsonsSpec, seed: string): Block[] {
  const all = [...spec.lines, ...spec.distractors].map((line, id) => ({
    id,
    text: spec.indent ? line.trimStart() : line,
    indent: 0,
  }));
  return shuffle(all, seed);
}

/** The blocks a list of line numbers stands for, indented as written (for wrong_solutions). */
export function blocksFor(spec: ParsonsSpec, order: number[]): Block[] {
  const pool = [...spec.lines, ...spec.distractors];
  return order.map((id) => {
    const line = pool[id] ?? '';
    return { id, text: spec.indent ? line.trimStart() : line, indent: spec.indent ? lineIndent(line) : 0 };
  });
}

export function programFrom(spec: ParsonsSpec, spell: Block[]): string {
  const body = spell.map((b) => (spec.indent ? '    '.repeat(b.indent) + b.text : b.text));
  return [...spec.fixedTop, ...body].join('\n') + '\n';
}

/** `check: order`: does the spell match the solution order, or a listed alternative?
 *  Lines are compared by text and indent, so two identical lines may swap places.
 *  `rightPrefix` is how many lines from the top are already right (for the feedback). */
export function checkOrder(spec: ParsonsSpec, spell: Block[]): { ok: boolean; rightPrefix: number } {
  const orders = [spec.lines.map((_, i) => i), ...spec.alternatives];
  let best = 0;
  for (const order of orders) {
    const want = blocksFor(spec, order);
    let k = 0;
    while (k < spell.length && k < want.length && same(spell[k]!, want[k]!, spec.indent)) k++;
    if (k === want.length && spell.length === want.length) return { ok: true, rightPrefix: k };
    best = Math.max(best, k);
  }
  return { ok: false, rightPrefix: best };
}

const same = (a: Block, b: Block, indent: boolean) => a.text === b.text && (!indent || a.indent === b.indent);

/** What Byte says about a wrong order in a `check: order` puzzle. */
export function orderFeedback(rightPrefix: number): string {
  return rightPrefix > 0 ? t.parsons.orderPartly(rightPrefix) : t.parsons.orderWrong;
}
