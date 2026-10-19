// The Spellbook: a CodeMirror 6 editor for Python (docs/specs.md §11.5).
// Esc, then Tab, leaves the editor (no keyboard trap); Ctrl+Enter runs the code.
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import {
  bracketMatching,
  defaultHighlightStyle,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
} from '@codemirror/language';
import { lintGutter, setDiagnostics, type Diagnostic } from '@codemirror/lint';
import { Compartment, EditorState, StateEffect, StateField, type Extension } from '@codemirror/state';
import {
  Decoration,
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  type DecorationSet,
} from '@codemirror/view';
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import { t } from '../../i18n/en';

const setReplayLine = StateEffect.define<number | null>();

const replayLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setReplayLine)) {
        const line = effect.value;
        if (line === null || line < 1 || line > tr.state.doc.lines) return Decoration.none;
        const from = tr.state.doc.line(line).from;
        return Decoration.set([Decoration.line({ class: 'cm-replay-line' }).range(from)]);
      }
    }
    return deco.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
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
}

const theme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'var(--code-bg)', color: 'var(--code-fg)' },
  '.cm-content': { fontFamily: 'var(--font-code)', caretColor: 'var(--code-fg)' },
  '.cm-gutters': { backgroundColor: 'var(--code-gutter)', color: 'var(--code-gutter-fg)', border: 'none' },
  '.cm-activeLine': { backgroundColor: 'var(--code-active)' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--code-active)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-replay-line': { backgroundColor: 'var(--code-replay)', boxShadow: 'inset 4px 0 0 var(--accent)' },
});

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
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const callbacks = useRef({ onChange, onRun });
  callbacks.current = { onChange, onRun };
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
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      keymap.of([
        { key: 'Mod-Enter', run: () => (callbacks.current.onRun?.(), true) },
        indentWithTab,
        ...defaultKeymap,
        ...historyKeymap,
      ]),
      replayLineField,
      lintGutter(),
      theme,
      readOnlyConf.current.of([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
      sizeConf.current.of(EditorView.theme({ '.cm-content, .cm-gutters': { fontSize: `${fontSize}px` } })),
      EditorView.contentAttributes.of({
        'aria-label': label ?? t.quest.editorLabel,
        'aria-describedby': 'editor-help',
        ...(id ? { id } : {}),
      }),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) callbacks.current.onChange?.(u.state.doc.toString());
      }),
    ];
    view.current = new EditorView({
      parent: host.current!,
      state: EditorState.create({ doc: value, extensions }),
    });
    return () => view.current?.destroy();
  }, []);

  // Outside changes (reset, hint copy, loading a draft). This must be a layout effect: a
  // normal effect runs after paint, so a stale value could overwrite newer typing and the
  // editor and the state would then flip back and forth forever.
  useLayoutEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({
      effects: readOnlyConf.current.reconfigure([
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
      ]),
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
  }, [error]);

  return <div class="editor" ref={host} />;
}
