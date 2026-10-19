import { beforeAll, describe, expect, it } from 'vitest';
import { getPyHost, type PyHost } from '../../scripts/lib/pyHost';
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
