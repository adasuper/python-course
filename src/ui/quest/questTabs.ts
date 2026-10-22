// Narrow screens (≤ 1100 px wide, or 200% text) show the quest's three panels as tabs
// (docs/specs.md §9.10, F-QST-03). All three stay mounted; only the chosen one is shown.
import { signal } from '@preact/signals';
import { useEffect, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { profile } from '../../state/store';

export type QuestTab = 'quest' | 'work' | 'stage';

export const questTab = signal<QuestTab>('work');

const NARROW = '(max-width: 1100px)';

export function useNarrow(): boolean {
  const [narrowWindow, setNarrowWindow] = useState(() => matchMedia(NARROW).matches);
  useEffect(() => {
    const query = matchMedia(NARROW);
    const onChange = () => setNarrowWindow(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return narrowWindow || profile.value?.settings.textScale === 2;
}

/** Props for one quest panel: a tab panel on narrow screens, a plain section otherwise. */
export function panelProps(key: QuestTab, narrow: boolean): JSX.HTMLAttributes<HTMLElement> {
  if (!narrow) return {};
  return {
    role: 'tabpanel' as const,
    id: `quest-panel-${key}`,
    'aria-labelledby': `quest-tab-${key}`,
    hidden: questTab.value !== key,
  };
}
