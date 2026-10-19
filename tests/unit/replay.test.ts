import { describe, expect, it } from 'vitest';
import { narrate } from '../../src/game/narration';
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
