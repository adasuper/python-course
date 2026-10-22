// Badges (docs/specs.md §11.6): defined in content/badges.yaml, checked after every change
// to the profile (store.update). Pure functions, so every trigger is unit-tested.
import type { Badge, BadgeTrigger, Course } from '../content/types';
import { today, type Profile } from './profile';

function completed(p: Profile) {
  return Object.entries(p.quests).filter(([, r]) => r.status === 'completed');
}

export function triggerMet(p: Profile, course: Course, trigger: BadgeTrigger): boolean {
  const info = course.questInfo;
  switch (trigger.kind) {
    case 'quest_type_completed':
      return completed(p).some(([id]) => info[id]?.type === trigger.type);
    case 'completed_without_hints':
      return completed(p).some(
        ([, r]) => r.hintsUsed === 0 && Object.values(r.phaseHints ?? {}).every((tier) => tier === 0),
      );
    case 'distinct_attempts':
      return Object.values(p.quests).some((r) => r.codeHashes.length >= trigger.count);
    case 'passed_after_failures':
      return completed(p).some(([, r]) => r.failedBeforePass >= trigger.count);
    case 'counter':
      return (p.counters[trigger.counter] ?? 0) >= trigger.count;
    case 'boss_defeated':
      return completed(p).some(([id]) => info[id]?.type === 'boss' && info[id]?.region === trigger.region);
    case 'pois_visited': {
      const pois = course.regions.find((r) => r.id === trigger.region)?.pois ?? [];
      const seen = p.poisVisited[trigger.region] ?? [];
      return pois.length > 0 && pois.every((poi) => seen.includes(poi));
    }
    case 'side_quests':
      return completed(p).filter(([id]) => info[id]?.sideQuest).length >= trigger.count;
    case 'checks_completed':
      return Object.keys(p.checks).length >= trigger.count;
    case 'quest_completed':
      return p.quests[trigger.quest]?.status === 'completed';
  }
}

/** Badges earned now but not yet in the profile, in badges.yaml order. A quest's
 *  `rewards.badge` counts as earned when the quest is completed. */
export function newlyEarned(p: Profile, course: Course): Badge[] {
  const fromRewards = new Set(completed(p).flatMap(([id]) => course.questInfo[id]?.badge ?? []));
  return course.badges.filter(
    (b) => !(b.id in p.badges) && (fromRewards.has(b.id) || triggerMet(p, course, b.trigger)),
  );
}

/** Adds every newly earned badge to the profile. Badges are never taken away. */
export function awardBadges(p: Profile, course: Course, on = today()): Badge[] {
  const fresh = newlyEarned(p, course);
  for (const b of fresh) p.badges[b.id] = on;
  return fresh;
}
