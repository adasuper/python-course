import { describe, expect, it } from 'vitest';
import type { Course } from '../../src/content/types';
import { emptyRecord, newProfile } from '../../src/state/profile';
import { crc16, decodeSaveCode, encodeSaveCode, sameProfile } from '../../src/state/saveCode';

const course = {
  id: 'test',
  title: 'Test',
  contentVersion: 'abcd12345678',
  opening: [],
  regions: [
    { id: 'r-one', number: 1, name: 'One', enabled: true, lessons: 2 },
    { id: 'r-two', number: 2, name: 'Two', enabled: true, lessons: 2 },
  ],
  questOrder: ['a', 'b', 'boss', 'c'],
  questInfo: {
    a: {
      region: 'r-one',
      type: 'make',
      title: 'A',
      item: 'quill',
      xp: 50,
      phases: [],
      sideQuest: false,
      prerequisites: [],
      badge: null,
      bonus: [],
    },
    b: {
      region: 'r-one',
      type: 'fix',
      title: 'B',
      item: null,
      xp: 35,
      phases: [],
      sideQuest: false,
      prerequisites: ['a'],
      badge: null,
      bonus: ['tidy', 'fast-thinking'],
    },
    boss: {
      region: 'r-one',
      type: 'boss',
      title: 'Boss',
      item: null,
      xp: 120,
      phases: ['p1', 'p2', 'p3'],
      sideQuest: false,
      prerequisites: [],
      badge: null,
      bonus: [],
    },
    c: {
      region: 'r-two',
      type: 'make',
      title: 'C',
      item: null,
      xp: 50,
      phases: [],
      sideQuest: false,
      prerequisites: [],
      badge: null,
      bonus: [],
    },
  },
  sideQuests: true,
  glossary: {},
  items: {},
  badges: [
    {
      id: 'first-bug',
      name: 'First Bug Squashed',
      emoji: '🐞',
      description: [],
      trigger: { kind: 'quest_type_completed', type: 'fix' },
    },
    {
      id: 'tinkerer',
      name: 'Tinkerer',
      emoji: '🔧',
      description: [],
      trigger: { kind: 'distinct_attempts', count: 5 },
    },
  ],
  errors: {},
} as unknown as Course;
const choices = { avatars: ['avatar-1', 'avatar-2', 'avatar-3'], themes: ['ember', 'moss'] };

function sample() {
  const p = newProfile('Clever Newt', 'avatar-3', 'moss', 'r-one');
  p.xp = 245;
  p.quests.a = { ...emptyRecord(), status: 'completed', attempts: 3, hintsUsed: 2, activeSeconds: 7 * 60 };
  p.quests.boss = {
    ...emptyRecord(),
    status: 'in_progress',
    attempts: 12,
    phasesDone: ['p1', 'p3'],
    activeSeconds: 31 * 60,
  };
  p.checks['r-one'] = { best: 4, latest: 3, total: 4, attempts: 2 };
  p.location.region = 'r-two';
  return p;
}

describe('save codes', () => {
  it('round-trips progress (with bucketed attempts and time)', () => {
    const p = sample();
    const code = encodeSaveCode(p, course, choices);
    expect(code).toMatch(/^CW2-[0-9A-HJKMNP-TV-Z]{1,5}(-[0-9A-HJKMNP-TV-Z]{1,5})*$/);
    const r = decodeSaveCode(code, course, choices);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const q = r.profile;
    expect(q.nickname).toBe('Clever Newt');
    expect(q.avatarId).toBe('avatar-3');
    expect(q.themeId).toBe('moss');
    expect(q.xp).toBe(245);
    expect(q.quests.a).toMatchObject({
      status: 'completed',
      attempts: 3,
      hintsUsed: 2,
      activeSeconds: 5 * 60,
    });
    expect(q.quests.boss).toMatchObject({
      status: 'in_progress',
      attempts: 10,
      phasesDone: ['p1', 'p3'],
      activeSeconds: 30 * 60,
    });
    expect(q.quests.b).toBeUndefined();
    expect(q.items).toEqual(['quill']);
    expect(q.checks['r-one']?.best).toBe(4);
    expect(q.checks['r-two']).toBeUndefined();
    expect(q.location.region).toBe('r-two');
    expect(sameProfile(q.id, p.id)).toBe(true);
    expect(r.sameContent).toBe(true);
  });

  it("keeps bonus challenges and badges, even ones the quests alone can't show (version 2)", () => {
    const p = sample();
    p.quests.b = { ...emptyRecord(), status: 'completed', bonus: ['fast-thinking'] };
    // Tinkerer can't be worked out again from a save code (it needs the code hashes).
    p.badges = { tinkerer: '2026-10-01' };
    const r = decodeSaveCode(encodeSaveCode(p, course, choices), course, choices);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.quests.b?.bonus).toEqual(['fast-thinking']);
    expect(Object.keys(r.profile.badges).sort()).toEqual(['first-bug', 'tinkerer']);
  });

  it('still restores a version 1 code, working out its badges again', () => {
    // Made by the version 1 encoder (Phase 1), for a profile that completed "a" and "b".
    const v1 = 'CW1-3AYD2-8TAQK-81248-4A1C7-YKH2S-603R0-J22D0-00007-W0RCP-0';
    const r = decodeSaveCode(v1, course, choices);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile).toMatchObject({
      nickname: 'Old Newt',
      avatarId: 'avatar-2',
      themeId: 'ember',
      xp: 120,
    });
    expect(r.profile.quests.b).toMatchObject({ status: 'completed', hintsUsed: 1 });
    expect(r.profile.badges).toEqual({ 'first-bug': '2026-10-01' });
    expect(sameProfile(r.profile.id, '1234abcd-0000-4000-8000-000000000000')).toBe(true);
  });

  it('accepts lowercase, spaces and look-alike letters', () => {
    const code = encodeSaveCode(sample(), course, choices);
    const messy = ` ${code.toLowerCase().replace(/-/g, ' ').replace(/0/g, 'o').replace(/1/g, 'l')} `;
    expect(decodeSaveCode(messy, course, choices).ok).toBe(true);
  });

  it('catches typos with the check group', () => {
    const code = encodeSaveCode(sample(), course, choices);
    const chars = code.split('');
    let caught = 0;
    for (let i = 4; i < chars.length; i += 3) {
      if (chars[i] === '-') continue;
      const copy = [...chars];
      copy[i] = copy[i] === 'A' ? 'B' : 'A';
      const r = decodeSaveCode(copy.join(''), course, choices);
      if (!r.ok) caught++;
    }
    expect(caught).toBeGreaterThan(0);
    const result = decodeSaveCode(code.slice(0, -3) + 'ZZZ', course, choices);
    expect(result).toEqual({ ok: false, reason: 'typo' });
  });

  it('rejects junk and codes from a different course shape', () => {
    expect(decodeSaveCode('hello!', course, choices)).toEqual({ ok: false, reason: 'format' });
    const other = { ...course, questOrder: ['a', 'b'] } as Course;
    expect(decodeSaveCode(encodeSaveCode(sample(), course, choices), other, choices)).toEqual({
      ok: false,
      reason: 'course',
    });
  });

  it('crc16 changes when any bit changes', () => {
    const bits: number[] = Array.from({ length: 40 }, (_, i) => (i % 3 === 0 ? 1 : 0));
    const base = crc16(bits);
    for (let i = 0; i < bits.length; i++) {
      const flipped = [...bits];
      flipped[i] = 1 - flipped[i]!;
      expect(crc16(flipped)).not.toBe(base);
    }
  });
});
