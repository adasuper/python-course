import { describe, expect, it } from 'vitest';
import { narrate, narration, summarize } from '../../src/game/narration';
import { ReplayEngine, type ReplayView } from '../../src/game/replay';
import type { Action } from '../../src/runtime/protocol';

const actions: Action[] = [
  { t: 'move', dir: 'right', from: [0, 0], to: [1, 0], ln: 2 },
  { t: 'move', dir: 'right', from: [1, 0], to: [2, 0], ln: 2 },
  { t: 'out', stream: 'stdout', text: 'hi\n', ln: 3 },
  { t: 'bonk', dir: 'up', at: [2, 0], into: 'wall', ln: 4 },
  { t: 'say', text: 'Ouch', ln: 5 },
];

function fakeView() {
  const applied: string[] = [];
  const view: ReplayView = {
    apply: async (a, ms) => void applied.push(`${a.t}@${ms}`),
    reset: () => void applied.push('reset'),
  };
  return { view, applied };
}

describe('narration', () => {
  it('merges consecutive moves and skips printed output', () => {
    expect(narrate(actions)).toEqual(['Moved right 2 steps.', 'Bumped into the wall.', 'Hero says: Ouch']);
    expect(narrate([{ t: 'pickup', at: [0, 0], item: 'apple', ln: 1 }])).toEqual(['Picked up an apple.']);
  });

  const bonk = (into: string): Action => ({ t: 'bonk', dir: 'up', at: [0, 0], into, ln: 1 });
  const pick = (item: string | null): Action => ({ t: 'pickup', at: [0, 0], item, ln: 1 });
  const say = (text: string): Action => ({ t: 'say', text, ln: 1 });
  const move = (dir: 'up' | 'right'): Action => ({ t: 'move', dir, from: [0, 0], to: [0, 0], ln: 1 });

  it('merges bumps, pickups and speech too (F-API-12)', () => {
    expect(narrate([bonk('wall'), bonk('wall'), bonk('wall'), bonk('tree')])).toEqual([
      'Bumped into the wall 3 times.',
      'Bumped into a tree.',
    ]);
    expect(narrate([bonk('wall'), bonk('wall')])).toEqual(['Bumped into the wall twice.']);
    expect(narrate([pick('apple'), pick('key'), pick(null), pick('coin'), pick(null)])).toEqual([
      'Picked up an apple, a key and a coin.',
      'Nothing to pick up, twice.',
    ]);
    expect(narrate([say('Hi'), say('Bye')])).toEqual(['Hero says: Hi, then Bye']);
    expect(narrate([move('right'), move('right'), move('up'), say('Hi')])).toEqual([
      'Moved right 2 steps.',
      'Moved up.',
      'Hero says: Hi',
    ]);
  });

  it('sums up a replay shown all at once, unless it is short anyway', () => {
    const long = [
      move('right'),
      move('right'),
      bonk('wall'),
      say('A'),
      move('up'),
      pick('key'),
      bonk('wall'),
    ];
    expect(summarize(long)).toBe('The hero walked 3 steps, bumped twice, said 1 thing and picked up 1 item.');
    expect(narration(long, true)).toBe(summarize(long));
    expect(narration(long, false)).toContain('Moved right 2 steps.');
    expect(narration([move('right'), say('Hi')], true)).toBe('Moved right. Hero says: Hi');
    expect(summarize([{ t: 'out', stream: 'stdout', text: 'x', ln: 1 }])).toBeNull();
  });

  it('tells the screen which narration came from an instant replay', async () => {
    const { view } = fakeView();
    const calls: [number, boolean][] = [];
    const engine = new ReplayEngine(view, { onNarrate: (a, allAtOnce) => calls.push([a.length, allAtOnce]) });
    engine.load(actions);
    engine.setSpeed('instant');
    await engine.play();
    expect(calls).toEqual([[4, true]]);
    calls.length = 0;
    engine.load(actions);
    await engine.step();
    expect(calls).toEqual([[1, false]]);
  });
});

describe('replay engine', () => {
  it('plays everything in order and highlights each line', async () => {
    const { view, applied } = fakeView();
    const lines: (number | null)[] = [];
    const out: string[] = [];
    const engine = new ReplayEngine(view, {
      onLine: (l) => lines.push(l),
      onOutput: (a) => out.push(a.t === 'out' ? a.text : ''),
    });
    engine.load(actions);
    engine.setSpeed('instant');
    await engine.play();
    expect(engine.state).toBe('done');
    expect(applied).toEqual(['reset', 'move@0', 'move@0', 'bonk@0', 'say@0']);
    expect(out).toEqual(['hi\n']);
    expect(lines).toEqual([2, 2, 3, 4, 5, null]);
  });

  it('steps one action at a time', async () => {
    const { view, applied } = fakeView();
    const engine = new ReplayEngine(view);
    engine.load(actions);
    await engine.step();
    expect(engine.position).toBe(1);
    expect(engine.state).toBe('paused');
    await engine.step();
    expect(applied.filter((a) => a.startsWith('move'))).toHaveLength(2);
    await engine.skipToEnd();
    expect(engine.state).toBe('done');
    expect(engine.position).toBe(actions.length);
  });

  it('a new load cancels the old replay', async () => {
    const { view } = fakeView();
    const engine = new ReplayEngine(view);
    engine.load(actions);
    engine.setSpeed(4);
    const playing = engine.play();
    engine.load([actions[0]!]);
    await playing;
    expect(engine.length).toBe(1);
  });
});
