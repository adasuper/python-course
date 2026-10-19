// Saving out and restoring (docs/specs.md §12.5): save codes and progress files.
import { AVATARS, THEMES } from '../art';
import { progressHash, type Profile } from './profile';
import { fileName, makeProgressFile, parseProgressFile, saveFile } from './progressFile';
import { decodeSaveCode, encodeSaveCode, sameProfile } from './saveCode';
import { course, flushSave, getStorage, markSavedOut, profile, profiles } from './store';

export const CHOICES = { avatars: AVATARS.map((a) => a.id), themes: THEMES.map((th) => th.id) };

export function currentSaveCode(): string {
  return encodeSaveCode(profile.value!, course.value!, CHOICES);
}

export async function saveProgressFile(): Promise<'saved' | 'downloaded' | 'cancelled'> {
  const p = profile.value!;
  await flushSave();
  const drafts = await getStorage().drafts(p.id);
  const result = await saveFile(
    fileName(p),
    JSON.stringify(makeProgressFile(p, drafts, course.value!), null, 1),
  );
  if (result !== 'cancelled') markSavedOut();
  return result;
}

export interface Restored {
  profile: Profile;
  drafts: Record<string, string>;
}

export type RestoreAttempt =
  { ok: true; restored: Restored } | { ok: false; message: 'typo' | 'badFile' | 'otherCourse' };

export function restoreFromCode(code: string): RestoreAttempt {
  const result = decodeSaveCode(code, course.value!, CHOICES);
  if (!result.ok)
    return {
      ok: false,
      message: result.reason === 'course' || result.reason === 'version' ? 'otherCourse' : 'typo',
    };
  return { ok: true, restored: { profile: result.profile, drafts: {} } };
}

export function restoreFromFile(text: string): RestoreAttempt {
  if (text === '\u0000too-big') return { ok: false, message: 'badFile' };
  const result = parseProgressFile(text);
  if (!result.ok) return { ok: false, message: 'badFile' };
  return { ok: true, restored: { profile: result.file.profile as Profile, drafts: result.file.drafts } };
}

/** An existing local profile that the restored one came from, if any. */
export function existingMatch(restored: Restored): Profile | undefined {
  return profiles.value.find((p) => sameProfile(p.id, restored.profile.id));
}

export async function installRestored(restored: Restored, mode: 'replace' | 'keep'): Promise<Profile> {
  const storage = getStorage();
  const p = structuredClone(restored.profile);
  const match = existingMatch(restored);
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
  profiles.value = [...profiles.value.filter((x) => x.id !== p.id), p];
  return p;
}
