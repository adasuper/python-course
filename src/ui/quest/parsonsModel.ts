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

// ----- the puzzle as the student works on it (§14.3) ------------------------------

export type ListName = keyof ParsonsLists;
export const MAX_INDENT = 4;

export interface Puzzle {
  lists: ParsonsLists;
  /** The line that has keyboard focus. */
  focus: { list: ListName; index: number };
  /** A picked-up line, and the lists as they were, so Esc can put everything back. */
  held: { id: number; before: ParsonsLists; beforeFocus: Puzzle['focus'] } | null;
}

export function startPuzzle(lists: ParsonsLists): Puzzle {
  return { lists, focus: { list: lists.scraps.length ? 'scraps' : 'spell', index: 0 }, held: null };
}

const other = (list: ListName): ListName => (list === 'spell' ? 'scraps' : 'spell');
const listName = (list: ListName) => (list === 'spell' ? t.parsons.yourSpell : t.parsons.scraps);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Moves the line at `from` to `to` (another place in the same list, or the other list).
 *  Lines in the scraps never keep an indent. */
export function place(
  lists: ParsonsLists,
  from: { list: ListName; index: number },
  to: { list: ListName; index: number },
  indent?: number,
): ParsonsLists {
  const source = [...lists[from.list]];
  const [block] = source.splice(from.index, 1);
  if (!block) return lists;
  const next = { ...lists, [from.list]: source };
  const target = from.list === to.list ? source : [...lists[to.list]];
  const at = clamp(to.index, 0, target.length);
  const level = to.list === 'scraps' ? 0 : clamp(indent ?? block.indent, 0, MAX_INDENT);
  target.splice(at, 0, { ...block, indent: level });
  return { ...next, [to.list]: target };
}

export type PuzzleKey =
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Home'
  | 'End'
  | 'Tab'
  | 'Shift+Tab'
  | ' '
  | 'Enter'
  | 'Escape'
  | 'm';

export interface KeyResult {
  puzzle: Puzzle;
  /** What to announce to screen readers, if anything. */
  say?: string;
  /** False when the key isn't the puzzle's (Tab without a held line leaves the list). */
  handled: boolean;
}

/** The whole keyboard model of §14.3, as a pure function. */
export function pressKey(spec: ParsonsSpec, p: Puzzle, key: PuzzleKey): KeyResult {
  const { list, index } = p.focus;
  const items = p.lists[list];
  const block = items[index];
  const at = (lists: ParsonsLists, l: ListName, i: number, held = p.held): Puzzle => ({
    lists,
    focus: { list: l, index: i },
    held,
  });
  const position = (pz: Puzzle) => {
    const b = pz.lists[pz.focus.list][pz.focus.index]!;
    return t.parsons.moved(pz.focus.index + 1, pz.lists[pz.focus.list].length, b.indent);
  };

  switch (key) {
    case 'ArrowUp':
    case 'ArrowDown': {
      const delta = key === 'ArrowUp' ? -1 : 1;
      if (!p.held)
        return { puzzle: at(p.lists, list, clamp(index + delta, 0, items.length - 1)), handled: true };
      const target = index + delta;
      if (target < 0 || target >= items.length) return { puzzle: p, handled: true };
      const moved = at(place(p.lists, p.focus, { list, index: target }), list, target);
      return { puzzle: moved, say: position(moved), handled: true };
    }
    case 'Home':
    case 'End':
      if (p.held) return { puzzle: p, handled: true };
      return { puzzle: at(p.lists, list, key === 'Home' ? 0 : Math.max(0, items.length - 1)), handled: true };
    case 'Tab':
    case 'Shift+Tab':
      // Without a held line, Tab moves on through the page (no keyboard trap). With one,
      // Tab and Shift+Tab change its indent, like ← and →.
      if (!p.held) return { puzzle: p, handled: false };
      return pressKey(spec, p, key === 'Tab' ? 'ArrowRight' : 'ArrowLeft');
    case 'ArrowLeft':
    case 'ArrowRight': {
      if (!block || list !== 'spell' || !spec.indent) return { puzzle: p, handled: true };
      const delta = key === 'ArrowLeft' ? -1 : 1;
      const level = clamp(block.indent + delta, 0, MAX_INDENT);
      const spell = items.map((b, i) => (i === index ? { ...b, indent: level } : b));
      const moved = at({ ...p.lists, spell }, list, index);
      return { puzzle: moved, say: position(moved), handled: true };
    }
    case ' ':
    case 'Enter':
      if (!block) return { puzzle: p, handled: true };
      if (p.held)
        return {
          puzzle: { ...p, held: null },
          say: `${t.parsons.dropped} ${position(p)}`,
          handled: true,
        };
      return {
        puzzle: { ...p, held: { id: block.id, before: p.lists, beforeFocus: p.focus } },
        say: t.parsons.picked(block.text, index + 1, items.length, block.indent),
        handled: true,
      };
    case 'Escape':
      if (!p.held) return { puzzle: p, handled: false };
      return {
        puzzle: { lists: p.held.before, focus: p.held.beforeFocus, held: null },
        say: t.parsons.cancelled,
        handled: true,
      };
    case 'm': {
      if (!block) return { puzzle: p, handled: true };
      const to = other(list);
      const end = p.lists[to].length;
      const moved = at(place(p.lists, p.focus, { list: to, index: end }), to, end);
      return {
        puzzle: moved,
        say: `${t.parsons.movedTo(listName(to))} ${position(moved)}`,
        handled: true,
      };
    }
  }
}
