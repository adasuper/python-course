// Saved data from older versions of the game keeps working (F-SAV-03, specs §12.4).
// Every stored profile and progress file has a schemaVersion. MIGRATIONS[n] upgrades
// version n to n + 1; loading runs the chain up to CURRENT_SCHEMA. Each step has a test.
import type { Profile } from './profile';

export const CURRENT_SCHEMA = 4;

type Raw = Record<string, unknown>;
export type Migration = (old: Raw) => Raw;

export const MIGRATIONS: Record<number, Migration> = {
  // 2: counters for badges (opening the real error), and the open quest in `location`.
  1: (p) => ({
    ...p,
    schemaVersion: 2,
    counters: { realErrorViews: 0 },
    location: { ...(p.location as Raw), quest: null },
  }),
  // 3: earned badges (id → date), and counters for the Workshop and Duck badges.
  2: (p) => ({
    ...p,
    schemaVersion: 3,
    badges: {},
    counters: { ...(p.counters as Raw), workshopRuns: 0, duckChats: 0 },
  }),
  // 4: the full settings screen: code font, shortcut keys, read aloud and sound.
  3: (p) => ({
    ...p,
    schemaVersion: 4,
    settings: {
      ...(p.settings as Raw),
      codeFont: 'atkinson',
      shortcuts: true,
      tts: { autoRead: false, voice: '', rate: 1, readCode: false },
      audio: { master: 0.8, music: 0, effects: 0 },
    },
  }),
};

/** A save from a newer version of the game than this one. */
export class FutureSaveError extends Error {}

/** Upgrade any saved profile (from storage, a file or an old export) to the current schema. */
export function migrateProfile(raw: unknown, migrations = MIGRATIONS, current = CURRENT_SCHEMA): Profile {
  if (typeof raw !== 'object' || raw === null) throw new TypeError('not a profile');
  let p = raw as Raw;
  let version = typeof p.schemaVersion === 'number' ? p.schemaVersion : 1;
  if (version > current) throw new FutureSaveError(`profile schema ${version} is newer than ${current}`);
  while (version < current) {
    const step = migrations[version];
    if (!step) throw new Error(`no migration from schema ${version}`);
    p = step(p);
    version++;
  }
  return p as unknown as Profile;
}
