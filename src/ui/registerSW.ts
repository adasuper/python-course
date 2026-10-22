// Registers the generated service worker (production builds only). A new version waits
// until the student reloads; it never reloads by itself mid-quest (F-OFF-04).
import { registerSW } from 'virtual:pwa-register';
import { checkOfflineReady, onUpdate } from './pwa';

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const update = registerSW({
    immediate: true,
    onNeedRefresh: () => onUpdate(() => takeOver(update)),
    onOfflineReady: () => void checkOfflineReady(),
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => void checkOfflineReady());
}

/** Lets the waiting version take over, then reloads into it. The plugin reloads only for
 *  updates it found itself; the browser's own update checks (the usual case) need this. */
async function takeOver(update: (reload?: boolean) => Promise<void>) {
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
  await update(true);
  setTimeout(() => location.reload(), 3000);
}
