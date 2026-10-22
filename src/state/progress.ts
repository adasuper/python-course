// Pure rules about progress: what's unlocked, what's done, what XP is earned.
// Kept free of UI and storage so they're easy to unit-test.
import type { Course } from '../content/types';
import { CHECK_XP, BOSS_DEFEAT_XP, BOSS_PHASE_XP } from '../content/types';
import type { Marker } from '../game/worldView';
import { emptyRecord, hashText, levelFor, today, type Profile, type QuestRecord } from './profile';

let checkGates = false;

/** Deploy setting `features.knowledgeCheckGates`: the next region also waits for the
 *  previous region's knowledge check (off by default; F-BOS-04). */
export function setKnowledgeCheckGates(on: boolean) {
  checkGates = on;
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

export function questState(p: Profile, course: Course, questId: string, unlockedThrough = 0): Marker {
  const info = course.questInfo[questId];
  if (!info) return 'locked';
  if (!regionUnlocked(p, course, info.region, unlockedThrough)) return 'locked';
  const rec = p.quests[questId];
  if (rec?.status === 'completed') return 'completed';
  if (info.sideQuest && !course.sideQuests) return 'locked';
  if (!info.prerequisites.every((pre) => p.quests[pre]?.status === 'completed')) return 'locked';
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
