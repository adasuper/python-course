// "Ready to play offline ✓" (F-OFF-03): on the title screen and in Settings, once the app and
// Python are both cached.
import { useEffect } from 'preact/hooks';
import { t } from '../../i18n/en';
import { checkOfflineReady, offlineReady } from '../pwa';

export function OfflineStatus() {
  useEffect(() => {
    if (!offlineReady.value) void checkOfflineReady();
  }, []);
  if (!import.meta.env.PROD) return null;
  return (
    <p class={`offline-status ${offlineReady.value ? 'ready' : 'muted'}`} role="status">
      {offlineReady.value ? `📶 ${t.offline.ready}` : t.offline.notYet}
    </p>
  );
}
