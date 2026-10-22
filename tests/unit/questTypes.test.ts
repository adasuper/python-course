// Phase 2 quest-type rules (M2.1): Parsons `check: order`, session progress, bonus XP,
// predict twins.
import { describe, expect, it } from 'vitest';
import type { ParsonsSpec, PredictPrompt, PredictTwin } from '../../src/content/types';
import type { SessionRun } from '../../src/runtime/protocol';
import { newProfile } from '../../src/state/profile';
import { awardBonus, bonusDone } from '../../src/state/progress';
import { addRun, SESSION_LIMIT, sessionStatus } from '../../src/state/session';
import { predictionCorrect, twinCorrect } from '../../src/ui/quest/answers';
import { blocksFor, checkOrder, orderFeedback, programFrom } from '../../src/ui/quest/parsonsModel';

describe('Parsons check: order', () => {
  // A comment-only plan (the Region 11 blueprint style), with an allowed alternative.
  const spec: ParsonsSpec = {
    lines: [
      '# ask for a guess',
      '# compare it with the secret',
      '    # say "higher" or "lower"',
      '# say goodbye',
    ],
    distractors: ['# delete the secret'],
    fixedTop: [],
    indent: true,
    check: 'order',
    alternatives: [[1, 0, 2, 3]],
  };

  it('accepts the solution order and listed alternatives, indents included', () => {
    expect(checkOrder(spec, blocksFor(spec, [0, 1, 2, 3])).ok).toBe(true);
    expect(checkOrder(spec, blocksFor(spec, [1, 0, 2, 3])).ok).toBe(true);
  });

  it('rejects other orders, a wrong indent, a distractor and missing lines', () => {
    expect(checkOrder(spec, blocksFor(spec, [0, 2, 1, 3]))).toEqual({ ok: false, rightPrefix: 1 });
    const flat = blocksFor(spec, [0, 1, 2, 3]).map((b) => ({ ...b, indent: 0 }));
    expect(checkOrder(spec, flat)).toEqual({ ok: false, rightPrefix: 2 });
    expect(checkOrder(spec, blocksFor(spec, [0, 1, 2, 3, 4])).ok).toBe(false);
    expect(checkOrder(spec, blocksFor(spec, [0, 1, 2])).ok).toBe(false);
  });

  it('treats two identical lines as interchangeable', () => {
    const twins: ParsonsSpec = {
      ...spec,
      lines: ['hero.move("right")', 'hero.move("right")', 'hero.say("hi")'],
      alternatives: [],
    };
    expect(checkOrder(twins, blocksFor(twins, [1, 0, 2])).ok).toBe(true);
  });

  it('says how much of the order is right, without giving it away', () => {
    expect(orderFeedback(0)).toMatch(/which line should come first/);
    expect(orderFeedback(1)).toMatch(/first line is in the right place/);
    expect(orderFeedback(3)).toMatch(/first 3 lines are/);
  });

  it('builds the program from blocks', () => {
    expect(programFrom(spec, blocksFor(spec, [0, 1, 2]))).toBe(
      '# ask for a guess\n# compare it with the secret\n    # say "higher" or "lower"\n',
    );
  });
});

describe('session progress (mirrors the Python session validators)', () => {
  const run = (over: Partial<SessionRun>): SessionRun => ({
    program: 'p1',
    ok: true,
    inputs: [],
    shape: '1.1if,1.2elif,1.3else',
    lines: [2, 4, 6],
    lit: [],
    ...over,
  });

  it('lights lamps across runs of a program with the same doors', () => {
    const history = [
      run({ lit: ['1.1'] }),
      run({ shape: '1.1if', lines: [2], lit: ['1.1'] }),
      run({ lit: ['1.3'] }),
    ];
    const status = sessionStatus(history, [{ type: 'branch_coverage', min: 'all' }]);
    expect(status.lamps).toEqual([
      { id: '1.1', kind: 'if', line: 2, lit: true },
      { id: '1.2', kind: 'elif', line: 4, lit: false },
      { id: '1.3', kind: 'else', line: 6, lit: true },
    ]);
    expect(status.lampsNeeded).toBe(3);
    expect(status.okRuns).toBeNull();
  });

  it('counts finished runs of the latest program, with different inputs if asked', () => {
    const history = [
      run({ program: 'old', inputs: ['1'] }),
      run({ inputs: ['1'] }),
      run({ inputs: ['1'] }),
      run({ inputs: ['2'], ok: false }),
      run({ inputs: ['3'] }),
    ];
    expect(sessionStatus(history, [{ type: 'runs_ok', min_runs: 3 }]).okRuns).toBe(3);
    const distinct = sessionStatus(history, [{ type: 'runs_ok', min_runs: 3, distinct_inputs: true }]);
    expect([distinct.okRuns, distinct.runsNeeded, distinct.distinctInputs]).toEqual([2, 3, true]);
  });

  it('shows nothing before the first run, and keeps the newest runs only', () => {
    expect(sessionStatus([], [{ type: 'branch_coverage' }]).lamps).toEqual([]);
    let history: SessionRun[] = [];
    for (let i = 0; i < SESSION_LIMIT + 5; i++) history = addRun(history, run({ inputs: [String(i)] }));
    expect(history).toHaveLength(SESSION_LIMIT);
    expect(history.at(-1)!.inputs).toEqual([String(SESSION_LIMIT + 4)]);
  });
});

describe('bonus challenges', () => {
  it('give their XP once, and remember which were done (per boss phase)', () => {
    const p = newProfile('Bonus Fox', 'avatar-1', 'moss', 'one');
    const first = awardBonus(p, 'q1', [
      { id: 'symmetry', xp: 15 },
      { id: 'border', xp: 10 },
    ]);
    expect(first).toMatchObject({ xp: 25, ids: ['symmetry', 'border'] });
    expect(p.xp).toBe(25);
    expect(awardBonus(p, 'q1', [{ id: 'symmetry', xp: 15 }])).toMatchObject({ xp: 0, ids: [] });
    expect(p.xp).toBe(25);
    expect(bonusDone(p, 'q1', 'border')).toBe(true);
    expect(bonusDone(p, 'q2', 'border')).toBe(false);
    awardBonus(p, 'boss', [{ id: 'extra', xp: 5 }], 'phase-1');
    expect(bonusDone(p, 'boss', 'extra', 'phase-1')).toBe(true);
    expect(bonusDone(p, 'boss', 'extra', 'phase-2')).toBe(false);
  });

  it('report a level-up', () => {
    const p = newProfile('Bonus Fox', 'avatar-1', 'moss', 'one');
    p.xp = 45;
    expect(awardBonus(p, 'q1', [{ id: 'b', xp: 10 }]).levelUp).toBe(2);
  });
});

describe('predictions and twins', () => {
  const mcq: PredictPrompt = {
    kind: 'mcq',
    question: [],
    options: ['3', '4', '5'],
    answer: 1,
    explain: [],
    twin: null,
  };
  it('checks an MCQ prediction by the chosen option', () => {
    expect(predictionCorrect(mcq, 1, 'anything')).toBe(true);
    expect(predictionCorrect(mcq, 0, '4')).toBe(false);
    expect(predictionCorrect(mcq, undefined, '4')).toBe(false);
  });
  it('checks a twin against its (build-verified) answer', () => {
    const text: PredictTwin = {
      kind: 'text',
      code: 'print(2)',
      question: [],
      answer: 'Gold: 2\nDone',
      explain: [],
    };
    expect(twinCorrect(text, '  Gold: 2 \n Done\n')).toBe(true);
    expect(twinCorrect(text, 'Gold: 3')).toBe(false);
    const choice: PredictTwin = {
      kind: 'mcq',
      code: 'print(2)',
      question: [],
      options: ['1', '2', '3'],
      answer: 1,
      explain: [],
    };
    expect(twinCorrect(choice, 1)).toBe(true);
    expect(twinCorrect(choice, 2)).toBe(false);
  });
});
