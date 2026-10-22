// Where the game goes next: opening story → region intro → concept scene → overworld.
import { questState } from '../state/progress';
import { newProfile, type Profile } from '../state/profile';
import {
  course,
  flushSave,
  getStorage,
  go,
  loadRegion,
  profile,
  profiles,
  update,
  type Route,
} from '../state/store';

export async function selectProfile(p: Profile) {
  profile.value = p;
  await getStorage().setLastProfileId(p.id);
  applySettings(p);
  await continueAdventure();
}

export async function createProfile(nickname: string, avatarId: string, themeId: string) {
  const c = course.value!;
  const p = newProfile(nickname.trim(), avatarId, themeId, c.regions[0]!.id);
  await getStorage().saveProfile(p);
  profiles.value = [...profiles.value, p];
  await selectProfile(p);
}

/** Opening story (first time), then the current region. */
export async function continueAdventure() {
  const p = profile.value!;
  const c = course.value!;
  const regionStart = await regionRoute(p.location.region);
  if (!p.seen.opening) {
    update((x) => void (x.seen.opening = true));
    go({ name: 'story', title: c.title, lines: c.opening, next: regionStart });
    return;
  }
  // Back into the quest that was open, e.g. after restoring a progress file (F-SAV-10).
  const open = p.location.quest;
  if (open && c.questInfo[open] && questState(p, c, open) !== 'locked') {
    go({ name: 'quest', questId: open });
    return;
  }
  go(regionStart);
}

export async function enterRegion(regionId: string) {
  go(await regionRoute(regionId));
}

/** Region intro and concept scene the first time; otherwise straight to the map. */
async function regionRoute(regionId: string): Promise<Route> {
  const region = await loadRegion(regionId);
  const p = profile.value!;
  let next: Route = { name: 'overworld' };
  if (!p.seen.conceptScenes.includes(regionId)) next = { name: 'concept', regionId, next };
  if (!p.seen.regionIntros.includes(regionId) && region.intro.length) {
    next = { name: 'story', title: region.name, lines: region.intro, next };
  }
  update((x) => {
    x.location.region = regionId;
    if (!x.seen.regionIntros.includes(regionId)) x.seen.regionIntros.push(regionId);
  });
  return next;
}

export async function switchProfile() {
  await flushSave();
  profile.value = null;
  go({ name: 'title' });
}

export function applySettings(p: Profile | null) {
  const root = document.documentElement;
  const s = p?.settings;
  root.style.setProperty('--text-scale', String(s?.textScale ?? 1));
  root.dataset.font = s?.font ?? 'atkinson';
  root.dataset.contrast = s?.highContrast ? 'high' : 'normal';
  const reduce =
    s?.reducedMotion === 'on' ||
    (s?.reducedMotion !== 'off' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  root.dataset.motion = reduce ? 'reduce' : 'full';
  if (p) root.dataset.theme = p.themeId;
}

export function prefersReducedMotion(): boolean {
  return document.documentElement.dataset.motion === 'reduce';
}
