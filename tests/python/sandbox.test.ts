import { beforeAll, describe, expect, it } from 'vitest';
import { getPyHost, type PyHost } from '../../scripts/lib/pyHost';
import type { ValidatorSpec } from '../../src/runtime/protocol';

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

  it("names who hands the answer over: the stage's first character (F-EXE-12)", () => {
    const npc = { kind: 'npc' as const, cast: [{ sprite: 'npc_merchant', name: 'The merchant' }] };
    const r = py.run({ code: 'n = input("How many pies? ")', inputs: ['5'], stage: npc });
    expect(r.actions[0]).toMatchObject({ t: 'input', value: '5', source: 'queue', by: 'The merchant' });
    const grid = {
      kind: 'grid' as const,
      grid: 'HN',
      npcs: { N: { sprite: 'npc_baker', name: 'Baker Bun' } },
    };
    expect(py.run({ code: 'input()', inputs: ['x'], stage: grid }).actions[0]).toMatchObject({
      by: 'Baker Bun',
    });
    expect(py.run({ code: 'input()', inputs: ['x'] }).actions[0]).not.toHaveProperty('by');
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
    // A while loop whose condition never changes says which name to change (Region 5).
    expect(r.error).toMatchObject({ key: 'limits.loop_while_unchanged', line: 2, params: { name: 'steps' } });
  });

  it('stops while True with no output', () => {
    const r = py.run({ code: 'x = 0\nwhile True:\n    x += 1' });
    expect(r.status).toBe('loop-budget');
    expect(r.error).toMatchObject({ key: 'limits.loop_while', line: 2 });
  });

  it('words a runaway for loop as a long loop, not a stuck condition', () => {
    const r = py.run({ code: 'n = 0\nfor i in range(10 ** 9):\n    n += 1' });
    expect(r.status).toBe('loop-budget');
    expect(r.error).toMatchObject({ key: 'limits.loop', line: 2 });
  });

  it('blames the name written first, and never one that is only called or asked', () => {
    const guess = py.run({ code: 'guess = 1\ndepth = 5\nwhile guess != depth:\n    x = 1' });
    expect(guess.error).toMatchObject({ key: 'limits.loop_while_unchanged', params: { name: 'guess' } });
    const asked = py.run({
      code: 'from codeweald import world\nsteps = 0\nwhile world.look() != "x" and steps < 3:\n    pass',
      stage: { kind: 'grid', grid: 'H.' },
    });
    // world.look() is an action, so the hero wears out first.
    expect(asked.error).toMatchObject({ key: 'limits.busy_while_unchanged', params: { name: 'steps' } });
    // A list changed with a method is changed.
    const gems = py.run({ code: 'gems = [1]\nwhile len(gems) > 0:\n    gems.append(1)\n    gems.pop(0)' });
    expect(gems.error).toMatchObject({ key: 'limits.loop_while', line: 2 });
  });

  it('says the same when a stuck loop wears out the hero or the scroll first', () => {
    const walk = py.run({
      code: 'from codeweald import hero\nsteps = 0\nwhile steps < 3:\n    hero.face("left")\n    hero.face("right")',
      stage: { kind: 'grid', grid: 'H.' },
    });
    expect(walk.status).toBe('action-budget');
    expect(walk.error).toMatchObject({
      key: 'limits.busy_while_unchanged',
      line: 3,
      params: { name: 'steps' },
    });
    const shout = py.run({ code: 'n = 0\nwhile n < 2:\n    print("dig dig dig dig")' });
    expect(shout.status).toBe('output-budget');
    expect(shout.error).toMatchObject({ key: 'limits.busy_while_unchanged', line: 2, params: { name: 'n' } });
    // A loop that does change its name keeps the plain message.
    const tired = py.run({
      code: 'from codeweald import hero\nn = 0\nwhile n < 10 ** 6:\n    hero.face("left")\n    n += 1',
      stage: { kind: 'grid', grid: 'H.' },
    });
    expect(tired.error).toMatchObject({ key: 'limits.actions' });
  });

  it('does not blame a name the loop does change', () => {
    const r = py.run({ code: 'steps = 0\nwhile steps < 10:\n    steps = steps - 1' });
    expect(r.error).toMatchObject({ key: 'limits.loop_while', line: 2 });
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

describe('sandbox escapes (specs §6.4)', () => {
  it.each(['js', 'pyodide', 'pyodide_js', '_pyodide', 'pyodide.ffi'])('blocks import %s', (mod) => {
    expect(py.run({ code: `import ${mod}` }).error?.key).toBe('import.not_allowed');
  });

  it('removes the JavaScript bridge modules from sys.modules after boot', () => {
    const left = py.pyodide.runPython(
      `import sys
",".join(m for m in sys.modules if m.split(".")[0] in ("js", "pyodide", "pyodide_js", "_pyodide"))`,
    ) as string;
    expect(left).toBe('');
  });

  it.each([
    ['__loader__.load_module("sys")', '__loader__'],
    ['__spec__', '__spec__'],
    ['print(__builtins__)', '__builtins__'],
    ['f = lambda: 0\nprint(f.__globals__)', '__globals__'],
    ['print(().__class__.__base__.__subclasses__())', '__class__'],
    ['def g():\n    yield 1\nx = g()\nprint(x.gi_frame)', 'gi_frame'],
    ['try:\n    1 / 0\nexcept Exception as e:\n    print(e.__traceback__)', '__traceback__'],
  ])('locks Python machinery: %s', (code, name) => {
    const r = py.run({ code });
    expect(r.status).toBe('error');
    expect(r.error?.key).toBe('sandbox.locked');
    expect(r.error?.params.name).toBe(name);
    expect(r.error?.line).toBeGreaterThan(0);
  });

  it('locks names built at run time too', () => {
    const r = py.run({ code: 'f = lambda: 0\nname = "__glo" + "bals__"\nprint(getattr(f, name))' });
    expect(r.error?.key).toBe('sandbox.locked');
    expect(r.error?.line).toBe(3);
    expect(py.run({ code: 'setattr(print, "__" + "class" + "__", 1)' }).error?.key).toBe('sandbox.locked');
  });

  it('still allows ordinary names and attributes', () => {
    const r = py.run({
      code: 'def hi():\n    """Says hi."""\n    return "hi"\nprint(hi.__name__, hi.__doc__, getattr("abc", "upper")())\nif __name__ == "__main__":\n    print("main")',
    });
    expect(r.status).toBe('ok');
    expect(r.output).toBe('hi Says hi. ABC\nmain\n');
  });

  it("can't trick a quest check by patching the game", () => {
    const stage = { kind: 'grid' as const, grid: 'H...' };
    const validators: ValidatorSpec[] = [{ type: 'state', hero_at: [3, 0] }];
    const attempts = [
      // The audit's proof: replace World.snapshot through a function's globals.
      'from codeweald import hero\ntype(hero).move.__globals__["World"].snapshot = lambda self: {"hero": [3, 0]}',
      // The same, with the name built at run time.
      'from codeweald import hero\ng = getattr(type(hero).move, "__glo" + "bals__")\ng["World"].snapshot = lambda self: {}',
      // Reaching for the internals through the package.
      'import codeweald\ncodeweald._world.World.snapshot = lambda self: {}',
      // Patching what students can reach doesn't change the real world state.
      'from codeweald import hero\ntype(hero).position = lambda self: (3, 0)',
    ];
    for (const code of attempts) {
      const r = py.run({ code, stage, validators });
      expect(r.validation?.passed ?? false).toBe(false);
    }
    // The honest solution still passes.
    const ok = py.run({ code: 'from codeweald import hero\nhero.move("right", 3)', stage, validators });
    expect(ok.validation?.passed).toBe(true);
  });
});
