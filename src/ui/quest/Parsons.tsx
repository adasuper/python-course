// Accessible Parsons puzzle (docs/specs.md §14.3). Two listboxes, "Spell scraps" and "Your
// spell". The keyboard model is the pure `pressKey` in parsonsModel.ts. Mouse and touch users
// can drag lines, or use the ▲ ▼ ◀ ▶ ⇄ buttons on each line. The same buttons, for the
// selected line, sit below the lists for switch and voice-control users (the per-line copies
// are hidden from assistive technology, since an option can't contain buttons).
import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ParsonsSpec } from '../../content/types';
import { t } from '../../i18n/en';
import { announce } from '../../state/store';
import {
  initialBlocks,
  MAX_INDENT,
  place,
  pressKey,
  type Block,
  type ListName,
  type ParsonsLists,
  type Puzzle,
  type PuzzleKey,
} from './parsonsModel';

const LISTS: ListName[] = ['scraps', 'spell'];
const listTitle = (list: ListName) => (list === 'spell' ? t.parsons.yourSpell : t.parsons.scraps);
/** A drag must move this far (px) before it counts, so a click stays a click. */
const DRAG_START = 6;

function toPuzzleKey(e: KeyboardEvent): PuzzleKey | null {
  if (e.ctrlKey || e.altKey || e.metaKey) return null;
  if (e.key === 'Tab') return e.shiftKey ? 'Shift+Tab' : 'Tab';
  if (e.key === 'M' || e.key === 'm') return 'm';
  const keys: PuzzleKey[] = [
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Home',
    'End',
    ' ',
    'Enter',
    'Escape',
  ];
  return keys.includes(e.key as PuzzleKey) ? (e.key as PuzzleKey) : null;
}

/** Keeps the focus on a line that exists, e.g. after the last line left a list. */
function settle(lists: ParsonsLists, focus: Puzzle['focus']): Puzzle['focus'] {
  const own = lists[focus.list];
  if (own.length) return { list: focus.list, index: Math.min(focus.index, own.length - 1) };
  const list = focus.list === 'spell' ? 'scraps' : 'spell';
  return { list, index: 0 };
}

interface DragState {
  id: number;
  from: { list: ListName; index: number };
  startX: number;
  startY: number;
  /** Where in the line the pointer grabbed it, so the drop indent follows the line's left edge. */
  grabX: number;
  grabY: number;
  width: number;
  started: boolean;
  to: { list: ListName; index: number; indent: number } | null;
}

export function Parsons({
  spec,
  seed,
  state,
  onChange,
}: {
  spec: ParsonsSpec;
  seed: string;
  state: ParsonsLists | null;
  onChange(next: ParsonsLists): void;
}) {
  const start = useMemo(() => ({ scraps: initialBlocks(spec, seed), spell: [] as Block[] }), [spec, seed]);
  const lists = state ?? start;
  const [focusState, setFocus] = useState<Puzzle['focus']>({ list: 'scraps', index: 0 });
  const [held, setHeld] = useState<Puzzle['held']>(null);
  const [dragView, setDragView] = useState<{
    block: Block;
    x: number;
    y: number;
    to: DragState['to'];
  } | null>(null);
  const focus = settle(lists, focusState);
  const puzzle: Puzzle = { lists, focus, held };
  const refs = useRef(new Map<number, HTMLElement>());
  const listRefs = useRef<Partial<Record<ListName, HTMLUListElement | null>>>({});
  const moveFocus = useRef(false);
  const drag = useRef<DragState | null>(null);

  // After a keyboard move, the moved line keeps the keyboard focus. A layout effect, so the
  // focus is there before the next key press (a normal effect waits for the next frame).
  useLayoutEffect(() => {
    if (!moveFocus.current) return;
    const block = lists[focus.list][focus.index];
    if (!block) return;
    moveFocus.current = false;
    refs.current.get(block.id)?.focus();
  });

  const apply = (next: Puzzle, say?: string, follow = true) => {
    if (next.lists !== lists) onChange(next.lists);
    setFocus(next.focus);
    setHeld(next.held);
    if (say) announce(say);
    moveFocus.current = follow;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const key = toPuzzleKey(e);
    if (!key) return;
    const result = pressKey(spec, puzzle, key);
    if (!result.handled) return;
    e.preventDefault();
    apply(result.puzzle, result.say);
  };

  /** The buttons (on a line, or below the lists) act like the keys, without picking up. */
  const button = (at: Puzzle['focus'], key: PuzzleKey, follow: boolean) => {
    const base: Puzzle = { lists, focus: at, held: null };
    const picked = key === 'ArrowUp' || key === 'ArrowDown' ? pressKey(spec, base, ' ').puzzle : base;
    const result = pressKey(spec, picked, key);
    apply({ ...result.puzzle, held: null }, result.say, follow);
  };

  // ----- dragging with a mouse or a finger -----

  const dropTarget = (x: number, y: number, d: DragState): DragState['to'] => {
    const rects = LISTS.map((list) => ({ list, rect: listRefs.current[list]?.getBoundingClientRect() }));
    const inside = rects.find(({ rect }) => rect && x >= rect.left && x <= rect.right);
    const nearest =
      inside ??
      rects
        .filter((r) => r.rect)
        .sort(
          (a, b) =>
            Math.abs(x - (a.rect!.left + a.rect!.right) / 2) -
            Math.abs(x - (b.rect!.left + b.rect!.right) / 2),
        )[0];
    if (!nearest?.rect) return null;
    const ul = listRefs.current[nearest.list]!;
    let index = 0;
    for (const li of ul.querySelectorAll<HTMLElement>('li[data-id]')) {
      if (Number(li.dataset.id) === d.id) continue;
      const r = li.getBoundingClientRect();
      if (y > r.top + r.height / 2) index++;
    }
    let indent = 0;
    if (nearest.list === 'spell' && spec.indent) {
      const step = 2 * parseFloat(getComputedStyle(document.documentElement).fontSize);
      indent = Math.max(0, Math.min(MAX_INDENT, Math.round((x - d.grabX - nearest.rect.left) / step)));
    }
    return { list: nearest.list, index, indent };
  };

  const onPointerDown = (e: PointerEvent, list: ListName, index: number, block: Block) => {
    if (e.button !== 0) return;
    const rect = (e.currentTarget as HTMLElement).closest('li')!.getBoundingClientRect();
    drag.current = {
      id: block.id,
      from: { list, index },
      startX: e.clientX,
      startY: e.clientY,
      // The line's left edge includes its indent, so the drop indent follows where it's held.
      grabX: e.clientX - rect.left,
      grabY: e.clientY - rect.top,
      width: rect.width,
      started: false,
      to: null,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (!d.started && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_START) return;
    d.started = true;
    if (held) setHeld(null);
    d.to = dropTarget(e.clientX, e.clientY, d);
    const block = lists[d.from.list][d.from.index]!;
    setDragView({ block, x: e.clientX, y: e.clientY, to: d.to });
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    setDragView(null);
    if (!d?.started || !d.to) return;
    const next = place(lists, d.from, d.to, d.to.indent);
    const at = { list: d.to.list, index: Math.min(d.to.index, next[d.to.list].length - 1) };
    const block = next[at.list][at.index]!;
    apply(
      { lists: next, focus: at, held: null },
      `${t.parsons.movedTo(listTitle(at.list))} ${t.parsons.moved(at.index + 1, next[at.list].length, block.indent)}`,
    );
  };

  // ----- rendering -----

  const label = (b: Block, list: ListName) =>
    [
      b.text,
      list === 'spell' && spec.indent ? t.parsons.indent(b.indent) : '',
      held?.id === b.id ? t.parsons.pickedState : '',
    ]
      .filter(Boolean)
      .join(', ');

  const renderList = (name: ListName) => {
    const items = lists[name];
    const drop = dragView?.to?.list === name ? dragView.to : null;
    const rows = items.map((b, i) => {
      const isFocus = focus.list === name && focus.index === i;
      const dragged = dragView?.block.id === b.id;
      return (
        <li
          key={b.id}
          data-id={b.id}
          role="none"
          class={`parsons-item ${held?.id === b.id ? 'held' : ''} ${dragged ? 'dragging' : ''}`}
          style={{ marginLeft: `${b.indent * 2}rem` }}
        >
          <div
            role="option"
            class="parsons-handle"
            id={`parsons-line-${b.id}`}
            ref={(el) => {
              if (el) refs.current.set(b.id, el);
            }}
            aria-selected={isFocus}
            aria-label={label(b, name)}
            // One tab stop per list: the focused line, or the first line of the other list.
            tabIndex={(focus.list === name ? focus.index : 0) === i ? 0 : -1}
            onFocus={() => setFocus({ list: name, index: i })}
            onKeyDown={onKeyDown}
            onPointerDown={(e) => onPointerDown(e, name, i, b)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {spec.indent && name === 'spell' && b.indent > 0 && (
              <span class="indent-guides" aria-hidden="true">
                {'│ '.repeat(b.indent)}
              </span>
            )}
            <code>{b.text}</code>
            {spec.indent && name === 'spell' && (
              <span class="small-text muted indent-label" aria-hidden="true">
                {' '}
                {t.parsons.indent(b.indent)}
              </span>
            )}
          </div>
          <span class="parsons-buttons" aria-hidden="true">
            <LineButton
              title={t.parsons.up}
              text="▲"
              onClick={() => button({ list: name, index: i }, 'ArrowUp', false)}
            />
            <LineButton
              title={t.parsons.down}
              text="▼"
              onClick={() => button({ list: name, index: i }, 'ArrowDown', false)}
            />
            {name === 'spell' && spec.indent && (
              <>
                <LineButton
                  title={t.parsons.left}
                  text="◀"
                  onClick={() => button({ list: name, index: i }, 'ArrowLeft', false)}
                />
                <LineButton
                  title={t.parsons.right}
                  text="▶"
                  onClick={() => button({ list: name, index: i }, 'ArrowRight', false)}
                />
              </>
            )}
            <LineButton
              title={t.parsons.swap}
              text="⇄"
              cls="parsons-swap"
              onClick={() => button({ list: name, index: i }, 'm', false)}
            />
          </span>
        </li>
      );
    });
    if (drop) {
      // Where the line will land: before the drop.index-th line that isn't being dragged.
      // The dragged line itself stays put in the page, so it keeps the pointer capture.
      let pos = items.length;
      for (let k = 0, seen = 0; k < items.length; k++) {
        if (items[k]!.id === dragView?.block.id) continue;
        if (seen++ === drop.index) {
          pos = k;
          break;
        }
      }
      rows.splice(
        pos,
        0,
        <li
          key="drop"
          class="parsons-drop"
          aria-hidden="true"
          style={{ marginLeft: `${drop.indent * 2}rem` }}
        />,
      );
    }
    return (
      <section class={`parsons-list parsons-${name}`} aria-labelledby={`parsons-${name}-h`}>
        <h3 id={`parsons-${name}-h`}>{listTitle(name)}</h3>
        {name === 'scraps' && (
          <p class="small-text muted parsons-tray-help">
            {t.parsons.trayHelp}
            {spec.distractors.length > 0 && ` ${t.parsons.trayDistractors}`}
          </p>
        )}
        {name === 'spell' && spec.fixedTop.length > 0 && (
          <pre class="parsons-fixed" aria-label="Lines that are already in place">
            {spec.fixedTop.join('\n')}
          </pre>
        )}
        <ul
          class="parsons-items"
          role="listbox"
          aria-labelledby={`parsons-${name}-h`}
          aria-describedby="parsons-help"
          ref={(el) => void (listRefs.current[name] = el)}
        >
          {rows}
        </ul>
        {items.length === 0 && <p class="parsons-empty muted">{t.parsons.empty}</p>}
      </section>
    );
  };

  const selected = lists[focus.list][focus.index];
  return (
    <div class="parsons">
      <p id="parsons-help" class="muted small-text">
        ⌨️ {t.parsons.instructions} {t.parsons.dragHelp}
      </p>
      <div class="parsons-columns">
        {renderList('scraps')}
        {renderList('spell')}
      </div>
      {dragView && drag.current && (
        <div
          class="parsons-float"
          aria-hidden="true"
          style={{
            left: `${dragView.x - drag.current.grabX}px`,
            top: `${dragView.y - drag.current.grabY}px`,
            width: `${drag.current.width}px`,
          }}
        >
          <code>{dragView.block.text}</code>
        </div>
      )}
      <div class="parsons-selected" role="group" aria-label={t.parsons.selected}>
        <span class="small-text">
          {t.parsons.selected}: {selected ? <code>{selected.text}</code> : t.parsons.noneSelected}
        </span>
        <span class="row">
          <button
            type="button"
            class="small"
            disabled={!selected}
            onClick={() => button(focus, 'ArrowUp', false)}
          >
            ▲ {t.parsons.up}
          </button>
          <button
            type="button"
            class="small"
            disabled={!selected}
            onClick={() => button(focus, 'ArrowDown', false)}
          >
            ▼ {t.parsons.down}
          </button>
          {spec.indent && (
            <>
              <button
                type="button"
                class="small"
                disabled={!selected || focus.list !== 'spell'}
                onClick={() => button(focus, 'ArrowLeft', false)}
              >
                ◀ {t.parsons.left}
              </button>
              <button
                type="button"
                class="small"
                disabled={!selected || focus.list !== 'spell'}
                onClick={() => button(focus, 'ArrowRight', false)}
              >
                ▶ {t.parsons.right}
              </button>
            </>
          )}
          <button type="button" class="small" disabled={!selected} onClick={() => button(focus, 'm', false)}>
            ⇄ {t.parsons.toOther(listTitle(focus.list === 'spell' ? 'scraps' : 'spell'))}
          </button>
        </span>
      </div>
    </div>
  );
}

/** A per-line button for mouse users. Hidden from assistive technology and the Tab order:
 *  keyboard users have the keys, and everyone has the buttons below the lists. */
function LineButton({
  title,
  text,
  cls,
  onClick,
}: {
  title: string;
  text: string;
  cls?: string;
  onClick(): void;
}) {
  return (
    <button type="button" tabIndex={-1} title={title} class={cls} onClick={onClick}>
      {text}
    </button>
  );
}
