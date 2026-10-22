import { beforeAll, describe, expect, it } from 'vitest';
import { getPyHost, type PyHost } from '../../scripts/lib/pyHost';
import { DETECTOR_NAMES } from '../../src/content/schema';
import type { MistakeSpec, ValidatorSpec } from '../../src/runtime/protocol';

let py: PyHost;
beforeAll(async () => {
  py = await getPyHost();
});

const check = (code: string, validators: ValidatorSpec[], mistakes: MistakeSpec[] = [], extra = {}) =>
  py.run({ code, validators, mistakes, ...extra }).validation!;

describe('output validator', () => {
  it('normalized ignores trailing spaces and blank lines', () => {
    expect(check('print("Hi   ")\nprint()', [{ type: 'output', expect: 'Hi\n' }]).passed).toBe(true);
  });
  it('exact is strict', () => {
    expect(check('print("Hi ")', [{ type: 'output', match: 'exact', expect: 'Hi\n' }]).passed).toBe(false);
  });
  it('contains, regex and fuzzy', () => {
    expect(
      check('print("The gate opens!")', [{ type: 'output', match: 'contains', expect: 'gate opens' }]).passed,
    ).toBe(true);
    expect(
      check('print("Gold: 12")', [{ type: 'output', match: 'regex', expect_regex: '^Gold: \\d+$' }]).passed,
    ).toBe(true);
    expect(
      check('print("hello hearthvale")', [{ type: 'output', match: 'fuzzy', expect: 'Hello, Hearthvale!' }])
        .passed,
    ).toBe(true);
  });
  it('does not run validators when the program errors', () => {
    const v = check('print(x)', [{ type: 'output', expect: '1' }]);
    expect(v.passed).toBe(false);
    expect(v.results).toEqual([]);
    expect(v.feedback.source).toBe('error');
  });
});

describe('state, variable, ast and style validators', () => {
  const stage = { kind: 'grid' as const, grid: 'H..E' };
  it('state', () => {
    const code = 'from codeweald import hero\nhero.move("right", 3)\nhero.say("Made it!")';
    const v = check(code, [{ type: 'state', hero_on: 'exit', max_bonks: 0, said_contains: 'made it' }], [], {
      stage,
    });
    expect(v.passed).toBe(true);
  });
  it('variable', () => {
    expect(
      check('gold = 12', [{ type: 'variable', name: 'gold', equals: 12, value_type: 'int' }]).passed,
    ).toBe(true);
    expect(check('gold = "12"', [{ type: 'variable', name: 'gold', value_type: 'int' }]).passed).toBe(false);
    expect(check('x = 1', [{ type: 'variable', name: 'gold' }]).passed).toBe(false);
  });
  it('ast', () => {
    const code = 'gold = 7\nif gold >= 10:\n    print("in")\nelse:\n    print("out")';
    expect(
      check(code, [{ type: 'ast', require: ['If'], require_else: true, uses_names: ['gold'] }]).passed,
    ).toBe(true);
    expect(check('print("out")', [{ type: 'ast', require: ['If'], fail_hint: 'Use if' }]).feedback).toEqual({
      source: 'validator',
      id: 'ast',
      text: 'Use if',
    });
    expect(check('print(42)', [{ type: 'ast', no_literal: [42] }]).passed).toBe(false);
    expect(check('print(1)\nprint(2)', [{ type: 'ast', min_count: { print: 3 } }]).passed).toBe(false);
  });
  it('style counts real comments (ast cannot see them)', () => {
    const code = '# say hello\nprint("hi")\nprint("bye")  # wave\n#\n';
    expect(check(code, [{ type: 'style', min_comments: 2 }]).passed).toBe(true);
    expect(check(code, [{ type: 'style', min_comments: 3 }]).passed).toBe(false);
    expect(
      check('# greet\nprint("hi")\nprint("bye")', [{ type: 'style', comment_above: 'print' }]).passed,
    ).toBe(false);
  });
});

describe('hidden tests', () => {
  const solution = 'gold = 7\nif gold >= 10:\n    print("pass")\nelse:\n    print("stop")';
  const spec: ValidatorSpec = {
    type: 'hidden_tests',
    id: 'cases',
    mode: 'vars',
    compare: ['output'],
    cases: [{ vars: { gold: 10 } }, { vars: { gold: 3 } }],
  };

  it('bakes expectations from the reference solution', () => {
    const baked = py.bake({ code: solution, validators: [spec] });
    expect(baked.ok).toBe(true);
    const cases = (baked.validators![0] as unknown as { cases: { expect: { output: string } }[] }).cases;
    expect(cases.map((c) => c.expect.output)).toEqual(['pass', 'stop']);
  });

  it('passes the solution and catches an off-by-one boundary', () => {
    const baked = py.bake({ code: solution, validators: [spec] }).validators!;
    const mistakes: MistakeSpec[] = [
      {
        id: 'boundary',
        detect: { kind: 'hidden_case_fails', validator: 'cases', case: 0 },
        feedback: 'Try >=',
      },
    ];
    expect(check(solution, baked, mistakes).passed).toBe(true);
    const wrong = check(solution.replace('>=', '>'), baked, mistakes);
    expect(wrong.passed).toBe(false);
    expect(wrong.feedback).toEqual({ source: 'mistake', id: 'boundary', text: 'Try >=' });
  });

  it('fails clearly when the variable line was removed', () => {
    const baked = py.bake({ code: solution, validators: [spec] }).validators!;
    expect(check('print("stop")', baked).passed).toBe(false);
  });

  it('inputs and call modes', () => {
    const inputs: ValidatorSpec = {
      type: 'hidden_tests',
      mode: 'inputs',
      compare: ['output'],
      cases: [{ inputs: ['3'] }, { inputs: ['5'] }],
    };
    const sol = 'n = int(input())\nprint(n * 2)';
    const bakedInputs = py.bake({ code: sol, inputs: ['1'], validators: [inputs] }).validators!;
    expect(check(sol, bakedInputs, [], { inputs: ['1'] }).passed).toBe(true);
    expect(check('n = input()\nprint(n * 2)', bakedInputs, [], { inputs: ['1'] }).passed).toBe(false);

    const call: ValidatorSpec = {
      type: 'hidden_tests',
      mode: 'call',
      function: 'heal',
      compare: ['returns'],
      cases: [{ args: [5] }, { args: [0] }],
    };
    const fn = 'def heal(points):\n    return points + 10';
    const bakedCall = py.bake({ code: fn, validators: [call] }).validators!;
    expect(check(fn, bakedCall).passed).toBe(true);
    expect(check('def heal(points):\n    print(points + 10)', bakedCall).passed).toBe(false);
  });
});

describe('hidden tests on hidden maps (mode: stages)', () => {
  // A loop that walks until it sees the wall solves any corridor, not just the visible one.
  const sol =
    'from codeweald import hero, world\nwhile world.look() != "wall":\n    hero.move("right")\nhero.say("done")';
  const spec: ValidatorSpec = {
    type: 'hidden_tests',
    id: 'caves',
    mode: 'stages',
    compare: ['state'],
    cases: [{ stage: { kind: 'grid', grid: 'H....#' } }, { stage: { kind: 'grid', grid: 'H.#' } }],
  };
  const visible = { kind: 'grid' as const, grid: 'H...#' };

  it('bakes the hero position on each hidden map', () => {
    const baked = py.bake({ code: sol, stage: visible, validators: [spec] }).validators!;
    const cases = (baked[0] as unknown as { cases: { expect: { state: { hero: number[] } } }[] }).cases;
    expect(cases.map((c) => c.expect.state.hero)).toEqual([
      [4, 0],
      [1, 0],
    ]);
  });

  it('passes a general loop and catches steps counted for the visible map only', () => {
    const baked = py.bake({ code: sol, stage: visible, validators: [spec] }).validators!;
    expect(check(sol, baked, [], { stage: visible }).passed).toBe(true);
    const counted = 'from codeweald import hero\nhero.move("right", 3)\nhero.say("done")';
    const v = check(counted, baked, [], { stage: visible });
    expect(v.passed).toBe(false);
    expect(v.results[0]?.detail).toEqual({ failed_cases: [0, 1] });
  });
});

describe('session validators (scope: session)', () => {
  const game = [
    'answer = input("Pick a door: ")',
    'if answer == "1":',
    '    print("Gold!")',
    'elif answer == "2":',
    '    print("A dragon!")',
    'else:',
    '    # nothing here',
    '    print("Empty room.")',
  ].join('\n');
  type Session = NonNullable<ReturnType<PyHost['run']>['validation']>['session'];
  const play = (code: string, validators: ValidatorSpec[], answers: string[]) => {
    let session: NonNullable<Session>[] = [];
    let last: ReturnType<PyHost['run']> | null = null;
    for (const answer of answers) {
      last = py.run({ code, validators, inputs: [answer], coverage: true, session });
      session = [...session, last.validation!.session!];
    }
    return { last: last!, session };
  };

  it('branch_coverage lights a lamp for every door that has run', () => {
    const v: ValidatorSpec[] = [{ type: 'branch_coverage', id: 'doors', min: 'all' }];
    const { last, session } = play(game, v, ['1', '3']);
    expect(last.validation!.passed).toBe(false);
    expect(last.validation!.results[0]!.detail).toMatchObject({
      lit: 2,
      need: 3,
      lamps: [
        { id: '1.1', kind: 'if', line: 2, lit: true },
        { id: '1.2', kind: 'elif', line: 4, lit: false },
        { id: '1.3', kind: 'else', line: 6, lit: true },
      ],
    });
    expect(session[0]).toMatchObject({
      ok: true,
      inputs: ['1'],
      shape: '1.1if,1.2elif,1.3else',
      lines: [2, 4, 6],
    });
    const more = py.run({ code: game, validators: v, inputs: ['2'], coverage: true, session });
    expect(more.validation!.passed).toBe(true);
  });

  it('min: a number needs only that many doors', () => {
    const { last } = play(game, [{ type: 'branch_coverage', min: 2 }], ['1', '2']);
    expect(last.validation!.passed).toBe(true);
  });

  it('only counts runs of a program with the same doors', () => {
    const v: ValidatorSpec[] = [{ type: 'branch_coverage' }];
    const { session } = play(game, v, ['1', '2']);
    // Adding an elif makes a new set of doors, so the old lamps don't count for it.
    const bigger = game.replace('else:', 'elif answer == "3":\n    print("Stairs")\nelse:');
    const r = py.run({ code: bigger, validators: v, inputs: ['9'], coverage: true, session });
    expect(r.validation!.results[0]!.detail).toMatchObject({ lit: 1, need: 4 });
    // A changed comment or condition keeps the same doors.
    const edited = game.replace('# nothing here', '# empty').replace('"2"', '"two"');
    const same = py.run({ code: edited, validators: v, inputs: ['x'], coverage: true, session });
    expect(same.validation!.passed).toBe(true);
  });

  it('a program without any if fails branch_coverage', () => {
    const r = py.run({ code: 'print(1)', validators: [{ type: 'branch_coverage' }], coverage: true });
    expect(r.validation!.passed).toBe(false);
  });

  it('runs_ok counts finished runs of the same program, with different inputs if asked', () => {
    const v: ValidatorSpec[] = [{ type: 'runs_ok', min_runs: 3, distinct_inputs: true }];
    expect(play(game, v, ['1', '1', '2']).last.validation!.results[0]!.detail).toEqual({
      ok_runs: 2,
      need: 3,
    });
    expect(play(game, v, ['1', '2', '3']).last.validation!.passed).toBe(true);
    const plain = play(game, [{ type: 'runs_ok', min_runs: 3 }], ['1', '1', '1']);
    expect(plain.last.validation!.passed).toBe(true);
    // A crash doesn't count, and neither do runs of an earlier version of the program.
    const crashy = 'answer = input()\nprint(10 / int(answer))';
    const { session } = play(crashy, v, ['0', '5']);
    expect(session.map((r) => r.ok)).toEqual([false, true]);
    const fixed = crashy.replace('10 /', '10 //');
    const r = py.run({ code: fixed, validators: v, inputs: ['2'], session });
    expect(r.validation!.results[0]!.detail).toEqual({ ok_runs: 1, need: 3 });
  });

  it('only adds a session summary when the quest has session validators', () => {
    const r = py.run({ code: 'print(1)', validators: [{ type: 'output', expect: '1' }] });
    expect(r.validation!.session).toBeUndefined();
  });
});

describe('mistakes and feedback selection', () => {
  it('matches an error-key mistake before showing the raw translation', () => {
    const v = check(
      'print(hello)',
      [{ type: 'output', expect: 'hello' }],
      [
        {
          id: 'quotes',
          detect: { kind: 'error', key: 'name.missing_quotes' },
          feedback: 'Words need quotes!',
        },
      ],
    );
    expect(v.feedback).toEqual({ source: 'mistake', id: 'quotes', text: 'Words need quotes!' });
  });

  it('named detectors', () => {
    const fstring = check(
      'name = "Ada"\nprint("Hi {name}")',
      [{ type: 'output', expect: 'Hi Ada' }],
      [{ id: 'f', detect: { kind: 'detector', name: 'missing_fstring_prefix' }, feedback: 'Add f' }],
    );
    expect(fstring.feedback.id).toBe('f');
    const stored = check(
      'print(5 * 3)',
      [{ type: 'variable', name: 'gold' }],
      [
        {
          id: 's',
          detect: { kind: 'detector', name: 'printed_not_stored', var: 'gold' },
          feedback: 'Store it',
        },
      ],
    );
    expect(stored.feedback.id).toBe('s');
  });

  it('code_regex ignores comments by default', () => {
    const v = check(
      '# print(gold)\nprint(1)',
      [{ type: 'output', expect: '2' }],
      [{ id: 'r', detect: { kind: 'code_regex', pattern: 'print\\(gold\\)' }, feedback: 'x' }],
    );
    expect(v.feedback.source).toBe('generic');
  });

  it('awards bonus challenges only on success', () => {
    const r = py.run({
      code: 'print("hi")',
      validators: [{ type: 'output', expect: 'hi' }],
      bonus: [{ id: 'short', description: 'one line', xp: 10, check: { type: 'ast', max_lines: 1 } }],
    });
    expect(r.validation?.bonus).toEqual(['short']);
  });

  it('follows the §9.4 selection order', () => {
    const quotes: MistakeSpec = {
      id: 'quotes',
      detect: { kind: 'error', key: 'name.missing_quotes' },
      feedback: 'Words need quotes',
    };
    const said: MistakeSpec = {
      id: 'said-gold',
      detect: { kind: 'output_regex', pattern: 'gold', expect: 'present' },
      feedback: 'Store it first',
    };
    const silent: MistakeSpec = {
      id: 'silent',
      detect: { kind: 'output_regex', pattern: '.', expect: 'absent' },
      feedback: 'Print something',
    };
    const out: ValidatorSpec = { type: 'output', id: 'out', expect: 'Gold: 5', fail_hint: 'Print "Gold: 5"' };
    const quiet: ValidatorSpec = { type: 'ast', id: 'ast', require: ['For'] };
    // 1. A run error: the first mistake (in YAML order) that fires on it, else the error itself.
    expect(check('print(hello)', [out], [silent, quotes]).feedback).toMatchObject({
      source: 'mistake',
      id: 'silent',
    });
    expect(check('print(hello)', [out], [said, quotes]).feedback).toMatchObject({
      source: 'mistake',
      id: 'quotes',
    });
    expect(check('print(zzz + 1)', [out], [quotes]).feedback).toEqual({ source: 'error' });
    // 2. Validators failed: the first matching mistake, else the first failing hint, else generic.
    expect(check('print("gold")', [out], [silent, said]).feedback.id).toBe('said-gold');
    expect(check('print("x")', [quiet, out], [said]).feedback).toEqual({
      source: 'validator',
      id: 'out',
      text: 'Print "Gold: 5"',
    });
    expect(check('print("x")', [quiet], [said]).feedback).toEqual({ source: 'generic' });
    // 3. Everything passes: success.
    expect(check('print("Gold: 5")', [out], [said, silent]).feedback).toEqual({ source: 'success' });
  });

  it('state mistakes look at the world', () => {
    const stage = { kind: 'grid' as const, grid: 'H#.' };
    const bonked: MistakeSpec = { id: 'bonk', detect: { kind: 'state', min_bonks: 1 }, feedback: 'Ouch' };
    const code = 'from codeweald import hero\nhero.move("right")';
    expect(check(code, [{ type: 'state', hero_at: [2, 0] }], [bonked], { stage }).feedback.id).toBe('bonk');
    const stay = 'from codeweald import hero\nhero.say("hi")';
    expect(check(stay, [{ type: 'state', hero_at: [2, 0] }], [bonked], { stage }).feedback.source).toBe(
      'generic',
    );
  });

  it('runs custom checks', () => {
    const v = check('print("abc")', [
      {
        type: 'custom',
        python: 'def check(ctx):\n    return Fail("too short") if len(ctx.output) < 10 else Pass()',
      },
    ]);
    expect(v.feedback).toMatchObject({ source: 'validator', text: 'too short' });
  });
});

/** [detector, rule fields, code where it fires, code where it doesn't] */
const DETECTOR_CASES: [string, Record<string, unknown>, string, string][] = [
  ['missing_call_parens', {}, 'print', 'print("hi")'],
  [
    'missing_call_parens',
    {},
    'from codeweald import hero\nhero.say',
    'from codeweald import hero\nhero.say("hi")',
  ],
  ['printed_not_stored', { var: 'gold' }, 'print(5 * 3)', 'gold = 5 * 3\nprint(gold)'],
  ['stored_not_printed', { var: 'gold' }, 'gold = 15', 'gold = 15\nprint(gold)'],
  ['number_as_string', { var: 'gold' }, 'gold = "10"', 'gold = 10'],
  ['missing_fstring_prefix', {}, 'name = "Ada"\nprint("Hi {name}")', 'name = "Ada"\nprint(f"Hi {name}")'],
  ['assign_in_condition', {}, 'gold = 5\nif gold = 10:\n    pass', 'gold = 5\nif gold == 10:\n    pass'],
  ['loop_var_not_updated', {}, 'n = 0\nwhile n < 3:\n    print(n)', 'n = 0\nwhile n < 3:\n    n = n + 1'],
  [
    'function_not_called',
    { function: 'greet' },
    'def greet():\n    print("hi")',
    'def greet():\n    print("hi")\ngreet()',
  ],
  ['hardcoded_output', { text: '15' }, 'print(15)', 'gold = 5 * 3\nprint(gold)'],
  // The rest of the §9.4 library (M2.4).
  [
    'range_off_by_one',
    { last: 50 },
    'for toll in range(5, 50, 5):\n    print(toll)',
    'for toll in range(5, 55, 5):\n    print(toll)',
  ],
  [
    'range_off_by_one',
    { first: 1, last: 10 },
    'for n in range(10):\n    print(n)',
    'for n in range(1, 11):\n    print(n)',
  ],
  [
    'range_off_by_one',
    {},
    'xs = [1, 2]\nfor i in range(len(xs) + 1):\n    print(xs[i])',
    'xs = [1, 2]\nfor i in range(len(xs)):\n    print(xs[i])',
  ],
  [
    'infinite_while_true_without_break',
    {},
    'while True:\n    for i in range(3):\n        break',
    'while True:\n    answer = input()\n    if answer == "q":\n        break',
  ],
  [
    'function_prints_not_returns',
    { function: 'heal' },
    'def heal(hp):\n    print(hp + 10)\nx = heal(5)',
    'def heal(hp):\n    return hp + 10\nprint(heal(5))',
  ],
  [
    'return_inside_loop_too_early',
    {},
    'def has(items, x):\n    for i in items:\n        if i == x:\n            return True\n        else:\n            return False',
    'def has(items, x):\n    for i in items:\n        if i == x:\n            return True\n    return False',
  ],
  ['unused_variable', { var: 'total' }, 'total = 0\nprint(5)', 'total = 0\ntotal += 5\nprint(total)'],
  ['unused_variable', {}, 'gold = 5\nprint(3)', 'for i in range(3):\n    print("hi")'],
  ['shadowed_builtin', {}, 'list = [1, 2]\nprint(list)', 'items = [1, 2]\nprint(items)'],
  ['shadowed_builtin', { names: ['sum'] }, 'def sum(a, b):\n    return a + b', 'list = [1]'],
];

// Every named detector fires on its mistake and stays quiet otherwise (F-QA-03, §9.4).
describe('mistake detectors', () => {
  const NEVER: ValidatorSpec[] = [{ type: 'output', expect: '(never matches)' }];
  const fires = (code: string, rule: Record<string, unknown>) =>
    check(code, NEVER, [
      { id: 'm', detect: { kind: 'detector', ...rule } as MistakeSpec['detect'], feedback: 'x' },
    ]).feedback.id === 'm';

  it.each(DETECTOR_CASES)('%s (%j)', (name, extra, wrong, right) => {
    expect(fires(wrong, { name, ...extra })).toBe(true);
    expect(fires(right, { name, ...extra })).toBe(false);
  });

  it('covers every detector the schema allows, the whole §9.4 library (F-FBK-06)', () => {
    expect(new Set(DETECTOR_CASES.map((c) => c[0]))).toEqual(new Set(DETECTOR_NAMES));
    expect(DETECTOR_NAMES).toHaveLength(15);
  });
});

// Every validator field, not just every validator type (Phase 2 audit).
describe('validator fields', () => {
  const treasure = {
    kind: 'grid' as const,
    grid: 'Hg$C',
    chests: { C: { code: '42', loot: ['crown'] } },
  };
  const loot =
    'from codeweald import hero\nhero.move("right")\nhero.pick_up()\nhero.move("right")\nhero.pick_up()\n' +
    'hero.open_chest(42)\nhero.say("Mine!")\nhero.say("All mine!")';

  it('output: normalize options and a fuzzy threshold', () => {
    const out = (code: string, spec: Record<string, unknown>) =>
      check(code, [{ type: 'output', ...spec } as ValidatorSpec]).passed;
    expect(out('print("HELLO, World!")', { expect: 'hello world', normalize: ['case', 'punctuation'] })).toBe(
      true,
    );
    expect(out('print("HELLO, World!")', { expect: 'hello world' })).toBe(false);
    expect(out('print("a    b")', { expect: 'a b', normalize: ['spaces'] })).toBe(true);
    expect(
      out('print("GOLD: 7")', { match: 'regex', expect_regex: '^gold: \\d$', normalize: ['case'] }),
    ).toBe(true);
    expect(
      out('print("helo hearthvale")', { match: 'fuzzy', expect: 'Hello, Hearthvale!', threshold: 0.99 }),
    ).toBe(false);
    expect(
      out('print("helo hearthvale")', { match: 'fuzzy', expect: 'Hello, Hearthvale!', threshold: 0.8 }),
    ).toBe(true);
  });

  it('state: items, item counts, chests, exact speech, position, facing and visited tiles', () => {
    const state = (spec: Record<string, unknown>) =>
      check(loot, [{ type: 'state', ...spec } as ValidatorSpec], [], { stage: treasure }).passed;
    expect(state({ has_items: ['gem', 'crown'] })).toBe(true);
    expect(state({ has_items: ['key'] })).toBe(false);
    expect(state({ items_count: { gem: 1, coin: 1 } })).toBe(true);
    expect(state({ items_count: { gem: 2 } })).toBe(false);
    expect(state({ chests_opened: 1 })).toBe(true);
    expect(state({ chests_opened: ['C'] })).toBe(true);
    expect(state({ chests_opened: 2 })).toBe(false);
    expect(state({ said_exact: ['Mine!', 'All mine!'] })).toBe(true);
    expect(state({ said_exact: ['Mine!'] })).toBe(false);
    expect(state({ hero_at: [2, 0], facing: 'right', visited: [[1, 0]] })).toBe(true);
    expect(state({ visited: [[3, 0]] })).toBe(false);
  });

  it('variable: matches', () => {
    expect(
      check('name = "Ada the Bold"', [{ type: 'variable', name: 'name', matches: 'Bold$' }]).passed,
    ).toBe(true);
    expect(check('name = 7', [{ type: 'variable', name: 'name', matches: '7' }]).passed).toBe(false);
  });

  it('ast: forbid, require_calls, and a function with its parameters and return', () => {
    const fn = 'def heal(hp, bonus):\n    return hp + bonus\nprint(heal(1, 2))';
    expect(check(fn, [{ type: 'ast', forbid: ['While'], require_calls: ['heal', 'print'] }]).passed).toBe(
      true,
    );
    expect(check('while False:\n    pass', [{ type: 'ast', forbid: ['While'] }]).passed).toBe(false);
    expect(check('print(1)', [{ type: 'ast', require_calls: ['input'] }]).passed).toBe(false);
    const shape = { name: 'heal', params: 2, returns: true };
    expect(check(fn, [{ type: 'ast', function: shape }]).passed).toBe(true);
    expect(check('def heal(hp):\n    return hp', [{ type: 'ast', function: shape }]).passed).toBe(false);
    expect(check('def heal(hp, b):\n    print(hp)', [{ type: 'ast', function: shape }]).passed).toBe(false);
    expect(check('print(1)', [{ type: 'ast', function: shape }]).passed).toBe(false);
  });

  it('style: max_line_length', () => {
    expect(check('print("short")', [{ type: 'style', max_line_length: 20 }]).passed).toBe(true);
    expect(check(`print("${'x'.repeat(30)}")`, [{ type: 'style', max_line_length: 20 }]).passed).toBe(false);
  });

  it('hidden tests: mode seed, and comparing speech and variables', () => {
    const roll =
      'import random\nroll = random.randint(1, 6)\nfrom codeweald import hero\nhero.say(f"Rolled {roll}")';
    const spec: ValidatorSpec = {
      type: 'hidden_tests',
      mode: 'seed',
      compare: ['said', 'vars:roll'],
      cases: [{ seed: 1 }, { seed: 2 }, { seed: 3 }],
    };
    const stage = { kind: 'npc' as const };
    const baked = py.bake({ code: roll, validators: [spec], stage }).validators!;
    const expected = (baked[0] as unknown as { cases: { expect: Record<string, unknown> }[] }).cases;
    expect(expected.map((c) => c.expect['said'])).toEqual(
      expected.map((c) => [`Rolled ${c.expect['vars:roll'] as number}`]),
    );
    expect(check(roll, baked, [], { stage }).passed).toBe(true);
    // Always saying the same number fails at least one seed.
    expect(check(roll.replace('random.randint(1, 6)', '4'), baked, [], { stage }).passed).toBe(false);
  });

  it('mistakes: a custom detect(ctx) and validator_failed', () => {
    const mistakes: MistakeSpec[] = [
      {
        id: 'shouting',
        detect: { kind: 'custom', python: 'def detect(ctx):\n    return ctx.output.isupper()' },
        feedback: 'No need to shout.',
      },
      { id: 'no-hi', detect: { kind: 'validator_failed', id: 'hi' }, feedback: 'Say hi first.' },
    ];
    const hi: ValidatorSpec = { type: 'output', id: 'hi', match: 'contains', expect: 'hi' };
    expect(check('print("BYE")', [hi], mistakes).feedback).toMatchObject({ id: 'shouting' });
    expect(check('print("bye")', [hi], mistakes).feedback).toMatchObject({
      id: 'no-hi',
      text: 'Say hi first.',
    });
  });

  it('custom checks get .source .tree .output .lines .vars .world .run() and .call()', () => {
    const python = [
      'def check(ctx):',
      '    if "def heal" not in ctx.source or ctx.tree is None:',
      '        return Fail("source")',
      '    if ctx.lines != ["ready"] or ctx.vars["base"] != 5:',
      '        return Fail("output or vars")',
      '    if ctx.world.get("said") != ["Hi"]:',
      '        return Fail("world")',
      '    if ctx.run(vars={"base": 7}).vars["base"] != 7:',
      '        return Fail("run")',
      '    got = ctx.call("heal", 3)',
      '    if got["returns"] != 13 or got["output"] != "healing":',
      '        return Fail("call")',
      '    if ctx.call("missing")["error"] != "missing_function":',
      '        return Fail("missing")',
      '    return Pass()',
    ].join('\n');
    const code =
      'from codeweald import hero\nbase = 5\ndef heal(hp):\n    print("healing")\n    return hp + base * 2\n' +
      'hero.say("Hi")\nprint("ready")';
    const v = check(code, [{ type: 'custom', python }], [], { stage: { kind: 'npc' } });
    expect(v.feedback).toEqual({ source: 'success' });
  });
});

// F-EXE-10: the same code, seed and inputs always give the same action log.
describe('determinism', () => {
  const code =
    'import random, time\nfrom codeweald import hero\nname = input("Name? ")\n' +
    'for i in range(3):\n    time.sleep(1)\n    hero.move(random.choice(["right", "down"]))\n' +
    '    hero.say(f"{name} {random.randint(1, 100)} {time.time()}")';
  const stage = { kind: 'grid' as const, grid: 'H...\n....\n....\n....' };
  const run = (seed: number, inputs: string[]) => py.run({ code, stage, seed, inputs });

  it('repeats the exact action log for the same seed and inputs', () => {
    const a = run(7, ['Ada']);
    const b = run(7, ['Ada']);
    expect(a.error).toBeNull();
    expect(b.actions).toEqual(a.actions);
    expect(b.output).toEqual(a.output);
  });

  it('changes with the seed or the inputs', () => {
    const base = JSON.stringify(run(7, ['Ada']).actions);
    const seeds = [1, 2, 3, 4].map((s) => JSON.stringify(run(s, ['Ada']).actions));
    expect(seeds.some((s) => s !== base)).toBe(true);
    expect(JSON.stringify(run(7, ['Bo']).actions)).not.toBe(base);
  });
});
