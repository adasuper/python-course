// Badge triggers (docs/specs.md §11.6, F-PRG-06): each one fires when it should and not before.
import { describe, expect, it } from 'vitest';
import type { Badge, BadgeTrigger, Course } from '../../src/content/types';
import { awardBadges, newlyEarned, triggerMet } from '../../src/state/badges';
import { emptyRecord, newProfile, type Profile } from '../../src/state/profile';

const info = (type: string, extra: Record<string, unknown> = {}) => ({
  region: 'one',
  type,
  title: type,
  item: null,
  xp: 30,
  phases: [],
  sideQuest: false,
  prerequisites: [],
  badge: null,
  bonus: [],
  ...extra,
});

const course = {
  regions: [
    { id: 'one', number: 1, name: 'One', enabled: true, lessons: 1, pois: ['owl', 'mill'] },
    { id: 'two', number: 2, name: 'Two', enabled: true, lessons: 1, pois: [] },
  ],
  questOrder: ['make', 'fix', 'boss', 'side1', 'side2', 'side3', 'gift'],
  questInfo: {
    make: info('make'),
    fix: info('fix'),
    boss: info('boss', { phases: ['p1', 'p2'] }),
    side1: info('make', { sideQuest: true }),
    side2: info('make', { sideQuest: true }),
    side3: info('make', { sideQuest: true }),
    gift: info('make', { badge: 'gifted' }),
  },
  badges: [] as Badge[],
} as unknown as Course;

const fresh = () => newProfile('Badge Fox', 'avatar-1', 'moss', 'one');
const done = (p: Profile, id: string, extra: Partial<Profile['quests'][string]> = {}) =>
  (p.quests[id] = { ...emptyRecord(), status: 'completed', ...extra });

/** [trigger, set up a profile that has NOT earned it yet, then make the change that earns it] */
const CASES: [BadgeTrigger, (p: Profile) => void, (p: Profile) => void][] = [
  [
    { kind: 'quest_type_completed', type: 'fix' },
    (p) => done(p, 'make'),
    (p) => done(p, 'fix', { hintsUsed: 3 }),
  ],
  [
    { kind: 'completed_without_hints' },
    (p) => {
      done(p, 'make', { hintsUsed: 1 });
      done(p, 'boss', { phaseHints: { p1: 0, p2: 2 } });
      p.quests.fix = { ...emptyRecord(), hintsUsed: 0 }; // not completed
    },
    (p) => done(p, 'side1', { hintsUsed: 0 }),
  ],
  [
    { kind: 'distinct_attempts', count: 5 },
    (p) => (p.quests.make = { ...emptyRecord(), codeHashes: ['a', 'b', 'c', 'd'] }),
    (p) => p.quests.make!.codeHashes.push('e'),
  ],
  [
    { kind: 'passed_after_failures', count: 4 },
    (p) => {
      done(p, 'make', { failedBeforePass: 3 });
      p.quests.fix = { ...emptyRecord(), failedBeforePass: 9 }; // still not passed
    },
    (p) => (p.quests.fix!.status = 'completed'),
  ],
  [
    { kind: 'counter', counter: 'realErrorViews', count: 5 },
    (p) => (p.counters.realErrorViews = 4),
    (p) => p.counters.realErrorViews++,
  ],
  [
    { kind: 'counter', counter: 'workshopRuns', count: 10 },
    (p) => (p.counters.workshopRuns = 9),
    (p) => p.counters.workshopRuns++,
  ],
  [
    { kind: 'boss_defeated', region: 'one' },
    (p) => (p.quests.boss = { ...emptyRecord(), phasesDone: ['p1'] }),
    (p) => done(p, 'boss'),
  ],
  [
    { kind: 'pois_visited', region: 'one' },
    (p) => (p.poisVisited.one = ['owl']),
    (p) => p.poisVisited.one!.push('mill'),
  ],
  [
    { kind: 'side_quests', count: 3 },
    (p) => {
      done(p, 'side1');
      done(p, 'side2');
      done(p, 'make');
    },
    (p) => done(p, 'side3'),
  ],
  [
    { kind: 'checks_completed', count: 2 },
    (p) => (p.checks.one = { best: 1, latest: 1, total: 4, attempts: 1 }),
    (p) => (p.checks.two = { best: 0, latest: 0, total: 4, attempts: 1 }),
  ],
  [{ kind: 'quest_completed', quest: 'fix' }, (p) => done(p, 'make'), (p) => done(p, 'fix')],
];

describe('badge triggers', () => {
  it.each(CASES)('%j', (trigger, before, earn) => {
    const p = fresh();
    expect(triggerMet(p, course, trigger)).toBe(false);
    before(p);
    expect(triggerMet(p, course, trigger)).toBe(false);
    earn(p);
    expect(triggerMet(p, course, trigger)).toBe(true);
  });

  it('a region with no secret corners has no Explorer badge', () => {
    expect(triggerMet(fresh(), course, { kind: 'pois_visited', region: 'two' })).toBe(false);
  });
});

describe('awarding badges', () => {
  const withBadges = {
    ...course,
    badges: [
      { id: 'first-bug', name: 'First Bug', emoji: '🐞', description: [], trigger: CASES[0]![0] },
      {
        id: 'gifted',
        name: 'Gifted',
        emoji: '🎁',
        description: [],
        trigger: { kind: 'quest_completed', quest: 'nope' },
      },
    ],
  } as unknown as Course;

  it('adds new badges once, with the date, in badges.yaml order', () => {
    const p = fresh();
    done(p, 'fix');
    done(p, 'gift'); // its rewards.badge
    expect(awardBadges(p, withBadges, '2026-10-22').map((b) => b.id)).toEqual(['first-bug', 'gifted']);
    expect(p.badges).toEqual({ 'first-bug': '2026-10-22', gifted: '2026-10-22' });
    expect(awardBadges(p, withBadges)).toEqual([]);
  });

  it('never takes a badge away', () => {
    const p = fresh();
    p.badges['first-bug'] = '2026-01-01';
    expect(newlyEarned(p, withBadges)).toEqual([]);
    expect(p.badges).toEqual({ 'first-bug': '2026-01-01' });
  });
});
