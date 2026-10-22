// App-wide state (Preact Signals) and every action that changes it (docs/specs.md §5.3).
// All mutations go through here, so saving happens in one place.
import { computed, signal } from '@preact/signals';
import type { Course, DialogueLine, Region } from '../content/types';
import type { PyRunner } from '../runtime/pyRunner';
import type { AppConfig } from './config';
import { DEFAULT_CONFIG } from './config';
import { t } from '../i18n/en';
import { awardBadges } from './badges';
import { levelFor, progressHash, titleFor, type Profile } from './profile';
import type { Storage } from './storage';

export type Route =
  | { name: 'loading' }
  | { name: 'title' }
  | { name: 'creator' }
  | { name: 'story'; title: string; lines: DialogueLine[]; next: Route }
  | { name: 'concept'; regionId: string; next: Route }
  | { name: 'overworld' }
  | { name: 'quest'; questId: string }
  | { name: 'check'; regionId: string }
  | { name: 'inventory' }
  | { name: 'item'; id: string }
  | { name: 'workshop' }
  | { name: 'settings' }
  | { name: 'spellbook'; tab?: 'pages' | 'spells' | 'examples' | 'scenes' | 'glossary' }
  | { name: 'credits' };

export interface Toast {
  id: number;
  kind: 'save-point' | 'info' | 'reward' | 'celebrate';
  /** For a celebration: the badge's emoji, or ⭐ for a level-up. */
  icon?: string;
  text: string;
}

export const route = signal<Route>({ name: 'loading' });
export const course = signal<Course | null>(null);
export const regions = signal<Record<string, Region>>({});
export const profiles = signal<Profile[]>([]);
export const profile = signal<Profile | null>(null);
export const config = signal<AppConfig>(DEFAULT_CONFIG);
export const toasts = signal<Toast[]>([]);
export const announcement = signal<{ text: string; n: number }>({ text: '', n: 0 });
export const saveDialogOpen = signal(false);

let storage: Storage | null = null;
let runner: PyRunner | null = null;

export function attachServices(s: Storage, r: PyRunner) {
  storage = s;
  runner = r;
}

export function getStorage(): Storage {
  if (!storage) throw new Error('storage not ready');
  return storage;
}

export function getRunner(): PyRunner {
  if (!runner) throw new Error('runner not ready');
  return runner;
}

export const storageMode = computed(() => storage?.mode ?? 'memory');

/** True when progress changed since the last save code or progress file (§12.5). */
export const unsaved = computed(() => {
  const p = profile.value;
  if (!p) return false;
  const started = p.xp > 0 || Object.keys(p.quests).length > 0;
  return started && progressHash(p) !== p.lastSavedOutHash;
});

// ----- saving ---------------------------------------------------------------------

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** Apply a change to the active profile, then save (debounced). Badges are checked after
 *  every change (§11.6), and new badges and level-ups are celebrated (F-PRG-08). */
export function update(change: (p: Profile) => void) {
  const p = profile.value;
  if (!p) return;
  const next = structuredClone(p);
  change(next);
  const fresh = course.value ? awardBadges(next, course.value) : [];
  profile.value = next;
  profiles.value = profiles.value.map((x) => (x.id === next.id ? next : x));
  scheduleSave();
  const level = levelFor(next.xp);
  if (level > levelFor(p.xp)) toast('celebrate', t.celebrate.levelUp(level, titleFor(level)), 8000, '⭐');
  for (const b of fresh) toast('celebrate', t.celebrate.badge(b.name), 8000, b.emoji);
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void flushSave(), 500);
}

export async function flushSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  const p = profile.value;
  if (p && storage) await storage.saveProfile(p);
}

export function markSavedOut() {
  update((p) => {
    p.lastSavedOutHash = progressHash(p);
  });
}

// ----- navigation & messages --------------------------------------------------------

export function go(next: Route) {
  route.value = next;
}

let announceCounter = 0;
let lastAnnounced = 0;
/** Polite screen-reader announcement. Messages that come together (a level-up and a badge,
 *  say) are joined, so the second doesn't replace the first before it is read. */
export function announce(text: string) {
  const now = Date.now();
  const previous = announcement.value.text;
  const joined = now - lastAnnounced < 300 && previous ? `${previous} ${text}` : text;
  lastAnnounced = now;
  announcement.value = { text: joined, n: ++announceCounter };
}

let toastId = 0;
/** At most this many toasts show at once (older ones were already announced). */
export const MAX_TOASTS = 3;

export function toast(kind: Toast['kind'], text: string, ms = 6000, icon?: string) {
  const item = { id: ++toastId, kind, text, ...(icon ? { icon } : {}) };
  // A new save point replaces the last one; the newest toasts win.
  const kept = kind === 'save-point' ? toasts.value.filter((x) => x.kind !== 'save-point') : toasts.value;
  toasts.value = [...kept, item].slice(-MAX_TOASTS);
  announce(text);
  if (ms > 0) setTimeout(() => dismissToast(item.id), ms);
}

export function dismissToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

// ----- content loading ---------------------------------------------------------------

const courseModule = import.meta.glob('../generated/content/course.json', { eager: true, import: 'default' });
const regionModules = import.meta.glob('../generated/content/region-*.json', { import: 'default' });

export function loadCourse(): Course {
  const c = Object.values(courseModule)[0] as Course | undefined;
  if (!c) throw new Error('Content has not been built. Run `npm run content`.');
  course.value = c;
  return c;
}

export async function loadRegion(regionId: string): Promise<Region> {
  const cached = regions.value[regionId];
  if (cached) return cached;
  const loader = regionModules[`../generated/content/region-${regionId}.json`];
  if (!loader) throw new Error(`Unknown region ${regionId}`);
  const region = (await loader()) as Region;
  regions.value = { ...regions.value, [regionId]: region };
  return region;
}
