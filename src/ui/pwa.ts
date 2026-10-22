// Offline play (docs/specs.md §16, F-OFF-01–04): "Ready to play offline", Python's cache, and
// updates that wait for the student. The service worker itself is generated at build time
// (vite-plugin-pwa) and registered in registerSW.ts.
import { signal } from '@preact/signals';

/** Python's files are cached on first use, in a cache named after the Pyodide version. */
export const PYODIDE_CACHE = `pyodide-${__PYODIDE_VERSION__}`;
/** What Pyodide downloads to start (the worker's own code is in the app's precache). */
export const PYODIDE_FILES = [
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
];

/** The app and Python are both cached: the game now works with no network. */
export const offlineReady = signal(false);
/** A new version is installed and waits until the student chooses to reload. */
export const updateReady = signal(false);
/** Whether the computer has a network right now (shown in the HUD when it doesn't). */
export const online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => (online.value = true));
  window.addEventListener('offline', () => (online.value = false));
}

let applyUpdate: (() => Promise<void>) | null = null;

export function onUpdate(apply: () => Promise<void>) {
  applyUpdate = apply;
  updateReady.value = true;
}

/** Switches to the new version and reloads (only when the student asks). */
export async function reloadForUpdate() {
  if (applyUpdate) await applyUpdate();
  else location.reload();
}

export function pyodideURL(file: string): string {
  return new URL(`${import.meta.env.BASE_URL}pyodide/${file}`, location.href).href;
}

/** Waits until a service worker controls the page, so Python's downloads go through it and
 *  land in its cache (§16). Gives up after `ms`, and doesn't wait where there is none. */
export function whenControlled(ms = 3000): Promise<void> {
  const sw = typeof navigator === 'undefined' ? undefined : navigator.serviceWorker;
  if (!import.meta.env.PROD || !sw || sw.controller) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      sw.removeEventListener('controllerchange', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    sw.addEventListener('controllerchange', done);
  });
}

/** True when an active service worker holds the app and every Python file is cached. With
 *  `fill`, Python files that were downloaded before the service worker took over are copied
 *  in now (usually straight from the browser's HTTP cache). */
export async function checkOfflineReady(fill = false): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || typeof caches === 'undefined') return false;
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.active) return false;
    const cache = await caches.open(PYODIDE_CACHE);
    for (const file of PYODIDE_FILES) {
      const url = pyodideURL(file);
      if (await cache.match(url, { ignoreVary: true })) continue;
      if (!fill) return false;
      await cache.add(url);
    }
    offlineReady.value = true;
    return true;
  } catch {
    return false;
  }
}
