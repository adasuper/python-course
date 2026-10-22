// Editor behavior for fill quests (docs/specs.md §9.2): ____ gaps are highlighted, and with
// `locked: true` only the lines that held a gap can be changed.
import { Annotation, EditorSelection, EditorState, StateField, type Extension } from '@codemirror/state';
import { Decoration, EditorView, MatchDecorator, ViewPlugin, type DecorationSet } from '@codemirror/view';
import { editableRanges, findGaps } from './gaps';

/** Marks a change that comes from outside the editor (reset, a loaded draft), which may
 *  replace the whole text. */
export const externalChange = Annotation.define<boolean>();

const gapMarks = new MatchDecorator({ regexp: /_{3,}/g, decoration: Decoration.mark({ class: 'cm-gap' }) });

/** Highlights every ____ gap. */
export const gapHighlight: Extension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = gapMarks.createDeco(view);
    }
    update(u: import('@codemirror/view').ViewUpdate) {
      this.decorations = gapMarks.updateDeco(u, this.decorations);
    }
  },
  { decorations: (v) => v.decorations },
);

type Ranges = [number, number][] | null;

/** The editable ranges of a locked fill quest, kept up to date as the text changes. */
export function lockedLines(starter: string, onBlocked: () => void = () => {}): Extension {
  const field = StateField.define<Ranges>({
    create: (state) => editableRanges(starter, state.doc.toString()),
    update(ranges, tr) {
      if (!tr.docChanged) return ranges;
      // Text that replaced everything (or an undo of that) is lined up with the starter again.
      if (tr.annotation(externalChange) || tr.isUserEvent('undo') || tr.isUserEvent('redo'))
        return editableRanges(starter, tr.state.doc.toString());
      // Typing at either edge of a range grows the range.
      return ranges?.map(([from, to]) => [tr.changes.mapPos(from, -1), tr.changes.mapPos(to, 1)]) ?? null;
    },
    provide: (f) =>
      EditorView.decorations.compute([f], (state) => {
        const ranges = state.field(f);
        if (!ranges) return Decoration.none;
        const lines = new Set<number>();
        for (const [from, to] of ranges)
          for (let n = state.doc.lineAt(from).number; n <= state.doc.lineAt(to).number; n++) lines.add(n);
        return Decoration.set(
          [...lines]
            .sort((a, b) => a - b)
            .map((n) => Decoration.line({ class: 'cm-gap-line' }).range(state.doc.line(n).from)),
        );
      }),
  });

  const filter = EditorState.changeFilter.of((tr) => {
    const ranges = tr.startState.field(field);
    if (!ranges || tr.annotation(externalChange) || tr.isUserEvent('undo') || tr.isUserEvent('redo'))
      return true;
    let ok = true;
    tr.changes.iterChangedRanges((fromA, toA) => {
      if (!ranges.some(([from, to]) => fromA >= from && toA <= to)) ok = false;
    });
    if (!ok) onBlocked();
    return ok;
  });

  return [field, filter];
}

/** Selects the next ____ gap after the cursor (wrapping around). Returns its line, or null
 *  when no gaps are left. */
export function selectNextGap(view: EditorView): number | null {
  const gaps = findGaps(view.state.doc.toString());
  if (!gaps.length) return null;
  const head = view.state.selection.main.to;
  const [from, to] = gaps.find(([from]) => from >= head) ?? gaps[0]!;
  view.dispatch({ selection: EditorSelection.single(from, to), scrollIntoView: true });
  view.focus();
  return view.state.doc.lineAt(from).number;
}
