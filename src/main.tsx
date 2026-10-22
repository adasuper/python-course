import '@fontsource/atkinson-hyperlegible-next/400.css';
import '@fontsource/atkinson-hyperlegible-next/700.css';
import '@fontsource/atkinson-hyperlegible-mono/400.css';
import '@fontsource/opendyslexic/400.css';
import { render } from 'preact';
import { PyRunner } from './runtime/pyRunner';
import { loadConfig } from './state/config';
import { Storage } from './state/storage';
import { newProfile } from './state/profile';
import {
  attachServices,
  config,
  flushSave,
  go,
  loadCourse,
  loadRegion,
  profile,
  profiles,
} from './state/store';
import { App } from './ui/App';
import { applySettings } from './ui/flow';
import './ui/tokens.css';
import './ui/styles.css';

async function boot() {
  render(<App />, document.getElementById('app')!);
  applySettings(null);
  const [cfg, storage] = await Promise.all([loadConfig(), Storage.open()]);
  config.value = cfg;
  loadCourse();
  // Python starts loading right away, while the student picks a profile (§5.1).
  const runner = new PyRunner({
    indexURL: new URL(`${import.meta.env.BASE_URL}pyodide/`, location.href).href,
    timeoutMs: cfg.execution.timeoutSeconds * 1000,
  });
  attachServices(storage, runner);
  profiles.value = await storage.profiles();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushSave();
  });
  window.addEventListener('pagehide', () => void flushSave());
  go({ name: 'title' });
  await openDevQuest();
}

/** Authors and tests can open any quest or knowledge check directly:
 *  /?dev#/dev/quest/<quest-id> or /?dev#/dev/check/<region-id> (specs §10.6). */
async function openDevQuest() {
  const match = /^#\/dev\/(quest|check)\/(.+)$/.exec(location.hash);
  if (!match || !new URLSearchParams(location.search).has('dev')) return;
  const target = decodeURIComponent(match[2]!);
  const course = loadCourse();
  const regionId = match[1] === 'check' ? target : course.questInfo[target]?.region;
  if (!regionId || !course.regions.some((r) => r.id === regionId)) return;
  if (!profile.value) {
    const existing = profiles.value.find((p) => p.nickname === 'Dev Tester');
    if (existing) profile.value = existing;
    else {
      const p = newProfile('Dev Tester', 'avatar-1', 'tide', course.regions[0]!.id);
      p.seen = {
        opening: true,
        regionIntros: course.regions.map((r) => r.id),
        conceptScenes: course.regions.map((r) => r.id),
      };
      profiles.value = [...profiles.value, p];
      profile.value = p;
    }
  }
  await loadRegion(regionId);
  go(match[1] === 'check' ? { name: 'check', regionId } : { name: 'quest', questId: target });
}

void boot();
