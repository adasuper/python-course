// Pure rules about progress: what's unlocked, what's done, what XP is earned.
// Kept free of UI and storage so they're easy to unit-test.
import type { Course } from '../content/types';
import { CHECK_XP, BOSS_DEFEAT_XP, BOSS_PHASE_XP } from '../content/types';
import type { Marker } from '../game/worldView';
import { emptyRecord, hashText, levelFor, today, type Profile, type QuestRecord } from './profile';

let checkGates = false;
let sideQuestsOn = true;

/** Deploy settings from codeweald.config.json `features` (F-DEP-02):
 *  - knowledgeCheckGates: the next region also waits for the previous region's knowledge
 *    check (off by default; F-BOS-04)
 *  - sideQuests: false hides every side quest */
export function configureRules(features: { knowledgeCheckGates: boolean; sideQuests: boolean }) {
  checkGates = features.knowledgeCheckGates;
  sideQuestsOn = features.sideQuests;
}

export function regionUnlocked(p: Profile, course: Course, regionId: string, unlockedThrough = 0): boolean {
  const index = course.regions.findIndex((r) => r.id === regionId);
  if (index <= 0) return index === 0;
  if (index < unlockedThrough) return true;
  const previous = course.regions[index - 1]!;
  const bossId = course.questOrder.find(
    (q) => course.questInfo[q]?.region === previous.id && course.questInfo[q]?.type === 'boss',
  );
  const bossBeaten = Boolean(bossId && p.quests[bossId]?.status === 'completed');
  return bossBeaten && (!checkGates || Boolean(p.checks[previous.id]));
}

/** The Workshop opens when the first region's boss is defeated (§11.7), if the deploy has it. */
export function workshopUnlocked(p: Profile, course: Course, enabled = true): boolean {
  if (!enabled) return false;
  const first = course.regions[0]?.id;
  return course.questOrder.some(
    (q) =>
      course.questInfo[q]?.region === first &&
      course.questInfo[q]?.type === 'boss' &&
      p.quests[q]?.status === 'completed',
  );
}

/** A region's core quests: everything but its side quests and its boss. */
export function coreQuests(course: Course, regionId: string): string[] {
  return course.questOrder.filter((q) => {
    const info = course.questInfo[q];
    return info?.region === regionId && !info.sideQuest && info.type !== 'boss';
  });
}

/** Quests still to finish before this one opens: its prerequisites and, for a side quest,
 *  the region's core quests (side quests appear once those are done, §9.9). */
export function missingFor(p: Profile, course: Course, questId: string): string[] {
  const info = course.questInfo[questId];
  if (!info) return [];
  const needed = info.sideQuest
    ? [...coreQuests(course, info.region), ...info.prerequisites]
    : info.prerequisites;
  return [...new Set(needed)].filter((q) => p.quests[q]?.status !== 'completed');
}

/** What the region's Quest Board offers: side quests, and quests no map NPC hands out
 *  (F-WLD-07), so adding a quest never needs a map edit. */
export function boardQuests(course: Course, regionId: string): string[] {
  return course.questOrder.filter((q) => {
    const info = course.questInfo[q];
    return info?.region === regionId && (info.sideQuest || !info.npc);
  });
}

export function questState(p: Profile, course: Course, questId: string, unlockedThrough = 0): Marker {
  const info = course.questInfo[questId];
  if (!info) return 'locked';
  if (!regionUnlocked(p, course, info.region, unlockedThrough)) return 'locked';
  const rec = p.quests[questId];
  if (rec?.status === 'completed') return 'completed';
  if (info.sideQuest && !(course.sideQuests && sideQuestsOn)) return 'locked';
  if (missingFor(p, course, questId).length) return 'locked';
  return rec ? 'in_progress' : 'available';
}

export function regionMarkers(
  p: Profile,
  course: Course,
  regionId: string,
  unlockedThrough = 0,
): Record<string, Marker> {
  const out: Record<string, Marker> = {};
  for (const id of course.questOrder) {
    if (course.questInfo[id]?.region === regionId) out[id] = questState(p, course, id, unlockedThrough);
  }
  return out;
}

export function regionCounts(p: Profile, course: Course, regionId: string) {
  const ids = course.questOrder.filter(
    (q) => course.questInfo[q]?.region === regionId && !course.questInfo[q]?.sideQuest,
  );
  return { done: ids.filter((q) => p.quests[q]?.status === 'completed').length, total: ids.length };
}

export function record(p: Profile, questId: string): QuestRecord {
  p.quests[questId] ??= emptyRecord();
  return p.quests[questId]!;
}

/** A Run that reached validation. */
export function recordAttempt(p: Profile, questId: string, code: string, passed: boolean) {
  const rec = record(p, questId);
  rec.attempts++;
  const h = hashText(code.trim());
  if (!rec.codeHashes.includes(h) && rec.codeHashes.length < 12) rec.codeHashes.push(h);
  if (!passed && rec.status !== 'completed') rec.failedBeforePass++;
}

/** A predict quest's run: only the first try's predictions count toward accuracy (§9.2). */
export function recordPredictions(p: Profile, questId: string, correct: boolean[]) {
  const rec = record(p, questId);
  rec.attempts++;
  if (rec.predictionsTotal === undefined) {
    rec.predictionsTotal = correct.length;
    rec.predictionsCorrectFirstTry = correct.filter(Boolean).length;
  }
}

/** Hints unlock in order, per quest, or per phase of a boss (F-FBK-11). */
export function useHint(p: Profile, questId: string, tier: 1 | 2 | 3, phaseId?: string) {
  const rec = record(p, questId);
  if (tier > rec.hintsUsed) rec.hintsUsed = tier;
  if (phaseId) {
    rec.phaseHints ??= {};
    if (tier > (rec.phaseHints[phaseId] ?? 0)) rec.phaseHints[phaseId] = tier;
  }
}

export function hintsShown(p: Profile, questId: string, phaseId?: string): 0 | 1 | 2 | 3 {
  const rec = p.quests[questId];
  if (!rec) return 0;
  return phaseId ? (rec.phaseHints?.[phaseId] ?? 0) : rec.hintsUsed;
}

export interface Reward {
  xp: number;
  item: string | null;
  levelUp: number | null;
  bossDefeated: boolean;
}

/** XP is granted once per quest and never taken away (§11.2). */
export function completeQuest(p: Profile, course: Course, questId: string, code: string): Reward {
  const rec = record(p, questId);
  const info = course.questInfo[questId]!;
  const before = levelFor(p.xp);
  const firstTime = rec.status !== 'completed';
  rec.status = 'completed';
  rec.solution = code;
  rec.completedOn ??= today();
  let xp = 0;
  let item: string | null = null;
  if (firstTime) {
    xp = info.type === 'boss' ? BOSS_DEFEAT_XP : info.xp;
    if (info.item && !p.items.includes(info.item)) {
      p.items.push(info.item);
      item = info.item;
    }
  }
  p.xp += xp;
  const after = levelFor(p.xp);
  return {
    xp,
    item,
    levelUp: after > before ? after : null,
    bossDefeated: firstTime && info.type === 'boss',
  };
}

export function completePhase(
  p: Profile,
  course: Course,
  questId: string,
  phaseId: string,
  code: string,
): Reward {
  const rec = record(p, questId);
  rec.phasesDone ??= [];
  const before = levelFor(p.xp);
  let xp = 0;
  if (!rec.phasesDone.includes(phaseId)) {
    rec.phasesDone.push(phaseId);
    xp = BOSS_PHASE_XP;
    p.xp += xp;
  }
  const phases = course.questInfo[questId]?.phases ?? [];
  if (phases.every((ph) => rec.phasesDone!.includes(ph)) && rec.status !== 'completed') {
    const reward = completeQuest(p, course, questId, code);
    return { ...reward, xp: reward.xp + xp, levelUp: levelFor(p.xp) > before ? levelFor(p.xp) : null };
  }
  return { xp, item: null, levelUp: levelFor(p.xp) > before ? levelFor(p.xp) : null, bossDefeated: false };
}

/** Bonus challenges (§9.4): extra XP once per challenge, never taken away. In a boss, each
 *  phase's challenges are kept apart. Returns the XP gained now and which challenges were
 *  new. */
export function awardBonus(
  p: Profile,
  questId: string,
  earned: { id: string; xp: number }[],
  phaseId?: string,
): { xp: number; ids: string[]; levelUp: number | null } {
  const rec = record(p, questId);
  rec.bonus ??= [];
  const before = levelFor(p.xp);
  const fresh = earned.filter((b) => !rec.bonus!.includes(bonusKey(b.id, phaseId)));
  for (const b of fresh) rec.bonus.push(bonusKey(b.id, phaseId));
  const xp = fresh.reduce((sum, b) => sum + b.xp, 0);
  p.xp += xp;
  return { xp, ids: fresh.map((b) => b.id), levelUp: levelFor(p.xp) > before ? levelFor(p.xp) : null };
}

export const bonusKey = (id: string, phaseId?: string) => (phaseId ? `${phaseId}/${id}` : id);

export function bonusDone(p: Profile, questId: string, id: string, phaseId?: string): boolean {
  return Boolean(p.quests[questId]?.bonus?.includes(bonusKey(id, phaseId)));
}

export function completeCheck(p: Profile, regionId: string, score: number, total: number): number {
  const prev = p.checks[regionId];
  p.checks[regionId] = {
    best: Math.max(prev?.best ?? 0, score),
    latest: score,
    total,
    attempts: (prev?.attempts ?? 0) + 1,
  };
  if (prev) return 0;
  p.xp += CHECK_XP;
  return CHECK_XP;
}
