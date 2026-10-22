// The Spellbook: a CodeMirror 6 editor for Python (docs/specs.md §11.5).
// Esc, then Tab, leaves the editor (no keyboard trap); Ctrl+Enter runs the code.
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import { bracketMatching, indentOnInput, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { lintKeymap, setDiagnostics, type Diagnostic } from '@codemirror/lint';
import { Compartment, EditorState, StateEffect, StateField, type Extension } from '@codemirror/state';
import {
  Decoration,
  drawSelection,
  EditorView,
  gutter,
  GutterMarker,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  type DecorationSet,
} from '@codemirror/view';
import type { MutableRef } from 'preact/hooks';
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import { t } from '../../i18n/en';
import { externalChange, gapHighlight, lockedLines } from './gapEditor';
import { spellbookHighlight } from './highlight';

// The line the replay is on, and the line of a run error. Each gets a background and a
// gutter symbol (▶ / ✖), so neither relies on color alone (F-API-10, F-EDT-05).
const setReplayLine = StateEffect.define<number | null>();
const setErrorLine = StateEffect.define<number | null>();

interface Marks {
  replay: number | null;
  error: number | null;
}

const marksField = StateField.define<Marks>({
  create: () => ({ replay: null, error: null }),
  update(marks, tr) {
    let next = marks;
    for (const effect of tr.effects) {
      if (effect.is(setReplayLine)) next = { ...next, replay: effect.value };
      if (effect.is(setErrorLine)) next = { ...next, error: effect.value };
    }
    // Typing moves lines around; an old error mark would point at the wrong line.
    if (tr.docChanged && next.error !== null) next = { ...next, error: null };
    return next;
  },
  provide: (f) =>
    EditorView.decorations.compute([f], (state) => {
      const { replay, error } = state.field(f);
      const ranges = [];
      for (const [line, cls] of [
        [replay, 'cm-replay-line'],
        [error, 'cm-error-line'],
      ] as const) {
        if (line !== null && line >= 1 && line <= state.doc.lines)
          ranges.push(Decoration.line({ class: cls }).range(state.doc.line(line).from));
      }
      return Decoration.set(ranges, true) as DecorationSet;
    }),
});

class SymbolMarker extends GutterMarker {
  constructor(
    readonly symbol: string,
    readonly cls: string,
  ) {
    super();
  }
  override eq(other: GutterMarker) {
    return other instanceof SymbolMarker && other.symbol === this.symbol;
  }
  override toDOM() {
    const span = document.createElement('span');
    span.className = this.cls;
    span.textContent = this.symbol;
    return span;
  }
}
const REPLAY_MARK = new SymbolMarker('▶', 'cm-mark-replay');
const ERROR_MARK = new SymbolMarker('✖', 'cm-mark-error');

const marksGutter = gutter({
  class: 'cm-marks-gutter',
  lineMarker(view, block) {
    const { replay, error } = view.state.field(marksField);
    const n = view.state.doc.lineAt(block.from).number;
    if (n === error) return ERROR_MARK;
    if (n === replay) return REPLAY_MARK;
    return null;
  },
  lineMarkerChange: (u) => u.startState.field(marksField) !== u.state.field(marksField),
  initialSpacer: () => REPLAY_MARK,
});

export interface EditorError {
  line: number | null;
  col: number | null;
  endCol: number | null;
  message: string;
}

interface Props {
  value: string;
  onChange?: (code: string) => void;
  onRun?: () => void;
  readOnly?: boolean;
  fontSize?: number;
  replayLine?: number | null;
  error?: EditorError | null;
  label?: string;
  id?: string;
  /** Fill quests: highlight ____ gaps; with `locked`, only gap lines can change. */
  fill?: { starter: string; locked: boolean } | null;
  /** Called when the student tries to change a locked line. */
  onBlocked?: () => void;
  /** Gives the parent the editor view (for "Next gap"). */
  viewRef?: MutableRef<EditorView | null>;
}

const theme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'var(--code-bg)', color: 'var(--code-fg)' },
  '.cm-content': { fontFamily: 'var(--font-code)', caretColor: 'var(--code-fg)' },
  '.cm-gutters': { backgroundColor: 'var(--code-gutter)', color: 'var(--code-gutter-fg)', border: 'none' },
  '.cm-activeLine': { backgroundColor: 'var(--code-active)' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--code-active)' },
  // The focus ring is drawn around the whole editor (.editor:focus-within in styles.css).
  '&.cm-focused': { outline: 'none' },
  '.cm-replay-line': { backgroundColor: 'var(--code-replay)', boxShadow: 'inset 4px 0 0 var(--accent)' },
  '.cm-error-line': { backgroundColor: 'var(--code-error)' },
  '.cm-marks-gutter .cm-gutterElement': { padding: '0 2px', textAlign: 'center' },
  '.cm-mark-replay': { color: 'var(--accent)' },
  '.cm-mark-error': { color: 'var(--err)', fontWeight: 'bold' },
  '.cm-gap': {
    backgroundColor: 'var(--code-replay)',
    outline: '2px dashed var(--accent)',
    outlineOffset: '-1px',
    borderRadius: '2px',
  },
  '.cm-gap-line': { boxShadow: 'inset 3px 0 0 var(--accent)' },
});

/** Read-only code (predict quests) can't be typed in, but it stays focusable (tabindex 0 is
 *  set for every editor), so a long line that scrolls sideways can still be read by keyboard. */
function readOnlyExtensions(readOnly: boolean): Extension[] {
  return readOnly
    ? [
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        EditorView.contentAttributes.of({ 'aria-readonly': 'true' }),
      ]
    : [EditorState.readOnly.of(false), EditorView.editable.of(true)];
}

export function Editor({
  value,
  onChange,
  onRun,
  readOnly = false,
  fontSize = 16,
  replayLine = null,
  error = null,
  label,
  id,
  fill = null,
  onBlocked,
  viewRef,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const callbacks = useRef({ onChange, onRun, onBlocked });
  callbacks.current = { onChange, onRun, onBlocked };
  const readOnlyConf = useRef(new Compartment());
  const sizeConf = useRef(new Compartment());

  useEffect(() => {
    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      history(),
      drawSelection(),
      indentOnInput(),
      indentUnit.of('    '),
      bracketMatching(),
      python(),
      syntaxHighlighting(spellbookHighlight),
      keymap.of([
        { key: 'Mod-Enter', run: () => (callbacks.current.onRun?.(), true) },
        indentWithTab,
        // Ctrl+Shift+M lists the error under the code, and F8 moves to it.
        ...lintKeymap,
        ...defaultKeymap,
        ...historyKeymap,
      ]),
      marksField,
      marksGutter,
      theme,
      readOnlyConf.current.of(readOnlyExtensions(readOnly)),
      sizeConf.current.of(EditorView.theme({ '.cm-content, .cm-gutters': { fontSize: `${fontSize}px` } })),
      EditorView.contentAttributes.of({
        'aria-label': label ?? t.quest.editorLabel,
        'aria-describedby': 'editor-help',
        // In the tab order even when long code scrolls sideways (axe: scrollable-region-focusable).
        tabindex: '0',
        ...(id ? { id } : {}),
      }),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) callbacks.current.onChange?.(u.state.doc.toString());
      }),
    ];
    if (fill) extensions.push(gapHighlight);
    if (fill?.locked) extensions.push(lockedLines(fill.starter, () => callbacks.current.onBlocked?.()));
    view.current = new EditorView({
      parent: host.current!,
      state: EditorState.create({ doc: value, extensions }),
    });
    if (viewRef) viewRef.current = view.current;
    return () => {
      view.current?.destroy();
      if (viewRef) viewRef.current = null;
    };
  }, []);

  // Outside changes (reset, hint copy, loading a draft). This must be a layout effect: a
  // normal effect runs after paint, so a stale value could overwrite newer typing and the
  // editor and the state would then flip back and forth forever.
  useLayoutEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) {
      v.dispatch({
        changes: { from: 0, to: v.state.doc.length, insert: value },
        annotations: externalChange.of(true),
      });
    }
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({
      effects: readOnlyConf.current.reconfigure(readOnlyExtensions(readOnly)),
    });
  }, [readOnly]);

  useEffect(() => {
    view.current?.dispatch({
      effects: sizeConf.current.reconfigure(
        EditorView.theme({ '.cm-content, .cm-gutters': { fontSize: `${fontSize}px` } }),
      ),
    });
  }, [fontSize]);

  useEffect(() => {
    view.current?.dispatch({ effects: setReplayLine.of(replayLine) });
    if (replayLine && view.current && replayLine <= view.current.state.doc.lines) {
      const pos = view.current.state.doc.line(replayLine).from;
      view.current.dispatch({ effects: EditorView.scrollIntoView(pos, { y: 'nearest' }) });
    }
  }, [replayLine]);

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const diagnostics: Diagnostic[] = [];
    if (error?.line && error.line <= v.state.doc.lines) {
      const line = v.state.doc.line(error.line);
      const from = Math.min(line.to, line.from + Math.max(0, (error.col ?? 1) - 1));
      const to =
        error.endCol && error.endCol > (error.col ?? 0)
          ? Math.min(line.to, line.from + error.endCol - 1)
          : line.to;
      diagnostics.push({
        from: from === to ? line.from : from,
        to: to > from ? to : line.to,
        severity: 'error',
        message: error.message,
      });
    }
    v.dispatch(setDiagnostics(v.state, diagnostics));
    v.dispatch({ effects: setErrorLine.of(error?.line ?? null) });
  }, [error]);

  return <div class="editor" ref={host} />;
}

export const CODE_SIZE_MIN = 12;
export const CODE_SIZE_MAX = 28;

/** A− / A+ buttons for the editor's font size (12–28 px), saved per profile. */
export function CodeSize({ size, onChange }: { size: number; onChange(size: number): void }) {
  const clamp = (n: number) => Math.min(CODE_SIZE_MAX, Math.max(CODE_SIZE_MIN, n));
  return (
    <div class="code-size" role="group" aria-label={t.quest.codeSize}>
      <span aria-hidden="true">{t.quest.codeSize}</span>
      <button
        type="button"
        class="small"
        disabled={size <= CODE_SIZE_MIN}
        onClick={() => onChange(clamp(size - 2))}
      >
        A−<span class="sr-only"> {t.quest.codeSmaller}</span>
      </button>
      <output aria-live="polite">{size} px</output>
      <button
        type="button"
        class="small"
        disabled={size >= CODE_SIZE_MAX}
        onClick={() => onChange(clamp(size + 2))}
      >
        A+<span class="sr-only"> {t.quest.codeBigger}</span>
      </button>
    </div>
  );
}
