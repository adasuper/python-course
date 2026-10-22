// The Parsons keyboard model of docs/specs.md §14.3, as a pure reducer (F-QST-10).
import { describe, expect, it } from 'vitest';
import type { ParsonsSpec } from '../../src/content/types';
import {
  blocksFor,
  checkOrder,
  initialBlocks,
  place,
  pressKey,
  programFrom,
  startPuzzle,
  type Puzzle,
  type PuzzleKey,
} from '../../src/ui/quest/parsonsModel';

const spec: ParsonsSpec = {
  lines: ['gold = 12', 'if gold >= 10:', '    print("pass")', 'else:', '    print("stop")'],
  distractors: ['if gold = 10:'],
  fixedTop: [],
  indent: true,
  check: 'run',
  alternatives: [],
};

/** A puzzle with the scraps in a known order (no shuffle). */
const fresh = (): Puzzle =>
  startPuzzle({ scraps: blocksFor(spec, [0, 1, 2, 3, 4, 5]).map((b) => ({ ...b, indent: 0 })), spell: [] });

function keys(p: Puzzle, ...sequence: PuzzleKey[]) {
  let says: string[] = [];
  for (const key of sequence) {
    const r = pressKey(spec, p, key);
    p = r.puzzle;
    if (r.say) says = [...says, r.say];
  }
  return { p, says };
}

const texts = (p: Puzzle, list: 'scraps' | 'spell') => p.lists[list].map((b) => b.text);

describe('Parsons keyboard model', () => {
  it('moves focus with ↑/↓, Home and End, staying inside the list', () => {
    const { p } = keys(fresh(), 'ArrowDown', 'ArrowDown', 'ArrowUp');
    expect(p.focus).toEqual({ list: 'scraps', index: 1 });
    expect(keys(p, 'End').p.focus.index).toBe(5);
    expect(keys(p, 'End', 'ArrowDown').p.focus.index).toBe(5);
    expect(keys(p, 'Home', 'ArrowUp').p.focus.index).toBe(0);
  });

  it('picks up with Space, moves the held line with ↑/↓, and drops with Space', () => {
    const { p, says } = keys(fresh(), 'ArrowDown', ' ', 'ArrowUp', ' ');
    expect(texts(p, 'scraps').slice(0, 2)).toEqual(['if gold >= 10:', 'gold = 12']);
    expect(p.held).toBeNull();
    expect(says).toEqual([
      'Picked up if gold >= 10:. Position 2 of 6, indent 0.',
      'Position 1 of 6, indent 0.',
      'Dropped. Position 1 of 6, indent 0.',
    ]);
  });

  it('Esc puts a held line back where it was', () => {
    const { p, says } = keys(fresh(), ' ', 'ArrowDown', 'ArrowDown', 'Escape');
    expect(texts(p, 'scraps')).toEqual(texts(fresh(), 'scraps'));
    expect(p.focus).toEqual({ list: 'scraps', index: 0 });
    expect(p.held).toBeNull();
    expect(says.at(-1)).toBe('Put back where it was.');
  });

  it('M moves a line to the other list, and focus follows it', () => {
    const { p, says } = keys(fresh(), 'm');
    expect(texts(p, 'spell')).toEqual(['gold = 12']);
    expect(p.focus).toEqual({ list: 'spell', index: 0 });
    expect(says).toEqual(['Moved to Your spell. Position 1 of 1, indent 0.']);
    const back = keys(p, 'ArrowRight', 'm').p;
    expect(back.lists.scraps.at(-1)).toMatchObject({ text: 'gold = 12', indent: 0 });
  });

  it('←/→ change the indent in the spell (0 to 4), and Tab does too only while a line is held', () => {
    let p = keys(fresh(), 'm').p;
    p = keys(p, 'ArrowRight', 'ArrowRight').p;
    expect(p.lists.spell[0]!.indent).toBe(2);
    p = keys(p, 'ArrowLeft', 'ArrowLeft', 'ArrowLeft').p;
    expect(p.lists.spell[0]!.indent).toBe(0);
    p = keys(p, 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight').p;
    expect(p.lists.spell[0]!.indent).toBe(4);
    // Tab without a held line is not the puzzle's: it moves on through the page.
    expect(pressKey(spec, p, 'Tab').handled).toBe(false);
    const held = keys(p, ' ', 'Shift+Tab').p;
    expect(held.lists.spell[0]!.indent).toBe(3);
    // Lines in the scraps have no indent.
    expect(keys(fresh(), 'ArrowRight').p.lists.scraps[0]!.indent).toBe(0);
  });

  it('solves a whole puzzle from the keyboard', () => {
    let p = fresh();
    // gold = 12 · if … · ⇥print("pass") · else: · ⇥print("stop"); the distractor stays.
    p = keys(p, 'm').p; // gold = 12
    for (const indent of [0, 1, 0, 1]) {
      p = { ...p, focus: { list: 'scraps', index: 0 } };
      p = keys(p, 'm', ...Array<PuzzleKey>(indent).fill('ArrowRight')).p;
    }
    expect(texts(p, 'scraps')).toEqual(['if gold = 10:']);
    expect(programFrom(spec, p.lists.spell)).toBe(
      'gold = 12\nif gold >= 10:\n    print("pass")\nelse:\n    print("stop")\n',
    );
    expect(checkOrder(spec, p.lists.spell).ok).toBe(true);
  });

  it('does nothing harmful on an empty list', () => {
    const empty = startPuzzle({ scraps: [], spell: [] });
    for (const key of [' ', 'm', 'ArrowDown', 'ArrowRight', 'Escape'] as PuzzleKey[])
      expect(pressKey(spec, empty, key).puzzle.lists).toEqual(empty.lists);
  });
});

describe('placing a dragged line', () => {
  const lists = { scraps: blocksFor(spec, [0, 1, 2]), spell: blocksFor(spec, [3]) };
  it('moves inside a list, counting places after the line is lifted out', () => {
    const next = place(lists, { list: 'scraps', index: 0 }, { list: 'scraps', index: 2 });
    expect(next.scraps.map((b) => b.id)).toEqual([1, 2, 0]);
  });
  it('moves between lists with the dropped indent; scraps never keep an indent', () => {
    const next = place(lists, { list: 'scraps', index: 2 }, { list: 'spell', index: 0 }, 3);
    expect(next.spell.map((b) => [b.id, b.indent])).toEqual([
      [2, 3],
      [3, 0],
    ]);
    const back = place(next, { list: 'spell', index: 0 }, { list: 'scraps', index: 99 });
    expect(back.scraps.at(-1)).toMatchObject({ id: 2, indent: 0 });
    expect(place(lists, { list: 'spell', index: 0 }, { list: 'spell', index: 0 }, 9).spell[0]!.indent).toBe(
      4,
    );
  });
  it('shuffles the same way for the same seed, and never starts solved', () => {
    expect(initialBlocks(spec, 'seed-a')).toEqual(initialBlocks(spec, 'seed-a'));
    const two: ParsonsSpec = { ...spec, lines: ['a', 'b'], distractors: [] };
    for (const seed of ['x', 'y', 'z', 'w'])
      expect(initialBlocks(two, seed).map((b) => b.text)).not.toEqual(['a', 'b']);
  });
});
