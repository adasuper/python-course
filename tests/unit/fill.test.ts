// Fill quests: gaps and locked lines in the editor (docs/specs.md §9.2, F-QST-08).
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { editableRanges, findGaps } from '../../src/ui/components/gaps';
import { externalChange, lockedLines } from '../../src/ui/components/gapEditor';

const STARTER = 'a = 1\nb = ____\nprint(a + b)\n';

describe('gaps', () => {
  it('finds every ____ gap', () => {
    expect(findGaps('x = ____\nif x ____ 3:\n    ____')).toEqual([
      [4, 8],
      [14, 18],
      [26, 30],
    ]);
    expect(findGaps('x = 1')).toEqual([]);
  });
});

describe('editableRanges', () => {
  it('is the gap lines of the starter itself', () => {
    expect(editableRanges(STARTER, STARTER)).toEqual([[6, 14]]);
  });

  it('follows a filled gap, even one that grew to several lines', () => {
    const doc = 'a = 1\nb = 2\nc = 3\nprint(a + b)\n';
    const ranges = editableRanges(STARTER, doc)!;
    expect(ranges.map(([f, t]) => doc.slice(f, t))).toEqual(['b = 2\nc = 3']);
  });

  it('handles gaps at the very start and end', () => {
    const starter = '____\nx = 1\n____';
    expect(editableRanges(starter, 'y = 2\nx = 1\nprint(x)')!.map(([f, t]) => [f, t])).toEqual([
      [0, 5],
      [12, 20],
    ]);
  });

  it('is null when a locked line changed (nothing is locked then)', () => {
    expect(editableRanges(STARTER, 'a = 9\nb = 2\nprint(a + b)\n')).toBeNull();
    expect(editableRanges(STARTER, 'a = 1\nb = 2\n')).toBeNull();
    expect(editableRanges(STARTER, 'a = 1\nb = 2\nprint(a + b)\nextra\n')).toBeNull();
  });
});

describe('locked lines in the editor', () => {
  const make = () => {
    let blocked = 0;
    const state = EditorState.create({ doc: STARTER, extensions: [lockedLines(STARTER, () => blocked++)] });
    return { state, blocked: () => blocked };
  };
  const type = (s: EditorState, from: number, to: number, insert: string) =>
    s.update({ changes: { from, to, insert }, userEvent: 'input' }).state;

  it('lets the student fill a gap', () => {
    const { state, blocked } = make();
    const at = STARTER.indexOf('____');
    const next = type(state, at, at + 4, '2');
    expect(next.doc.toString()).toBe('a = 1\nb = 2\nprint(a + b)\n');
    expect(blocked()).toBe(0);
  });

  it('refuses changes to locked lines, and says so', () => {
    const { state, blocked } = make();
    expect(type(state, 0, 1, 'z').doc.toString()).toBe(STARTER);
    // Joining the gap line with the next (locked) line is a change to that line too.
    const end = state.doc.line(2).to;
    expect(type(state, end, end + 1, '').doc.toString()).toBe(STARTER);
    expect(type(state, 0, 0, '# note\n').doc.toString()).toBe(STARTER);
    expect(blocked()).toBe(3);
  });

  it('grows the gap when the student adds lines to it', () => {
    const { state } = make();
    const end = state.doc.line(2).to;
    let s = type(state, end, end, '\nc = 3');
    s = type(s, s.doc.line(3).to, s.doc.line(3).to, ' + 1');
    expect(s.doc.toString()).toBe('a = 1\nb = ____\nc = 3 + 1\nprint(a + b)\n');
  });

  it('accepts outside changes (reset, a loaded draft) and lines up with them again', () => {
    const { state } = make();
    const draft = 'a = 1\nb = 40\nprint(a + b)\n';
    let s = state.update({
      changes: { from: 0, to: state.doc.length, insert: draft },
      annotations: externalChange.of(true),
    }).state;
    expect(s.doc.toString()).toBe(draft);
    s = type(s, s.doc.line(2).to, s.doc.line(2).to, '0');
    expect(s.doc.toString()).toBe('a = 1\nb = 400\nprint(a + b)\n');
    expect(type(s, 0, 1, 'z').doc.toString()).toBe(s.doc.toString());
  });
});
