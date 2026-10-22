// Import "Merge" keeps the best of both (docs/specs.md §12.3).
import { describe, expect, it } from 'vitest';
import { mergeDrafts, mergeProfiles, mergePrograms } from '../../src/state/merge';
import { emptyRecord, newProfile } from '../../src/state/profile';

function pair() {
  const local = newProfile('Here Fox', 'avatar-1', 'moss', 'one');
  const restored = structuredClone(local);
  restored.nickname = 'There Fox';
  return { local, restored };
}

describe('merging two saves of one adventurer', () => {
  it('joins completions, items, badges and corners, and takes the larger numbers', () => {
    const { local, restored } = pair();
    local.xp = 120;
    restored.xp = 300;
    local.quests.a = {
      ...emptyRecord(),
      status: 'completed',
      attempts: 2,
      hintsUsed: 1,
      completedOn: '2026-10-05',
      solution: 'mine',
    };
    restored.quests.a = {
      ...emptyRecord(),
      status: 'in_progress',
      attempts: 9,
      hintsUsed: 3,
      activeSeconds: 600,
    };
    restored.quests.b = { ...emptyRecord(), status: 'completed', bonus: ['x'], phasesDone: ['p1'] };
    local.quests.b = { ...emptyRecord(), status: 'in_progress', phasesDone: ['p2'], phaseHints: { p2: 2 } };
    local.items = ['quill'];
    restored.items = ['quill', 'feather'];
    local.badges = { 'clean-cast': '2026-10-09' };
    restored.badges = { 'clean-cast': '2026-10-02', tinkerer: '2026-10-03' };
    restored.poisVisited = { one: ['owl'] };
    local.poisVisited = { one: ['mill'] };
    restored.counters.realErrorViews = 7;
    local.checks.one = { best: 3, latest: 3, total: 4, attempts: 1 };
    restored.checks.one = { best: 2, latest: 2, total: 4, attempts: 2 };

    const p = mergeProfiles(local, restored);
    expect(p.nickname).toBe('Here Fox'); // the local look stays
    expect(p.xp).toBe(300);
    expect(p.quests.a).toMatchObject({
      status: 'completed',
      attempts: 9,
      hintsUsed: 3,
      activeSeconds: 600,
      solution: 'mine',
    });
    expect(p.quests.b).toMatchObject({ status: 'completed', bonus: ['x'], phaseHints: { p2: 2 } });
    expect(p.quests.b!.phasesDone!.sort()).toEqual(['p1', 'p2']);
    expect(p.items).toEqual(['quill', 'feather']);
    expect(p.badges).toEqual({ 'clean-cast': '2026-10-02', tinkerer: '2026-10-03' });
    expect(p.poisVisited.one!.sort()).toEqual(['mill', 'owl']);
    expect(p.counters.realErrorViews).toBe(7);
    expect(p.checks.one).toEqual({ best: 3, latest: 2, total: 4, attempts: 2 });
  });

  it('never loses anything either side had', () => {
    const { local, restored } = pair();
    local.quests.only = { ...emptyRecord(), status: 'completed' };
    restored.quests.other = { ...emptyRecord(), status: 'completed' };
    const p = mergeProfiles(local, restored);
    expect(Object.keys(p.quests).sort()).toEqual(['only', 'other']);
    expect(mergeProfiles(local, restored).xp).toBeGreaterThanOrEqual(Math.max(local.xp, restored.xp));
  });

  it('keeps local drafts and adds the missing ones; keeps the newer copy of each program', () => {
    expect(mergeDrafts({ a: 'here' }, { a: 'there', b: 'new' })).toEqual({ a: 'here', b: 'new' });
    const program = (id: string, savedOn: string, name = id) => ({
      id,
      name,
      code: '',
      mapId: 'meadow',
      savedOn,
    });
    const merged = mergePrograms(
      [program('x', '2026-10-01', 'old x'), program('y', '2026-10-05')],
      [program('x', '2026-10-04', 'new x'), program('z', '2026-10-02')],
    );
    expect(merged.map((p) => p.name)).toEqual(['y', 'new x', 'z']);
    expect(mergePrograms([program('a', '1'), program('b', '2')], [program('c', '3')], 2)).toHaveLength(2);
  });
});
