import { describe, expect, it } from 'vitest';
import type { Course } from '../../src/content/types';
import { checkNickname, normalizeForFilter, randomNickname } from '../../src/state/nickname';
import { levelFor, newProfile, progressHash, titleFor, xpForLevel } from '../../src/state/profile';
import {
  boardQuests,
  completeCheck,
  completePhase,
  coreQuests,
  missingFor,
  playableRegions,
  regionRestored,
  completeQuest,
  hintsShown,
  questState,
  record,
  recordAttempt,
  regionUnlocked,
  configureRules,
  useHint,
} from '../../src/state/progress';
import { shuffledOrder } from '../../src/ui/order';
import { parseProgressFile, makeProgressFile } from '../../src/state/progressFile';

describe('nickname filter', () => {
  it.each([
    'Clever Newt',
    'Ada-42',
    'Scunthorpe Fox',
    'Grass Hopper',
    'Cassie',
    'Button Moon',
    'Hello Kitty',
    // False positives found in the Phase 1 audit:
    'Bob',
    'Bobcat',
    'Buttons',
    'Spicy Fox',
    'Shiitake',
    'Sexton',
    'Pissarro',
    'Scrap Fox',
    'Homer',
  ])('allows %s', (n) => {
    expect(checkNickname(n)).toBeNull();
  });
  it.each([
    ['a', 'length'],
    ['a'.repeat(17), 'length'],
    ['me@school.org', 'characters'],
    ['call 5551234567', 'personal'],
    ['Sh1t Lord', 'blocked'],
    ['F u c k y', 'blocked'],
    ['b1tch', 'blocked'],
    ['fuuuck', 'blocked'],
    // Separators found in the Phase 1 audit:
    ['Sh-it', 'blocked'],
    ['fu ck', 'blocked'],
    ['Cr ap', 'blocked'],
    ['Ma Sh It', 'blocked'],
  ])('rejects %s (%s)', (n, why) => {
    expect(checkNickname(n)).toBe(why);
  });
  it('normalizes leetspeak and repeats', () => {
    expect(normalizeForFilter('B@@D  W0rd!!')).toBe('badwordi');
  });
  it('generates friendly, valid names', () => {
    for (let i = 0; i < 50; i++) expect(checkNickname(randomNickname())).toBeNull();
  });
});

describe('levels', () => {
  it('follows 25·n·(n−1)', () => {
    expect([0, 49, 50, 149, 150, 500, 2250].map(levelFor)).toEqual([1, 1, 2, 2, 3, 5, 10]);
    expect(xpForLevel(5)).toBe(500);
    expect(titleFor(1)).toBe('Apprentice');
    expect(titleFor(9)).toBe('Scriptwright');
  });
});

const course = {
  regions: [
    { id: 'one', number: 1, name: 'One', enabled: true, lessons: 2 },
    { id: 'two', number: 2, name: 'Two', enabled: true, lessons: 2 },
  ],
  questOrder: ['q1', 'q2', 'boss', 'side', 'q3'],
  questInfo: {
    q1: {
      region: 'one',
      type: 'make',
      title: 'Q1',
      item: 'quill',
      xp: 50,
      phases: [],
      sideQuest: false,
      prerequisites: [],
    },
    q2: {
      region: 'one',
      type: 'fix',
      title: 'Q2',
      item: null,
      xp: 35,
      phases: [],
      sideQuest: false,
      prerequisites: ['q1'],
    },
    boss: {
      region: 'one',
      type: 'boss',
      title: 'B',
      item: null,
      xp: 80,
      phases: ['p1', 'p2'],
      sideQuest: false,
      prerequisites: ['q2'],
    },
    side: {
      region: 'one',
      type: 'make',
      title: 'S',
      item: null,
      xp: 40,
      phases: [],
      sideQuest: true,
      prerequisites: ['boss'],
    },
    q3: {
      region: 'two',
      type: 'make',
      title: 'Q3',
      item: null,
      xp: 50,
      phases: [],
      sideQuest: false,
      prerequisites: [],
    },
  },
  sideQuests: true,
} as unknown as Course;

describe('progress rules', () => {
  it('unlocks quests and regions in order', () => {
    const p = newProfile('Newt', 'avatar-1', 'moss', 'one');
    expect(questState(p, course, 'q1')).toBe('available');
    expect(questState(p, course, 'q2')).toBe('locked');
    expect(questState(p, course, 'q3')).toBe('locked');
    expect(regionUnlocked(p, course, 'two')).toBe(false);
    completeQuest(p, course, 'q1', 'print(1)');
    expect(questState(p, course, 'q2')).toBe('available');
    recordAttempt(p, 'q2', 'x', false);
    expect(questState(p, course, 'q2')).toBe('in_progress');
  });

  it('awards XP and items once, and never takes XP away', () => {
    const p = newProfile('Newt', 'avatar-1', 'moss', 'one');
    const first = completeQuest(p, course, 'q1', 'a');
    expect(first).toMatchObject({ xp: 50, item: 'quill', levelUp: 2 });
    const again = completeQuest(p, course, 'q1', 'b');
    expect(again.xp).toBe(0);
    expect(p.xp).toBe(50);
    expect(p.items).toEqual(['quill']);
    expect(p.quests.q1?.solution).toBe('b');
  });

  it('defeats a boss after every phase, then unlocks the next region', () => {
    const p = newProfile('Newt', 'avatar-1', 'moss', 'one');
    expect(completePhase(p, course, 'boss', 'p1', 'x').bossDefeated).toBe(false);
    expect(completePhase(p, course, 'boss', 'p1', 'x').xp).toBe(0);
    const last = completePhase(p, course, 'boss', 'p2', 'y');
    expect(last.bossDefeated).toBe(true);
    expect(last.xp).toBe(40 + 50);
    expect(regionUnlocked(p, course, 'two')).toBe(true);
    expect(questState(p, course, 'q3')).toBe('available');
  });

  it('counts distinct attempts and failures before a pass', () => {
    const p = newProfile('Newt', 'avatar-1', 'moss', 'one');
    recordAttempt(p, 'q1', 'a', false);
    recordAttempt(p, 'q1', 'a ', false);
    recordAttempt(p, 'q1', 'b', true);
    expect(p.quests.q1).toMatchObject({ attempts: 3, failedBeforePass: 2 });
    expect(p.quests.q1?.codeHashes).toHaveLength(2);
  });

  it('knowledge checks give XP once and keep the best score', () => {
    const p = newProfile('Newt', 'avatar-1', 'moss', 'one');
    expect(completeCheck(p, 'one', 2, 4)).toBe(20);
    expect(completeCheck(p, 'one', 4, 4)).toBe(0);
    expect(completeCheck(p, 'one', 1, 4)).toBe(0);
    expect(p.checks.one).toEqual({ best: 4, latest: 1, total: 4, attempts: 3 });
  });

  it('detects unsaved progress via the progress hash', () => {
    const p = newProfile('Newt', 'avatar-1', 'moss', 'one');
    const before = progressHash(p);
    completeQuest(p, course, 'q1', 'a');
    expect(progressHash(p)).not.toBe(before);
  });
});

describe('progress rules (Phase 1 audit)', () => {
  it('marks a quest in progress as soon as it is opened (F-QST-01)', () => {
    const p = newProfile('Newt', 'avatar-1', 'moss', 'one');
    record(p, 'q1');
    expect(questState(p, course, 'q1')).toBe('in_progress');
  });

  it('keeps boss hints per phase, unlocking in order (F-FBK-11)', () => {
    const p = newProfile('Newt', 'avatar-1', 'moss', 'one');
    useHint(p, 'boss', 2, 'p1');
    expect(hintsShown(p, 'boss', 'p1')).toBe(2);
    expect(hintsShown(p, 'boss', 'p2')).toBe(0);
    expect(hintsShown(p, 'boss')).toBe(2);
    useHint(p, 'boss', 1, 'p1');
    expect(hintsShown(p, 'boss', 'p1')).toBe(2);
  });

  it('can make the knowledge check gate the next region (F-BOS-04)', () => {
    const p = newProfile('Newt', 'avatar-1', 'moss', 'one');
    for (const ph of ['p1', 'p2']) completePhase(p, course, 'boss', ph, 'x');
    expect(regionUnlocked(p, course, 'two')).toBe(true);
    configureRules({ knowledgeCheckGates: true, sideQuests: true });
    try {
      expect(regionUnlocked(p, course, 'two')).toBe(false);
      completeCheck(p, 'one', 2, 4);
      expect(regionUnlocked(p, course, 'two')).toBe(true);
    } finally {
      configureRules({ knowledgeCheckGates: false, sideQuests: true });
    }
  });

  it('starts new profiles with the deploy defaults, and can hide side quests (F-DEP-02)', () => {
    const p = newProfile('Newt', 'avatar-1', 'moss', 'one', { textScale: 1.5, replaySpeed: 'instant' });
    expect(p.settings).toMatchObject({ textScale: 1.5, replaySpeed: 'instant', reducedMotion: 'system' });
    for (const q of ['q1', 'q2']) completeQuest(p, course, q, 'x');
    for (const ph of ['p1', 'p2']) completePhase(p, course, 'boss', ph, 'x');
    expect(questState(p, course, 'side')).toBe('available');
    configureRules({ knowledgeCheckGates: false, sideQuests: false });
    try {
      expect(questState(p, course, 'side')).toBe('locked');
    } finally {
      configureRules({ knowledgeCheckGates: false, sideQuests: true });
    }
  });

  it('shuffles knowledge-check options differently per attempt', () => {
    const a = shuffledOrder(4, 'one:0:1');
    expect([...a].sort()).toEqual([0, 1, 2, 3]);
    expect(shuffledOrder(4, 'one:0:1')).toEqual(a);
    const orders = new Set([0, 1, 2, 3, 4, 5].map((n) => shuffledOrder(4, `one:${n}:1`).join('')));
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe('progress files', () => {
  const c = { id: 'course', contentVersion: 'v1' } as Course;
  it('round-trips and rejects junk', () => {
    const p = newProfile('Newt', 'avatar-1', 'moss', 'one');
    const text = JSON.stringify(makeProgressFile(p, { q1: 'print(1)' }, c));
    const parsed = parseProgressFile(text);
    expect(parsed.ok && parsed.file.profile.nickname).toBe('Newt');
    expect(parseProgressFile('not json')).toEqual({ ok: false, reason: 'not-json' });
    expect(parseProgressFile('{"format":"other"}')).toEqual({ ok: false, reason: 'not-codeweald' });
    // A hand-edited file fails its checksum; without one (version 1), the schema catches it.
    expect(parseProgressFile(text.replace('"xp":0', '"xp":"lots"'))).toEqual({
      ok: false,
      reason: 'changed',
    });
    const unchecked = JSON.stringify({ ...JSON.parse(text), checksum: undefined }).replace(
      '"xp":0',
      '"xp":"lots"',
    );
    expect(parseProgressFile(unchecked)).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });
});

describe('the Quest Board (F-WLD-07, F-BOS-05)', () => {
  const withBoard = {
    ...course,
    questOrder: [...course.questOrder, 'extra', 'early-side'],
    questInfo: {
      ...course.questInfo,
      q1: { ...course.questInfo.q1!, npc: 'byte' },
      q2: { ...course.questInfo.q2!, npc: 'pip' },
      boss: { ...course.questInfo.boss!, npc: 'crier' },
      extra: { ...course.questInfo.q1!, title: 'Extra', npc: null, prerequisites: [] },
      'early-side': { ...course.questInfo.side!, title: 'Early', prerequisites: [] },
    },
  } as Course;

  it('lists side quests and quests no map NPC hands out', () => {
    expect(boardQuests(withBoard, 'one')).toEqual(['side', 'extra', 'early-side']);
    expect(coreQuests(withBoard, 'one')).toEqual(['q1', 'q2', 'extra']);
  });

  it("opens side quests only once the region's core quests are done", () => {
    const p = newProfile('Newt', 'avatar-1', 'moss', 'one');
    expect(questState(p, withBoard, 'early-side')).toBe('locked');
    expect(missingFor(p, withBoard, 'early-side')).toEqual(['q1', 'q2', 'extra']);
    for (const q of ['q1', 'q2']) completeQuest(p, withBoard, q, 'x');
    expect(missingFor(p, withBoard, 'early-side')).toEqual(['extra']);
    completeQuest(p, withBoard, 'extra', 'x');
    expect(questState(p, withBoard, 'early-side')).toBe('available');
    // A side quest never blocks anything: the boss doesn't need it.
    expect(missingFor(p, withBoard, 'boss')).toEqual([]);
  });
});

describe('regions left out of the course (F-AUT-11)', () => {
  const withSkipped = {
    ...course,
    regions: [
      course.regions[0]!,
      { id: 'mid', number: 2, name: 'Mid', enabled: false, lessons: 2 },
      { ...course.regions[1]!, number: 3 },
    ],
  } as Course;

  it('skips them in gating: beating region 1 opens region 3', () => {
    const p = newProfile('Newt', 'avatar-1', 'moss', 'one');
    expect(playableRegions(withSkipped).map((r) => r.id)).toEqual(['one', 'two']);
    expect(regionUnlocked(p, withSkipped, 'two')).toBe(false);
    for (const ph of ['p1', 'p2']) completePhase(p, withSkipped, 'boss', ph, 'x');
    expect(regionRestored(p, withSkipped, 'one')).toBe(true);
    expect(regionUnlocked(p, withSkipped, 'two')).toBe(true);
    expect(regionUnlocked(p, withSkipped, 'mid')).toBe(false);
  });
});
