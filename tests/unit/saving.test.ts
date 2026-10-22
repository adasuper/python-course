// Old saves keep working (F-SAV-03), drafts are versioned, and save codes survive fuzzing
// (F-SAV-07, F-QA-02).
import 'fake-indexeddb/auto';
import { set, createStore } from 'idb-keyval';
import { describe, expect, it } from 'vitest';
import type { Course } from '../../src/content/types';
import { CURRENT_SCHEMA, FutureSaveError, MIGRATIONS, migrateProfile } from '../../src/state/migrations';
import { emptyRecord, newProfile, type Profile } from '../../src/state/profile';
import { fileChecksum, makeProgressFile, parseProgressFile } from '../../src/state/progressFile';
import { decodeSaveCode, encodeSaveCode } from '../../src/state/saveCode';
import { draftCode, Storage } from '../../src/state/storage';

/** A profile as version 1 of the game saved it (before counters and location.quest). */
function v1Profile(): Record<string, unknown> {
  const p = newProfile('Old Newt', 'avatar-1', 'moss', 'one') as unknown as Record<string, unknown>;
  const { counters: _c, ...rest } = p;
  return { ...rest, schemaVersion: 1, location: { region: 'one', at: [3, 4] } };
}

describe('migrations (F-SAV-03)', () => {
  it('1 → 2 adds counters and the open quest, keeping everything else', () => {
    const old = v1Profile();
    const p = MIGRATIONS[1]!(old) as unknown as Profile;
    expect(p.schemaVersion).toBe(2);
    expect(p.counters).toEqual({ realErrorViews: 0 });
    expect(p.location).toEqual({ region: 'one', at: [3, 4], quest: null });
    expect(p.nickname).toBe('Old Newt');
  });

  it('2 → 3 adds badges and the Workshop and Duck counters, keeping the error counter', () => {
    const v2 = MIGRATIONS[1]!(v1Profile());
    (v2.counters as Record<string, number>).realErrorViews = 4;
    const p = MIGRATIONS[2]!(v2) as unknown as Profile;
    expect(p.schemaVersion).toBe(3);
    expect(p.badges).toEqual({});
    expect(p.counters).toEqual({ realErrorViews: 4, workshopRuns: 0, duckChats: 0 });
  });

  it('3 → 4 adds the new settings with their defaults, keeping the old ones', () => {
    const v3 = MIGRATIONS[2]!(MIGRATIONS[1]!(v1Profile()));
    (v3.settings as Record<string, unknown>).textScale = 1.5;
    const p = MIGRATIONS[3]!(v3) as unknown as Profile;
    expect(p.schemaVersion).toBe(4);
    expect(p.settings).toMatchObject({
      textScale: 1.5,
      codeFont: 'atkinson',
      shortcuts: true,
      tts: { autoRead: false, rate: 1 },
      audio: { music: 0, effects: 0 },
    });
  });

  it('runs the whole chain up to the current schema', () => {
    expect(migrateProfile(v1Profile()).schemaVersion).toBe(CURRENT_SCHEMA);
    const current = newProfile('New', 'avatar-1', 'moss', 'one');
    expect(migrateProfile(current)).toEqual(current);
    const chain = {
      1: (p: Record<string, unknown>) => ({ ...p, schemaVersion: 2, a: 1 }),
      2: (p: Record<string, unknown>) => ({ ...p, schemaVersion: 3, b: 2 }),
    };
    expect(migrateProfile({ schemaVersion: 1 }, chain, 3)).toEqual({ schemaVersion: 3, a: 1, b: 2 });
  });

  it('refuses saves from a newer game, and junk', () => {
    expect(() => migrateProfile({ schemaVersion: CURRENT_SCHEMA + 1 })).toThrow(FutureSaveError);
    expect(() => migrateProfile('nope')).toThrow();
  });

  it('upgrades old profiles in storage and old progress files', async () => {
    const storage = await Storage.open();
    const old = v1Profile();
    await set(`profile:${old.id as string}`, old, createStore('codeweald', 'kv'));
    const loaded = (await storage.profiles()).find((p) => p.id === old.id);
    expect(loaded?.schemaVersion).toBe(CURRENT_SCHEMA);
    expect(loaded?.counters).toEqual({ realErrorViews: 0, workshopRuns: 0, duckChats: 0 });
    expect(loaded?.badges).toEqual({});

    const file = makeProgressFile(old as unknown as Profile, {}, { id: 'c', contentVersion: 'v' } as Course);
    const parsed = parseProgressFile(JSON.stringify(file));
    expect(parsed.ok && parsed.file.profile.location.quest).toBe(null);
  });

  it('keeps drafts as versioned records, and still reads old bare-string drafts', async () => {
    const storage = await Storage.open();
    const p = newProfile('Drafty', 'avatar-1', 'moss', 'one');
    await storage.saveDraft(p.id, 'q1', 'print(1)');
    await set(`draft:${p.id}:q2`, 'print(2)', createStore('codeweald', 'kv'));
    expect(await storage.drafts(p.id)).toEqual({ q1: 'print(1)', q2: 'print(2)' });
    expect(draftCode({ schemaVersion: 1, code: 'x' })).toBe('x');
    expect(draftCode(42)).toBeUndefined();
  });
});

// ----- save code fuzzing --------------------------------------------------------------

const QUESTS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'boss'];
const course = {
  id: 'fuzz',
  contentVersion: '1234abcd0000',
  regions: [
    { id: 'one', number: 1, name: 'One', enabled: true, lessons: 2 },
    { id: 'two', number: 2, name: 'Two', enabled: true, lessons: 2 },
  ],
  questOrder: QUESTS,
  questInfo: Object.fromEntries(
    QUESTS.map((q, i) => [
      q,
      {
        region: i < 5 ? 'one' : 'two',
        type: q === 'boss' ? 'boss' : 'make',
        title: q,
        item: i % 3 === 0 ? `item-${q}` : null,
        xp: 50,
        phases: q === 'boss' ? ['p1', 'p2', 'p3'] : [],
        sideQuest: false,
        prerequisites: [],
        badge: null,
        bonus: q === 'c' ? ['one', 'two', 'three'] : q === 'boss' ? ['p2/extra'] : [],
      },
    ]),
  ),
  sideQuests: true,
  badges: ['first', 'second', 'third', 'fourth'].map((id) => ({
    id,
    name: id,
    emoji: '⭐',
    description: [],
    trigger: { kind: 'counter', counter: 'duckChats', count: 99 },
  })),
} as unknown as Course;
const choices = { avatars: ['avatar-1', 'avatar-2', 'avatar-3'], themes: ['ember', 'moss', 'tide'] };

/** A small, seeded random generator, so failures can be reproduced. */
function rng(seed: number) {
  let s = seed >>> 0;
  return (n: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s % n;
  };
}

function randomProfile(r: (n: number) => number): Profile {
  const names = ['Clever Newt', 'Brave Otter', 'Zed', 'Sunny Fox 7', 'Quiet Moth'];
  const p = newProfile(names[r(names.length)]!, choices.avatars[r(3)]!, choices.themes[r(3)]!, 'one');
  p.xp = r(5000);
  for (const q of QUESTS) {
    const status = r(3);
    if (status === 0) continue;
    p.quests[q] = {
      ...emptyRecord(),
      status: status === 2 ? 'completed' : 'in_progress',
      hintsUsed: r(4) as 0 | 1 | 2 | 3,
      attempts: r(40),
      activeSeconds: r(3600),
    };
    if (q === 'boss') p.quests[q]!.phasesDone = ['p1', 'p2', 'p3'].filter(() => r(2) === 1);
  }
  if (r(2)) p.checks.one = { best: r(5), latest: 0, total: 5, attempts: 1 };
  for (const [q, keys] of [
    ['c', ['one', 'two', 'three']],
    ['boss', ['p2/extra']],
  ] as const)
    if (p.quests[q]) p.quests[q]!.bonus = keys.filter(() => r(2) === 1);
  for (const b of ['first', 'second', 'third', 'fourth']) if (r(2)) p.badges[b] = '2026-10-01';
  p.location.region = r(2) ? 'one' : 'two';
  return p;
}

describe('save codes under fuzzing (F-SAV-07)', () => {
  it('round-trips 300 random profiles', () => {
    const r = rng(20261022);
    for (let n = 0; n < 300; n++) {
      const p = randomProfile(r);
      const decoded = decodeSaveCode(encodeSaveCode(p, course, choices), course, choices);
      expect(decoded.ok).toBe(true);
      if (!decoded.ok) return;
      const q = decoded.profile;
      expect([q.nickname, q.avatarId, q.themeId, q.xp, q.location.region]).toEqual([
        p.nickname,
        p.avatarId,
        p.themeId,
        p.xp,
        p.location.region,
      ]);
      for (const id of QUESTS) {
        expect(q.quests[id]?.status).toBe(p.quests[id]?.status);
        expect(q.quests[id]?.hintsUsed).toBe(p.quests[id]?.hintsUsed);
      }
      expect(q.checks.one?.best).toBe(p.checks.one?.best);
      expect(Object.keys(q.badges).sort()).toEqual(Object.keys(p.badges).sort());
      for (const id of ['c', 'boss']) expect(q.quests[id]?.bonus ?? []).toEqual(p.quests[id]?.bonus ?? []);
    }
  });

  it('catches every single-character typo and every swap of two neighbors', () => {
    const r = rng(7);
    const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    for (let n = 0; n < 20; n++) {
      const code = encodeSaveCode(randomProfile(r), course, choices);
      const chars = code.split('');
      for (let i = 4; i < chars.length; i++) {
        if (chars[i] === '-') continue;
        const typo = [...chars];
        typo[i] = ALPHABET[(ALPHABET.indexOf(chars[i]!) + 1 + r(31)) % 32]!;
        expect(decodeSaveCode(typo.join(''), course, choices).ok).toBe(false);
        const j = chars[i + 1] === '-' ? i + 2 : i + 1;
        if (j < chars.length && chars[j] !== chars[i]) {
          const swap = [...chars];
          [swap[i], swap[j]] = [swap[j]!, swap[i]!];
          expect(decodeSaveCode(swap.join(''), course, choices).ok).toBe(false);
        }
      }
    }
  });
});

// ----- progress files: version 2, checksums, untrusted input (F-OFF-07) -------------------

describe('progress files', () => {
  const fileCourse = { id: 'c', contentVersion: 'v' } as Course;
  const program = { id: 'p1', name: 'Greeter', code: 'print("hi")', mapId: 'meadow', savedOn: '2026-10-20' };
  const sample = () => {
    const p = newProfile('File Fox', 'avatar-1', 'moss', 'one');
    p.quests.a = { ...emptyRecord(), status: 'completed', solution: 'print(1)' };
    return makeProgressFile(p, { a: 'print(1)' }, fileCourse, [program]);
  };

  it('keeps Workshop programs and checks its checksum', () => {
    const text = JSON.stringify(sample());
    const parsed = parseProgressFile(text);
    expect(parsed.ok && parsed.file.programs).toEqual([program]);
    const edited = text.replace('"xp":0', '"xp":99999');
    expect(parseProgressFile(edited)).toEqual({ ok: false, reason: 'changed' });
  });

  it('still reads version 1 files (no programs, no checksum)', () => {
    const { programs: _p, checksum: _c, ...v1 } = { ...sample(), version: 1 };
    const parsed = parseProgressFile(JSON.stringify(v1));
    expect(parsed.ok && parsed.file.programs).toEqual([]);
  });

  it('refuses a nickname that the nickname rules would refuse', () => {
    const file = sample();
    file.profile.nickname = 'me@school.org';
    file.checksum = fileChecksum(file.profile, file.drafts, file.programs);
    expect(parseProgressFile(JSON.stringify(file))).toEqual({ ok: false, reason: 'invalid' });
  });

  it('never throws on damaged files, whatever is changed (fuzzing)', () => {
    const r = rng(42);
    const base = JSON.stringify(sample());
    for (let n = 0; n < 500; n++) {
      const chars = base.split('');
      for (let k = 0; k < 1 + r(4); k++) {
        const at = r(chars.length);
        const op = r(3);
        if (op === 0) chars.splice(at, 1);
        else if (op === 1) chars.splice(at, 0, '{}[]":,0a\\'[r(10)]!);
        else chars[at] = String.fromCharCode(32 + r(90));
      }
      const result = parseProgressFile(chars.join(''));
      if (result.ok) expect(result.file.profile.nickname.length).toBeGreaterThan(0);
    }
    expect(parseProgressFile('x'.repeat(6 * 1024 * 1024))).toEqual({ ok: false, reason: 'too-big' });
  });
});

describe('save codes across content versions (F-SAV-07)', () => {
  it('a later version of the course (new badges, new bonus challenges) still restores the code', () => {
    const r = rng(99);
    const later = {
      ...course,
      contentVersion: 'ffff00000000',
      questInfo: {
        ...course.questInfo,
        a: { ...course.questInfo.a!, bonus: ['brand-new'] },
        c: { ...course.questInfo.c!, bonus: ['one', 'two', 'three', 'four'] },
      },
      badges: [
        ...course.badges,
        {
          id: 'fifth',
          name: 'Fifth',
          emoji: '⭐',
          description: [],
          trigger: { kind: 'counter', counter: 'duckChats', count: 99 },
        },
      ],
    } as unknown as Course;
    for (let n = 0; n < 100; n++) {
      const p = randomProfile(r);
      const decoded = decodeSaveCode(encodeSaveCode(p, course, choices), later, choices);
      expect(decoded.ok).toBe(true);
      if (!decoded.ok) return;
      expect(decoded.sameContent).toBe(false);
      expect(decoded.profile.xp).toBe(p.xp);
      expect(Object.keys(decoded.profile.badges).sort()).toEqual(Object.keys(p.badges).sort());
      for (const id of QUESTS) expect(decoded.profile.quests[id]?.status).toBe(p.quests[id]?.status);
      // Bonus challenges keep their places; a challenge added at the end of a list is new.
      for (const id of ['c', 'boss'])
        expect(decoded.profile.quests[id]?.bonus ?? []).toEqual(p.quests[id]?.bonus ?? []);
    }
  });

  it('a code from a course with other quests is refused, not misread', () => {
    const other = { ...course, questOrder: [...QUESTS, 'extra'] } as unknown as Course;
    const code = encodeSaveCode(randomProfile(rng(5)), course, choices);
    expect(decodeSaveCode(code, other, choices)).toEqual({ ok: false, reason: 'course' });
  });

  it('random text never throws', () => {
    const r = rng(1234);
    const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ-';
    for (let n = 0; n < 500; n++) {
      const text = `CW2-${Array.from({ length: 10 + r(80) }, () => ALPHABET[r(ALPHABET.length)]).join('')}`;
      expect(() => decodeSaveCode(text, course, choices)).not.toThrow();
    }
  });
});
