// A student's local profile (docs/specs.md §12.1). Nicknames only — never real names.
import type { Speed } from '../game/replay';

export type QuestStatus = 'available' | 'in_progress' | 'completed';

export interface QuestRecord {
  status: QuestStatus;
  attempts: number;
  /** Hashes of distinct programs run (capped), for the "Tinkerer" badge. */
  codeHashes: string[];
  failedBeforePass: number;
  hintsUsed: 0 | 1 | 2 | 3;
  activeSeconds: number;
  completedOn?: string;
  predictionsCorrectFirstTry?: number;
  predictionsTotal?: number;
  bonus?: string[];
  /** The student's passing code ("My Spells"). */
  solution?: string;
  /** Boss quests: completed phase ids. */
  phasesDone?: string[];
}

export interface CheckRecord {
  best: number;
  latest: number;
  total: number;
  attempts: number;
}

export interface Settings {
  textScale: 1 | 1.25 | 1.5 | 2;
  reducedMotion: 'system' | 'on' | 'off';
  replaySpeed: Speed;
  editorFontSize: number;
  highContrast: boolean;
  font: 'atkinson' | 'opendyslexic' | 'system';
}

export interface Profile {
  schemaVersion: 1;
  id: string;
  nickname: string;
  avatarId: string;
  themeId: string;
  createdOn: string;
  xp: number;
  quests: Record<string, QuestRecord>;
  checks: Record<string, CheckRecord>;
  items: string[];
  poisVisited: Record<string, string[]>;
  seen: { opening: boolean; regionIntros: string[]; conceptScenes: string[] };
  location: { region: string; at: [number, number] | null };
  settings: Settings;
  /** Hash of the progress last saved out (save code or file); see §12.5. */
  lastSavedOutHash: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  textScale: 1,
  reducedMotion: 'system',
  replaySpeed: 1,
  editorFontSize: 16,
  highContrast: false,
  font: 'atkinson',
};

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function newProfile(
  nickname: string,
  avatarId: string,
  themeId: string,
  firstRegion: string,
): Profile {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    nickname,
    avatarId,
    themeId,
    createdOn: today(),
    xp: 0,
    quests: {},
    checks: {},
    items: [],
    poisVisited: {},
    seen: { opening: false, regionIntros: [], conceptScenes: [] },
    location: { region: firstRegion, at: null },
    settings: { ...DEFAULT_SETTINGS },
    lastSavedOutHash: null,
  };
}

export function emptyRecord(): QuestRecord {
  return {
    status: 'in_progress',
    attempts: 0,
    codeHashes: [],
    failedBeforePass: 0,
    hintsUsed: 0,
    activeSeconds: 0,
  };
}

/** Cumulative XP needed for level n is 25·n·(n−1) (docs/specs.md §11.2). */
export function levelFor(xp: number): number {
  let level = 1;
  while (25 * (level + 1) * level <= xp) level++;
  return level;
}

export function xpForLevel(level: number): number {
  return 25 * level * (level - 1);
}

export function titleFor(level: number): string {
  if (level >= 11) return 'Master Scriptwright';
  if (level >= 8) return 'Scriptwright';
  if (level >= 5) return 'Spellwright';
  if (level >= 3) return 'Scribe';
  return 'Apprentice';
}

/** A short, stable hash for code and progress (not for security). */
export function hashText(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Hash of everything a save code or file would carry, to detect unsaved progress. */
export function progressHash(p: Profile): string {
  const essentials = {
    xp: p.xp,
    q: Object.entries(p.quests)
      .map(([k, r]) => [k, r.status, r.hintsUsed, r.phasesDone ?? []])
      .sort(),
    c: p.checks,
    n: p.nickname,
    a: p.avatarId,
    t: p.themeId,
  };
  return hashText(JSON.stringify(essentials));
}
