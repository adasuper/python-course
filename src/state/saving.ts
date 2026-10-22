// Saving out and restoring (docs/specs.md §12.5): save codes and progress files.
import { AVATARS, THEMES } from '../art';
import { mergeDrafts, mergeProfiles, mergePrograms } from './merge';
import { progressHash, type Profile } from './profile';
import type { Program } from './storage';
import { fileName, makeProgressFile, parseProgressFile, saveFile } from './progressFile';
import { decodeSaveCode, encodeSaveCode, sameProfile } from './saveCode';
import { t } from '../i18n/en';
import {
  announce,
  course,
  flushSave,
  getStorage,
  markSavedOut,
  profile,
  profiles,
  saveDialogOpen,
  toast,
} from './store';

export const CHOICES = { avatars: AVATARS.map((a) => a.id), themes: THEMES.map((th) => th.id) };

export function currentSaveCode(): string {
  return encodeSaveCode(profile.value!, course.value!, CHOICES);
}

/** Copy the save code (the toast after a save point). Falls back to the save dialog. */
export async function copySaveCode(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(currentSaveCode());
    markSavedOut();
    announce(t.save.copied);
    toast('info', t.save.copied, 3000);
    return true;
  } catch {
    saveDialogOpen.value = true;
    return false;
  }
}

export async function saveProgressFile(): Promise<'saved' | 'downloaded' | 'cancelled'> {
  await flushSave();
  const result = await exportProfile(profile.value!);
  if (result !== 'cancelled') markSavedOut();
  return result;
}

/** Saves any profile on this computer as a progress file (also "Save first" before deleting). */
export async function exportProfile(p: Profile): Promise<'saved' | 'downloaded' | 'cancelled'> {
  const storage = getStorage();
  const [drafts, programs] = await Promise.all([storage.drafts(p.id), storage.programs(p.id)]);
  return saveFile(fileName(p), JSON.stringify(makeProgressFile(p, drafts, course.value!, programs), null, 1));
}

export interface Restored {
  profile: Profile;
  drafts: Record<string, string>;
  programs: Program[];
}

export type RestoreAttempt =
  | { ok: true; restored: Restored }
  | { ok: false; message: 'typo' | 'badFile' | 'changedFile' | 'otherCourse' };

export function restoreFromCode(code: string): RestoreAttempt {
  const result = decodeSaveCode(code, course.value!, CHOICES);
  if (!result.ok)
    return {
      ok: false,
      message: result.reason === 'course' || result.reason === 'version' ? 'otherCourse' : 'typo',
    };
  return { ok: true, restored: { profile: result.profile, drafts: {}, programs: [] } };
}

export function restoreFromFile(text: string): RestoreAttempt {
  if (text === '\u0000too-big') return { ok: false, message: 'badFile' };
  const result = parseProgressFile(text);
  if (!result.ok) return { ok: false, message: result.reason === 'changed' ? 'changedFile' : 'badFile' };
  return {
    ok: true,
    restored: {
      profile: result.file.profile as Profile,
      drafts: result.file.drafts,
      programs: result.file.programs as Program[],
    },
  };
}

/** An existing local profile that the restored one came from, if any. */
export function existingMatch(restored: Restored): Profile | undefined {
  return profiles.value.find((p) => sameProfile(p.id, restored.profile.id));
}

/** Adds a restored save. When the adventurer is already here: replace it, keep both, or
 *  merge the two, keeping the best of both (§12.3). */
export async function installRestored(
  restored: Restored,
  mode: 'replace' | 'keep' | 'merge',
): Promise<Profile> {
  const storage = getStorage();
  const match = existingMatch(restored);
  if (match && mode === 'merge') {
    const merged = mergeProfiles(match, restored.profile);
    const drafts = mergeDrafts(await storage.drafts(match.id), restored.drafts);
    await storage.saveProfile(merged);
    for (const [key, code] of Object.entries(drafts)) await storage.saveDraft(merged.id, key, code);
    await storage.savePrograms(merged.id, mergePrograms(await storage.programs(match.id), restored.programs));
    profiles.value = profiles.value.map((x) => (x.id === merged.id ? merged : x));
    return merged;
  }
  const p = structuredClone(restored.profile);
  if (match && mode === 'replace') {
    await storage.deleteProfile(match.id);
    p.id = match.id;
  } else if (match) {
    p.id = crypto.randomUUID();
  }
  // What was just restored is, by definition, saved somewhere already.
  p.lastSavedOutHash = progressHash(p);
  await storage.saveProfile(p);
  for (const [key, code] of Object.entries(restored.drafts)) await storage.saveDraft(p.id, key, code);
  if (restored.programs.length) await storage.savePrograms(p.id, restored.programs);
  profiles.value = [...profiles.value.filter((x) => x.id !== p.id), p];
  return p;
}
