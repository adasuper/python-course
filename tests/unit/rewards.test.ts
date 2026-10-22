// Progression details the Phase 2 audit found untested: level titles, default XP per quest
// type, first-try prediction accuracy, level-up and reward toasts, typed input, and the
// Workshop's program limit.
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { compileCourse, loadContent } from '../../scripts/lib/content';
import type { Course, QuestType } from '../../src/content/types';
import { DEFAULT_XP, SIDE_QUEST_XP } from '../../src/content/types';
import type { RunRequest, RunResult } from '../../src/runtime/protocol';
import { levelFor, newProfile, titleFor } from '../../src/state/profile';
import { recordPredictions } from '../../src/state/progress';
import { MAX_PROGRAMS, Storage, type Program } from '../../src/state/storage';
import { course, profile, profiles, toast, toasts, update } from '../../src/state/store';
import { MAX_TYPED_INPUTS, runWithInput } from '../../src/ui/runWithInput';

describe('levels and titles (F-PRG-03)', () => {
  it('names every level band', () => {
    expect([1, 2, 3, 4, 5, 7, 8, 10, 11, 12].map(titleFor)).toEqual([
      'Apprentice',
      'Apprentice',
      'Scribe',
      'Scribe',
      'Spellwright',
      'Spellwright',
      'Scriptwright',
      'Scriptwright',
      'Master Scriptwright',
      'Master Scriptwright',
    ]);
    // 25·n·(n−1) XP for level n.
    expect([0, 49, 50, 149, 150, 300, 2750].map(levelFor)).toEqual([1, 1, 2, 2, 3, 4, 11]);
  });

  it('celebrates a level-up with a toast from any change to the profile (F-PRG-08)', () => {
    course.value = {
      ...compileCourse(loadContent()),
      contentVersion: 'test',
    } as Course;
    const p = newProfile('Toast Toad', 'avatar-1', 'moss', 'hearthvale-village');
    profiles.value = [p];
    profile.value = p;
    toasts.value = [];
    update((x) => void (x.xp = 160));
    expect(toasts.value.map((t) => t.text)).toContainEqual(expect.stringMatching(/level 3: Scribe/));
    expect(toasts.value.find((t) => /level 3/.test(t.text))?.kind).toBe('celebrate');
    profile.value = null;
  });

  it('shows XP and items as a reward toast', () => {
    toasts.value = [];
    toast('reward', '+30 XP · New item: Quill', 0, '🎒');
    expect(toasts.value).toEqual([expect.objectContaining({ kind: 'reward', icon: '🎒' })]);
  });
});

describe('XP per quest (F-PRG-02)', () => {
  it('gives each quest type its default XP unless the quest says otherwise', () => {
    const content = loadContent();
    const compiled = compileCourse(content);
    for (const [id, q] of content.quests) {
      const xp = compiled.questInfo[id]!.xp;
      if (q.data.rewards.xp !== undefined) expect(xp, id).toBe(q.data.rewards.xp);
      else if (q.data.type === 'boss') expect(xp, id).toBe(q.data.phases.length * 40);
      else if (q.data.side_quest) expect(xp, id).toBe(SIDE_QUEST_XP);
      else expect(xp, id).toBe(DEFAULT_XP[q.data.type as QuestType]);
    }
    expect(DEFAULT_XP).toMatchObject({ predict: 20, investigate: 25, fix: 35, modify: 40, make: 50 });
  });
});

describe('predictions (F-QST-04)', () => {
  it('counts only the first try toward accuracy', () => {
    const p = newProfile('Newt', 'avatar-1', 'moss', 'r1');
    recordPredictions(p, 'q', [true, false]);
    recordPredictions(p, 'q', [true, true]);
    expect(p.quests.q).toMatchObject({ attempts: 2, predictionsTotal: 2, predictionsCorrectFirstTry: 1 });
  });
});

describe('typed input (F-EXE-13)', () => {
  const asking = (prompt: string): RunResult =>
    ({ status: 'needs-input', needsInput: { prompt }, output: `${prompt}\n` }) as unknown as RunResult;
  const done = { status: 'ok', output: 'done' } as unknown as RunResult;
  const request = { inputs: [], seed: 42 } as unknown as RunRequest;

  it('asks, then runs again from the top with the same seed and the answers so far', async () => {
    const seen: RunRequest[] = [];
    const run = async (req: RunRequest) => {
      seen.push(req);
      return req.inputs.length < 2 ? asking(`Q${req.inputs.length + 1}?`) : done;
    };
    const prompts: string[] = [];
    const out = await runWithInput(run, request, async (prompt) => (prompts.push(prompt), 'yes'));
    expect(out).toEqual({ result: done });
    expect(prompts).toEqual(['Q1?', 'Q2?']);
    expect(seen.map((r) => [r.seed, r.inputs])).toEqual([
      [42, []],
      [42, ['yes']],
      [42, ['yes', 'yes']],
    ]);
  });

  it('stops when the player cancels, and after 20 answers', async () => {
    expect(
      await runWithInput(
        async () => asking('Again?'),
        request,
        async () => null,
      ),
    ).toEqual({
      stopped: 'cancelled',
    });
    let asked = 0;
    const out = await runWithInput(
      async () => asking('Again?'),
      request,
      async () => (asked++, 'y'),
    );
    expect(out).toEqual({ stopped: 'too-many' });
    expect(asked).toBe(MAX_TYPED_INPUTS);
  });
});

describe('Workshop programs (F-WSH-03)', () => {
  it('keeps at most 20 programs', async () => {
    const storage = await Storage.open();
    const programs: Program[] = Array.from({ length: 25 }, (_, i) => ({
      id: `p${i}`,
      name: `Program ${i}`,
      code: 'print(1)',
      mapId: 'meadow',
      savedOn: `2026-01-${String(i + 1).padStart(2, '0')}`,
    }));
    await storage.savePrograms('someone', programs);
    const kept = await storage.programs('someone');
    expect(kept).toHaveLength(MAX_PROGRAMS);
    expect(MAX_PROGRAMS).toBe(20);
  });
});
