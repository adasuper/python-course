// "Merge" when restoring a save of an adventurer who is already on this computer (docs/specs.md
// §12.3): keep the best of both. Completions, items, badges and secret corners are joined;
// XP, hints, attempts and time take the larger value. The local look and settings stay.
import type { Program } from './storage';
import type { CheckRecord, Profile, QuestRecord } from './profile';

const union = <T>(a: T[] = [], b: T[] = []) => [...new Set([...a, ...b])];
const earliest = (a?: string, b?: string) => (a && b ? (a < b ? a : b) : (a ?? b));

function mergeQuest(a: QuestRecord | undefined, b: QuestRecord | undefined): QuestRecord {
  if (!a) return structuredClone(b!);
  if (!b) return structuredClone(a);
  const done = a.status === 'completed' ? a : b.status === 'completed' ? b : null;
  const phaseHints = { ...(a.phaseHints ?? {}) };
  for (const [phase, tier] of Object.entries(b.phaseHints ?? {}))
    phaseHints[phase] = Math.max(phaseHints[phase] ?? 0, tier) as 0 | 1 | 2 | 3;
  const merged: QuestRecord = {
    status: done ? 'completed' : a.status,
    attempts: Math.max(a.attempts, b.attempts),
    codeHashes: union(a.codeHashes, b.codeHashes).slice(0, 12),
    failedBeforePass: Math.max(a.failedBeforePass, b.failedBeforePass),
    hintsUsed: Math.max(a.hintsUsed, b.hintsUsed) as QuestRecord['hintsUsed'],
    activeSeconds: Math.max(a.activeSeconds, b.activeSeconds),
  };
  const completedOn = earliest(a.completedOn, b.completedOn);
  if (completedOn) merged.completedOn = completedOn;
  const solution = done?.solution ?? a.solution ?? b.solution;
  if (solution !== undefined) merged.solution = solution;
  const predictions = done ?? a;
  if (predictions.predictionsTotal !== undefined) {
    merged.predictionsTotal = predictions.predictionsTotal;
    merged.predictionsCorrectFirstTry = predictions.predictionsCorrectFirstTry;
  }
  const bonus = union(a.bonus, b.bonus);
  if (bonus.length) merged.bonus = bonus;
  const phasesDone = union(a.phasesDone, b.phasesDone);
  if (phasesDone.length) merged.phasesDone = phasesDone;
  if (Object.keys(phaseHints).length) merged.phaseHints = phaseHints;
  return merged;
}

function mergeCheck(a: CheckRecord | undefined, b: CheckRecord | undefined): CheckRecord {
  if (!a) return { ...b! };
  if (!b) return { ...a };
  const newer = b.attempts > a.attempts ? b : a;
  return {
    best: Math.max(a.best, b.best),
    latest: newer.latest,
    total: Math.max(a.total, b.total),
    attempts: Math.max(a.attempts, b.attempts),
  };
}

/** The local profile with the restored one merged in. Never loses anything either had. */
export function mergeProfiles(local: Profile, restored: Profile): Profile {
  const p = structuredClone(local);
  p.xp = Math.max(local.xp, restored.xp);
  for (const id of union(Object.keys(local.quests), Object.keys(restored.quests)))
    p.quests[id] = mergeQuest(local.quests[id], restored.quests[id]);
  for (const id of union(Object.keys(local.checks), Object.keys(restored.checks)))
    p.checks[id] = mergeCheck(local.checks[id], restored.checks[id]);
  p.items = union(local.items, restored.items);
  for (const [id, on] of Object.entries(restored.badges)) p.badges[id] = earliest(p.badges[id], on)!;
  for (const [region, pois] of Object.entries(restored.poisVisited))
    p.poisVisited[region] = union(p.poisVisited[region], pois);
  p.seen = {
    opening: local.seen.opening || restored.seen.opening,
    regionIntros: union(local.seen.regionIntros, restored.seen.regionIntros),
    conceptScenes: union(local.seen.conceptScenes, restored.seen.conceptScenes),
  };
  for (const key of Object.keys(p.counters) as (keyof Profile['counters'])[])
    p.counters[key] = Math.max(local.counters[key] ?? 0, restored.counters[key] ?? 0);
  p.createdOn = earliest(local.createdOn, restored.createdOn)!;
  return p;
}

/** Drafts: the code on this computer wins; the restored save adds what's missing. */
export function mergeDrafts(local: Record<string, string>, restored: Record<string, string>) {
  return { ...restored, ...local };
}

/** Workshop programs: both sets, the newer copy of a program kept, up to the limit. */
export function mergePrograms(local: Program[], restored: Program[], limit = 20): Program[] {
  const byId = new Map<string, Program>();
  for (const program of [...restored, ...local]) {
    const seen = byId.get(program.id);
    if (!seen || program.savedOn >= seen.savedOn) byId.set(program.id, program);
  }
  return [...byId.values()].sort((a, b) => b.savedOn.localeCompare(a.savedOn)).slice(0, limit);
}
