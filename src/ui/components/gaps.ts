// Fill quests: ____ gaps and locked lines (docs/specs.md §9.2, F-QST-08). Pure functions,
// so they can be tested without a browser; gapEditor.ts turns them into editor behavior.

export const GAP = /_{3,}/g;

/** Every ____ gap in the code, as [from, to] offsets. */
export function findGaps(code: string): [number, number][] {
  return [...code.matchAll(GAP)].map((m) => [m.index, m.index + m[0].length]);
}

/** In a locked fill quest, the parts of `doc` that may be edited: the lines that held a gap
 *  in the starter, wherever they are now. The starter's other lines must still be there, in
 *  order and unchanged; if they aren't (an old draft, say), this returns null and nothing
 *  is locked. Ranges are [from, to] offsets, `to` at the end of the last line (before its
 *  line break). */
export function editableRanges(starter: string, doc: string): [number, number][] | null {
  const want = starter.split('\n');
  const have = doc.split('\n');
  const starts: number[] = [];
  let offset = 0;
  for (const line of have) {
    starts.push(offset);
    offset += line.length + 1;
  }
  const lineEnd = (i: number) => starts[i]! + have[i]!.length;

  const ranges: [number, number][] = [];
  let next = 0; // the first doc line not matched yet
  let gapOpen = false; // starter lines since the last locked line include a gap
  const closeGap = (until: number) => {
    // Doc lines next..until-1 belong to the gap group just passed.
    if (gapOpen && until > next) ranges.push([starts[next]!, lineEnd(until - 1)]);
    gapOpen = false;
  };
  for (const line of want) {
    if (line.includes('____')) {
      gapOpen = true;
      continue;
    }
    let found = -1;
    if (gapOpen) {
      // The gap may now span any number of lines (at least one).
      for (let i = next + 1; i < have.length; i++) {
        if (have[i] === line) {
          found = i;
          break;
        }
      }
    } else if (have[next] === line) found = next;
    if (found < 0) return null;
    closeGap(found);
    next = found + 1;
  }
  if (gapOpen) {
    if (next >= have.length) return null;
    closeGap(have.length);
  } else if (next !== have.length) return null;
  return ranges;
}
