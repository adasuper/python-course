import '@fontsource/atkinson-hyperlegible-next/400.css';
import '@fontsource/atkinson-hyperlegible-next/700.css';
import '@fontsource/atkinson-hyperlegible-mono/400.css';
import '@fontsource/opendyslexic/400.css';
import { effect } from '@preact/signals';
import { render } from 'preact';
import type { Quest } from './content/types';
import { PyRunner } from './runtime/pyRunner';
import { loadConfig } from './state/config';
import { Storage } from './state/storage';
import { newProfile } from './state/profile';
import {
  attachServices,
  config,
  course,
  flushSave,
  go,
  loadCourse,
  loadRegion,
  profile,
  profiles,
  regions,
  update,
} from './state/store';
import { App } from './ui/App';
import { applySettings } from './ui/flow';
import { checkOfflineReady, whenControlled } from './ui/pwa';
import { registerServiceWorker } from './ui/registerSW';
import { configureRules } from './state/progress';
import './ui/tokens.css';
import './ui/styles.css';

async function boot() {
  render(<App />, document.getElementById('app')!);
  applySettings(null);
  registerServiceWorker();
  const [cfg, storage] = await Promise.all([loadConfig(), Storage.open()]);
  config.value = cfg;
  configureRules(cfg.features);
  loadCourse();
  // Python starts loading right away, while the student picks a profile (§5.1).
  const runner = new PyRunner({
    indexURL: new URL(`${import.meta.env.BASE_URL}pyodide/`, location.href).href,
    timeoutMs: cfg.execution.timeoutSeconds * 1000,
    // Python's downloads should go through the service worker, so they land in its cache.
    beforeInit: whenControlled(),
  });
  attachServices(storage, runner);
  // Once Python has loaded, check (and finish) the offline caches.
  effect(() => {
    if (runner.status.value === 'ready') void checkOfflineReady(true);
  });
  profiles.value = await storage.profiles();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushSave();
  });
  window.addEventListener('pagehide', () => void flushSave());
  go({ name: 'title' });
  await openDevQuest();
}

/** Authors and tests can open any quest, knowledge check, concept scene or region map
 *  directly (specs §10.6): /?dev#/dev/quest/<quest-id>, /?dev#/dev/check/<region-id>,
 *  /?dev#/dev/concept/<region-id> or /?dev#/dev/region/<region-id>. */
async function openDevQuest() {
  if (!new URLSearchParams(location.search).has('dev')) return;
  exposeTestHooks();
  const match = /^#\/dev\/(quest|check|concept|region)\/(.+)$/.exec(location.hash);
  if (!match) return;
  const [, kind, raw] = match as unknown as [string, 'quest' | 'check' | 'concept' | 'region', string];
  const target = decodeURIComponent(raw);
  const course = loadCourse();
  const regionId = kind === 'quest' ? course.questInfo[target]?.region : target;
  if (!regionId || !course.regions.some((r) => r.id === regionId)) return;
  useDevProfile();
  await loadRegion(regionId);
  if (kind === 'concept' || kind === 'region') {
    update((x) => {
      x.location.region = regionId;
      x.location.at = null;
    });
  }
  if (kind === 'check') go({ name: 'check', regionId });
  else if (kind === 'concept') go({ name: 'concept', regionId, next: { name: 'overworld' } });
  else if (kind === 'region') go({ name: 'overworld' });
  else go({ name: 'quest', questId: target });
}

/** End-to-end tests play quest types that the real content doesn't have yet by handing
 *  the game a compiled quest (tests/e2e/fixtures). Only with ?dev. */
function exposeTestHooks() {
  (window as unknown as { __codewealdTest: unknown }).__codewealdTest = {
    /** `regionNumber` plays the fixture as if it were in that region (e.g. 10 for the
     *  annotated traceback). */
    async openQuest(quest: Quest, options: { regionNumber?: number } = {}) {
      const c = course.value ?? loadCourse();
      const regionId = c.regions[0]!.id;
      const region = await loadRegion(regionId);
      const fixture = { ...quest, region: regionId };
      regions.value = {
        ...regions.value,
        [regionId]: { ...region, questData: { ...region.questData, [quest.id]: fixture } },
      };
      course.value = {
        ...c,
        regions: c.regions.map((r) =>
          r.id === regionId && options.regionNumber ? { ...r, number: options.regionNumber } : r,
        ),
        questInfo: {
          ...c.questInfo,
          [quest.id]: {
            region: regionId,
            type: quest.type,
            title: quest.title,
            item: null,
            xp: quest.rewards.xp,
            phases: quest.type === 'boss' ? quest.phases.map((ph) => ph.id) : [],
            sideQuest: false,
            prerequisites: [],
            npc: quest.npc,
            badge: quest.rewards.badge,
            bonus: quest.type === 'boss' ? [] : quest.bonus.map((b) => b.id),
          },
        },
      };
      useDevProfile();
      go({ name: 'quest', questId: quest.id });
    },
  };
}

function useDevProfile() {
  const c = course.value ?? loadCourse();
  if (!profile.value) {
    const existing = profiles.value.find((p) => p.nickname === 'Dev Tester');
    if (existing) profile.value = existing;
    else {
      const p = newProfile('Dev Tester', 'avatar-1', 'tide', c.regions[0]!.id);
      p.seen = {
        opening: true,
        regionIntros: c.regions.map((r) => r.id),
        conceptScenes: c.regions.map((r) => r.id),
      };
      profiles.value = [...profiles.value, p];
      profile.value = p;
    }
  }
}

void boot();
