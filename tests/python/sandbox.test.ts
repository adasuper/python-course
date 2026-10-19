import { beforeAll, describe, expect, it } from 'vitest';
import { getPyHost, type PyHost } from '../../scripts/lib/pyHost';

let py: PyHost;
beforeAll(async () => {
  py = await getPyHost();
});

describe('sandbox', () => {
  it.each(['os', 'sys', 'js', 'pyodide', 'subprocess', 'urllib.request', 'codeweald._world'])(
    'blocks import %s',
    (mod) => {
      const r = py.run({ code: `import ${mod}` });
      expect(r.error?.key).toBe('import.not_allowed');
    },
  );

  it('allows the allowlisted modules', () => {
    const r = py.run({ code: 'import math, random, time\nfrom codeweald import hero\nprint(math.sqrt(16))' });
    expect(r.status).toBe('ok');
    expect(r.output).toBe('4.0\n');
  });

  it.each(['open("x.txt")', 'eval("1+1")', 'exec("x=1")', 'compile("1", "f", "eval")'])(
    'blocks %s',
    (code) => {
      expect(py.run({ code }).error?.key).toBe('sandbox.blocked');
    },
  );

  it('turns time.sleep into a replay pause and a virtual clock', () => {
    const r = py.run({ code: 'import time\nt = time.time()\ntime.sleep(10)\nprint(time.time() - t)' });
    expect(r.actions[0]).toMatchObject({ t: 'wait', seconds: 3 });
    expect(r.output).toBe('10.0\n');
  });

  it('makes random repeatable with a seed', () => {
    const code = 'import random\nprint(random.randint(1, 1000), random.choice("abcdef"))';
    expect(py.run({ code, seed: 7 }).output).toBe(py.run({ code, seed: 7 }).output);
    expect(py.run({ code, seed: 7 }).output).not.toBe(py.run({ code, seed: 8 }).output);
  });

  it('feeds input() from the quest queue and echoes it', () => {
    const r = py.run({ code: 'n = int(input("How many? "))\nprint(n * 2)', inputs: ['4'] });
    expect(r.output).toBe('How many? 4\n8\n');
    expect(r.actions[0]).toMatchObject({
      t: 'input',
      prompt: 'How many? ',
      value: '4',
      source: 'queue',
      ln: 1,
    });
  });

  it('asks the player when the queue runs out in interactive mode', () => {
    const r = py.run({ code: 'a = input("A? ")\nb = input("B? ")', inputs: ['1'], interactiveInput: true });
    expect(r.status).toBe('needs-input');
    expect(r.needsInput).toEqual({ prompt: 'B? ' });
  });

  it('explains an empty queue in quest mode', () => {
    expect(py.run({ code: 'input("?")' }).error?.key).toBe('input.empty');
  });

  it('ends quietly on exit()', () => {
    const r = py.run({ code: 'print(1)\nexit()\nprint(2)' });
    expect(r.status).toBe('ok');
    expect(r.output).toBe('1\n');
  });

  it('snapshots top-level variables for the Jar Shelf', () => {
    const r = py.run({ code: 'gold = 7\nname = "Byte"\ndef heal(points):\n    return points\nimport math' });
    expect(r.vars).toEqual([
      { name: 'gold', type: 'int', repr: '7' },
      { name: 'name', type: 'str', repr: "'Byte'" },
      { name: 'heal', type: 'function', repr: 'heal(points)' },
    ]);
  });
});

describe('budgets', () => {
  it('stops an infinite while loop and names the loop line', () => {
    const r = py.run({
      code: 'steps = 0\nwhile steps < 10:\n    print("dig")\n',
      limits: { maxOutputChars: 10_000_000 },
    });
    expect(r.status).toBe('loop-budget');
    expect(r.error).toMatchObject({ key: 'limits.loop', line: 2 });
  });

  it('stops while True with no output', () => {
    const r = py.run({ code: 'x = 0\nwhile True:\n    x += 1' });
    expect(r.status).toBe('loop-budget');
    expect(r.error?.line).toBe(2);
  });

  it('counts loops inside functions too', () => {
    const r = py.run({ code: 'def spin():\n    while True:\n        pass\nspin()' });
    expect(r.status).toBe('loop-budget');
    expect(r.error?.line).toBe(2);
  });

  it('allows ordinary loops', () => {
    const r = py.run({ code: 'total = 0\nfor i in range(100000):\n    total += i\nprint(total)' });
    expect(r.status).toBe('ok');
    expect(r.output).toBe('4999950000\n');
  });

  it('stops a hero who walks forever', () => {
    const r = py.run({
      code: 'from codeweald import hero\nwhile True:\n    hero.move("left")',
      stage: { kind: 'grid', grid: 'H.' },
      limits: { maxActions: 50 },
    });
    expect(r.status).toBe('action-budget');
    expect(r.error?.key).toBe('limits.actions');
  });

  it('stops a print flood', () => {
    const r = py.run({ code: 'for i in range(10**6):\n    print("spam")', limits: { maxOutputChars: 1000 } });
    expect(r.status).toBe('output-budget');
  });

  it('explains runaway recursion', () => {
    const r = py.run({ code: 'def f(n):\n    return f(n + 1)\nf(0)' });
    expect(r.error?.key).toBe('limits.recursion');
  });
});
