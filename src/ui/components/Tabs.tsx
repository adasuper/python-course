// Tabs that follow the WAI-ARIA tabs pattern: one Tab stop for the tab list, ←/→ (and
// Home/End) move between tabs and show them, and each panel is labelled by its tab.
import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';

export interface Tab<K extends string> {
  key: K;
  label: ComponentChildren;
}

export function Tabs<K extends string>({
  id,
  label,
  tabs,
  current,
  onSelect,
  children,
}: {
  /** Prefix for the tab and panel ids. */
  id: string;
  /** What the tab list is for (its accessible name). */
  label: string;
  tabs: Tab<K>[];
  current: K;
  onSelect(key: K): void;
  /** The current tab's panel. */
  children: ComponentChildren;
}) {
  const refs = useRef(new Map<K, HTMLButtonElement>());
  const onKeyDown = (e: KeyboardEvent) => {
    const i = tabs.findIndex((tab) => tab.key === current);
    const next =
      e.key === 'ArrowRight'
        ? (i + 1) % tabs.length
        : e.key === 'ArrowLeft'
          ? (i - 1 + tabs.length) % tabs.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? tabs.length - 1
              : -1;
    if (next < 0) return;
    e.preventDefault();
    const key = tabs[next]!.key;
    onSelect(key);
    refs.current.get(key)?.focus();
  };
  return (
    <div class="tabs">
      <div role="tablist" aria-label={label} class="tab-list" onKeyDown={onKeyDown}>
        {tabs.map((tab) => {
          const selected = tab.key === current;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`${id}-tab-${tab.key}`}
              aria-selected={selected}
              aria-controls={`${id}-panel`}
              tabIndex={selected ? 0 : -1}
              class={selected ? 'current' : ''}
              ref={(el) => {
                if (el) refs.current.set(tab.key, el);
              }}
              onClick={() => onSelect(tab.key)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${current}`}
        tabIndex={0}
        class="tab-panel"
      >
        {children}
      </div>
    </div>
  );
}
