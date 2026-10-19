// Keyboard-accessible Parsons puzzle (docs/specs.md §14.3).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ParsonsSpec } from '../../content/types';
import { t } from '../../i18n/en';
import { announce } from '../../state/store';

export interface Block {
  id: number;
  text: string;
  indent: number;
}

type ListName = 'scraps' | 'spell';
const MAX_INDENT = 4;

/** Deterministic shuffle, so every student sees the same puzzle (and tests are stable). */
function shuffle<T>(items: T[], seed: string): T[] {
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

export function initialBlocks(spec: ParsonsSpec, seed: string): Block[] {
  const all = [...spec.lines, ...spec.distractors].map((line, id) => ({
    id,
    text: spec.indent ? line.trimStart() : line,
    indent: 0,
  }));
  return shuffle(all, seed);
}

export function programFrom(spec: ParsonsSpec, spell: Block[]): string {
  const body = spell.map((b) => (spec.indent ? '    '.repeat(b.indent) + b.text : b.text));
  return [...spec.fixedTop, ...body].join('\n') + '\n';
}

export function Parsons({
  spec,
  seed,
  state,
  onChange,
}: {
  spec: ParsonsSpec;
  seed: string;
  state: { scraps: Block[]; spell: Block[] } | null;
  onChange(next: { scraps: Block[]; spell: Block[] }): void;
}) {
  const start = useMemo(() => ({ scraps: initialBlocks(spec, seed), spell: [] as Block[] }), [spec, seed]);
  const lists = state ?? start;
  const [focus, setFocus] = useState<{ list: ListName; index: number }>({ list: 'scraps', index: 0 });
  const [held, setHeld] = useState<number | null>(null);
  const refs = useRef(new Map<number, HTMLButtonElement>());
  const dragging = useRef<number | null>(null);

  useEffect(() => {
    const list = lists[focus.list];
    const block = list[focus.index];
    if (block && refs.current.get(block.id) !== document.activeElement && held !== null)
      refs.current.get(block.id)?.focus();
  });

  const commit = (next: { scraps: Block[]; spell: Block[] }, nf?: { list: ListName; index: number }) => {
    onChange(next);
    if (nf) {
      setFocus(nf);
      const block = next[nf.list][nf.index];
      if (block) requestAnimationFrame(() => refs.current.get(block.id)?.focus());
    }
  };

  const say = (list: ListName, index: number, next: { scraps: Block[]; spell: Block[] }) => {
    const b = next[list][index];
    if (b)
      announce(
        t.parsons.moved(index + 1, next[list].length, b.indent) +
          (list === 'spell' ? '' : ` (${t.parsons.scraps})`),
      );
  };

  const move = (list: ListName, index: number, delta: number) => {
    const target = index + delta;
    const items = [...lists[list]];
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target]!, items[index]!];
    const next = { ...lists, [list]: items };
    commit(next, { list, index: target });
    say(list, target, next);
  };

  const indent = (list: ListName, index: number, delta: number) => {
    if (list !== 'spell' || !spec.indent) return;
    const items = [...lists.spell];
    const b = items[index]!;
    const value = Math.max(0, Math.min(MAX_INDENT, b.indent + delta));
    items[index] = { ...b, indent: value };
    const next = { ...lists, spell: items };
    commit(next, { list, index });
    say(list, index, next);
  };

  const swap = (list: ListName, index: number, at?: number) => {
    const other: ListName = list === 'spell' ? 'scraps' : 'spell';
    const from = [...lists[list]];
    const [b] = from.splice(index, 1);
    if (!b) return;
    const to = [...lists[other]];
    const pos = at ?? to.length;
    to.splice(pos, 0, { ...b, indent: other === 'scraps' ? 0 : b.indent });
    const next = { [list]: from, [other]: to } as { scraps: Block[]; spell: Block[] };
    commit(next, { list: other, index: pos });
    say(other, pos, next);
  };

  const onKeyDown = (e: KeyboardEvent, list: ListName, index: number, block: Block) => {
    const isHeld = held === block.id;
    switch (e.key) {
      case ' ':
      case 'Enter':
        e.preventDefault();
        if (isHeld) {
          setHeld(null);
          announce(t.parsons.dropped);
        } else {
          setHeld(block.id);
          announce(t.parsons.picked(block.text, index + 1, lists[list].length, block.indent));
        }
        return;
      case 'Escape':
        if (isHeld) {
          e.preventDefault();
          setHeld(null);
          announce(t.parsons.dropped);
        }
        return;
      case 'ArrowUp':
      case 'ArrowDown': {
        e.preventDefault();
        const delta = e.key === 'ArrowUp' ? -1 : 1;
        if (isHeld) move(list, index, delta);
        else {
          const target = Math.max(0, Math.min(lists[list].length - 1, index + delta));
          setFocus({ list, index: target });
          const b = lists[list][target];
          if (b) refs.current.get(b.id)?.focus();
        }
        return;
      }
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'Tab':
        if (e.key === 'Tab' && !isHeld) return;
        e.preventDefault();
        indent(list, index, e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey) ? -1 : 1);
        return;
      case 'm':
      case 'M':
        e.preventDefault();
        setHeld(null);
        swap(list, index);
        return;
    }
  };

  const renderList = (name: ListName, title: string) => (
    <section class={`parsons-list parsons-${name}`} aria-labelledby={`parsons-${name}-h`}>
      <h3 id={`parsons-${name}-h`}>{title}</h3>
      {name === 'spell' && spec.fixedTop.length > 0 && (
        <pre class="parsons-fixed" aria-label="Lines that are already in place">
          {spec.fixedTop.join('\n')}
        </pre>
      )}
      {lists[name].length === 0 && <p class="parsons-empty muted">{t.parsons.empty}</p>}
      <ul
        class="parsons-items"
        aria-labelledby={`parsons-${name}-h`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const id = dragging.current;
          dragging.current = null;
          if (id === null) return;
          const fromList: ListName = lists.scraps.some((b) => b.id === id) ? 'scraps' : 'spell';
          const index = lists[fromList].findIndex((b) => b.id === id);
          if (fromList !== name) swap(fromList, index);
        }}
      >
        {lists[name].map((b, i) => (
          <li
            key={b.id}
            class={`parsons-item ${held === b.id ? 'held' : ''}`}
            style={{ marginLeft: `${b.indent * 2}rem` }}
            draggable
            onDragStart={() => (dragging.current = b.id)}
          >
            <button
              type="button"
              class="parsons-handle"
              ref={(el) => {
                if (el) refs.current.set(b.id, el);
              }}
              aria-pressed={held === b.id}
              tabIndex={focus.list === name && focus.index === i ? 0 : -1}
              onFocus={() => setFocus({ list: name, index: i })}
              onClick={(e) => e.detail === 0 || setHeld(held === b.id ? null : b.id)}
              onKeyDown={(e) => onKeyDown(e, name, i, b)}
              aria-label={`${b.text}${name === 'spell' && spec.indent ? `, ${t.parsons.indent(b.indent)}` : ''}, line ${i + 1} of ${lists[name].length}`}
            >
              {spec.indent && name === 'spell' && (
                <span class="indent-guides" aria-hidden="true">
                  {'│ '.repeat(b.indent)}
                </span>
              )}
              <code>{b.text}</code>
            </button>
            <span class="parsons-buttons">
              <button type="button" tabIndex={-1} aria-label={t.parsons.up} onClick={() => move(name, i, -1)}>
                ▲
              </button>
              <button
                type="button"
                tabIndex={-1}
                aria-label={t.parsons.down}
                onClick={() => move(name, i, 1)}
              >
                ▼
              </button>
              {name === 'spell' && spec.indent && (
                <>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={t.parsons.left}
                    onClick={() => indent(name, i, -1)}
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={t.parsons.right}
                    onClick={() => indent(name, i, 1)}
                  >
                    ▶
                  </button>
                </>
              )}
              <button type="button" tabIndex={-1} aria-label={t.parsons.swap} onClick={() => swap(name, i)}>
                ⇄
              </button>
            </span>
            {spec.indent && name === 'spell' && (
              <span class="small-text muted"> {t.parsons.indent(b.indent)}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div class="parsons">
      <p id="parsons-help" class="muted small-text">
        ⌨️ {t.parsons.instructions}
      </p>
      <div class="parsons-columns">
        {renderList('scraps', t.parsons.scraps)}
        {renderList('spell', t.parsons.yourSpell)}
      </div>
    </div>
  );
}
