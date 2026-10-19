// App-wide state (Preact Signals) and every action that changes it (docs/specs.md §5.3).
// All mutations go through here, so saving happens in one place.
import { computed, signal } from '@preact/signals';
import type { Course, DialogueLine, Region } from '../content/types';
import type { PyRunner } from '../runtime/pyRunner';
import type { AppConfig } from './config';
import { DEFAULT_CONFIG } from './config';
import { progressHash, type Profile } from './profile';
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
  | { name: 'inventory' };

export interface Toast {
  id: number;
  kind: 'save-point' | 'info' | 'reward';
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

/** Apply a change to the active profile, then save (debounced). */
export function update(change: (p: Profile) => void) {
  const p = profile.value;
  if (!p) return;
  const next = structuredClone(p);
  change(next);
  profile.value = next;
  profiles.value = profiles.value.map((x) => (x.id === next.id ? next : x));
  scheduleSave();
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
/** Polite screen-reader announcement. */
export function announce(text: string) {
  announcement.value = { text, n: ++announceCounter };
}

let toastId = 0;
export function toast(kind: Toast['kind'], text: string, ms = 6000) {
  const t = { id: ++toastId, kind, text };
  toasts.value = [...toasts.value, t];
  announce(text);
  if (ms > 0) setTimeout(() => dismissToast(t.id), ms);
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
