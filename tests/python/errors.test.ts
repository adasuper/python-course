import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { getPyHost, type PyHost } from '../../scripts/lib/pyHost';

let py: PyHost;
beforeAll(async () => {
  py = await getPyHost();
});

// 101 nested blocks: "too many levels of indentation".
const DEEP =
  Array.from({ length: 101 }, (_, i) => '    '.repeat(i) + 'if True:').join('\n') +
  '\n' +
  '    '.repeat(101) +
  'pass';

// One fixture per classifier row in docs/specs.md §6.8, pinned to Python 3.14 messages.
const CASES: [string, string, Record<string, string>?, number?][] = [
  ['print("Hear ye!)', 'syntax.unclosed_string', {}, 1],
  ['note = """Dear baker,\nPlease bake bread.', 'syntax.unclosed_string', {}, 1],
  ['shelf = [1, 2, 3', 'syntax.unclosed_bracket', { bracket: '[', closer: ']' }, 1],
  ['jar = {"gold": 3', 'syntax.unclosed_bracket', { bracket: '{', closer: '}' }, 1],
  ['print("Market at noon!"', 'syntax.unclosed_bracket', { bracket: '(', closer: ')' }, 1],
  ['print("hi"))', 'syntax.extra_bracket'],
  ['print "hi"', 'syntax.print_no_parens'],
  ['if True\n    pass', 'syntax.missing_colon'],
  ['x = “hi”', 'syntax.smart_quotes'],
  ['2nd_shelf = 1', 'syntax.name_starts_with_digit'],
  ['book-count = 3', 'syntax.bad_variable_name', { name: 'book-count' }],
  ['book title = "Owls"', 'syntax.bad_variable_name', { name: 'book title' }],
  ['x = 1\nif x = 10:\n    pass', 'syntax.assign_in_condition', {}, 2],
  ['if True:\nprint(1)', 'indent.expected', { after: 'if', after_line: '1' }, 2],
  [' x = 1', 'indent.unexpected'],
  ['if True:\n    x = 1\n  y = 2', 'indent.mismatch', {}, 3],
  ['Print("hi")', 'name.wrong_case', { name: 'Print', suggestion: 'print' }, 1],
  ['x = true', 'name.wrong_case', { suggestion: 'True' }],
  ['print(hello)', 'name.missing_quotes', { name: 'hello' }],
  ['score = 1\nprint(scroe)', 'name.typo', { suggestion: 'score' }, 2],
  ['print(gold)\ngold = 5', 'name.before_assignment'],
  ['print(zzz + 1)', 'name.not_defined'],
  ['def f():\n    x = x + 1\nf()', 'name.unbound_local', {}, 2],
  ['print("Total: " + 5)', 'type.str_plus_number', { other: 'int' }],
  ['print(5 + "a")', 'type.number_plus_str'],
  ['for i in range("5"):\n    pass', 'type.str_as_int'],
  ['def f(a):\n    return a\nf(1, 2)', 'type.arg_count'],
  ['def heal(hp, bonus):\n    return hp + bonus\nheal(5)', 'type.arg_count'],
  ['x = None\nprint(x + 1)', 'type.none_value'],
  ['x = 5\nx()', 'type.not_callable', { what: 'int' }],
  ['print([1, 2][5])', 'index.out_of_range', { name: '[1, 2]', length: '2', last: '1', index: '5' }],
  // Which list, how long, and which position (worked out without re-running any code).
  [
    'shelf = ["a", "b", "c"]\nprint(shelf[3])',
    'index.out_of_range',
    { name: 'shelf', length: '3', last: '2' },
  ],
  ['def f(xs):\n    return xs[len(xs)]\nf([1, 2])', 'index.out_of_range', { name: 'xs', index: '2' }, 2],
  ['grid = [[1, 2], [3]]\nprint(grid[1][1])', 'index.out_of_range', { name: 'grid[1]', length: '1' }],
  ['word = "owl"\nprint(word[-4])', 'index.out_of_range', { unit: 'characters', index: '-4' }],
  ['shelf = []\nprint(shelf[0])', 'index.empty', { name: 'shelf', index: '0' }],
  ['shelf = [1]\nshelf.pop()\nshelf.pop()', 'index.pop_empty', {}, 3],
  ['i = 9\nprint([1, 2][i * 2])', 'index.generic'],
  ['d = {"gems": 1}\nprint(d["gold"])', 'key.missing', { key: "'gold'", name: 'd', keys: "'gems'" }],
  ['d = {}\nd["x"] += 1', 'key.empty', { key: "'x'", name: 'd' }],
  ['d = {"a": 1}\nd.pop("b")', 'key.generic', { key: "'b'" }],
  ['print(1 / 0)', 'zero_division'],
  ['int("abc")', 'value.int_conversion', { text: "'abc'" }],
  ['float("x")', 'value.float_conversion'],
  ['[1].remove(2)', 'value.remove_missing'],
  ['"abc".append(1)', 'attribute.generic', { what: 'str', name: 'append' }],
  // Rows added in the Phase 1 audit, so every key in errors.yaml has a fixture.
  ['x = 3 € 4', 'syntax.invalid_character', { char: '€' }],
  ['print(1 2)', 'syntax.missing_comma'],
  ['5 = x', 'syntax.assign_to_value'],
  ['x = = 1', 'syntax.generic'],
  ['if True:\n\tx = 1\n        y = 2', 'indent.tabs'],
  [DEEP, 'indent.generic'],
  ['for i in range(2.5):\n    pass', 'type.not_int'],
  ['x = "ab" * 1.5', 'type.not_int'],
  ['print([1, 2]["a"])', 'type.not_int'],
  ['print([1] - [2])', 'type.bad_operands'],
  ['len(5)', 'type.generic'],
  ['import math\nmath.sqrt(-1)', 'value.generic'],
  ['x = [0] * (10**9)', 'limits.memory'],
  ['x = [0] * (2**40)', 'limits.memory'],
  ['assert False', 'generic'],
  ['import time\ntime.sleep("1")', 'api.sleep_not_number'],
  ['import time\ntime.sleep(-1)', 'api.sleep_negative'],
  // Fill quests: a gap left as it was, even where it isn't valid Python yet.
  ['gold = ____\nprint(gold)', 'fill.gap_left', {}, 1],
  ['gold = 7\nif gold ____ 10:\n    print("in")', 'fill.gap_left', {}, 2],
];

const GRID = { kind: 'grid' as const, grid: 'H..' };
const API_CASES: [string, string][] = [
  ['hero.move(5)', 'api.direction_not_text'],
  ['hero.move("right", [1])', 'api.steps_not_number'],
  ['hero.move("right", 1.5)', 'api.steps_not_whole'],
  ['hero.move("right", -1)', 'api.steps_negative'],
];

/** Keys produced outside Python, or that student code can't reach. */
const ELSEWHERE: Record<string, string> = {
  'limits.timeout': 'the PyRunner hard timeout (tests/e2e/runaway.spec.ts)',
  'limits.crashed': 'the PyRunner crash recovery (tests/unit/runner.test.ts)',
  'api.no_world': 'only raised if the API is used outside a run',
};

describe('error translation', () => {
  it.each(CASES)('%j → %s', (code, key, params = {}, line) => {
    const r = py.run({ code });
    expect(r.status).toBe('error');
    expect(r.error?.key).toBe(key);
    expect(r.error?.params).toMatchObject(params);
    if (line !== undefined) expect(r.error?.line).toBe(line);
  });

  it.each(API_CASES)('%s → %s', (call, key) => {
    const r = py.run({ code: `from codeweald import hero\n${call}`, stage: GRID });
    expect(r.error?.key).toBe(key);
    expect(r.error?.line).toBe(2);
  });

  it('has a fixture for every key in content/errors.yaml (F-QA-03)', () => {
    const yaml = readFileSync(join(import.meta.dirname, '../../content/errors.yaml'), 'utf8');
    const keys = [...yaml.matchAll(/^([a-z_.]+):\s*$/gm)].map((m) => m[1]!);
    const tested = new Set(CASES.map((c) => c[1]));
    for (const [, key] of API_CASES) tested.add(key);
    // Tested on their own below.
    tested.add('stage.invalid').add('limits.output');
    const elsewhere = readFileSync(join(import.meta.dirname, 'sandbox.test.ts'), 'utf8');
    const world = readFileSync(join(import.meta.dirname, 'world.test.ts'), 'utf8');
    const missing = keys.filter(
      (k) =>
        !tested.has(k) && !(k in ELSEWHERE) && !elsewhere.includes(`'${k}'`) && !world.includes(`'${k}'`),
    );
    expect(missing).toEqual([]);
  });

  it('has a template in content/errors.yaml for every key the code can produce (F-FBK-08)', () => {
    const yaml = readFileSync(join(import.meta.dirname, '../../content/errors.yaml'), 'utf8');
    const templates = new Set([...yaml.matchAll(/^([a-z_.]+):\s*$/gm)].map((m) => m[1]!));
    const dirs = ['../../src/python/codeweald', '../../src/runtime'].map((d) => join(import.meta.dirname, d));
    const produced = new Set(['generic', 'zero_division']);
    for (const dir of dirs)
      for (const file of readdirSync(dir)) {
        const text = readFileSync(join(dir, file), 'utf8');
        for (const m of text.matchAll(
          /["']((?:syntax|indent|name|type|index|key|value|attribute|limits|api|sandbox|stage|fill|import|input)\.[a-z_]+)["']/g,
        ))
          produced.add(m[1]!);
      }
    expect(produced.size).toBeGreaterThan(60);
    expect([...produced].filter((k) => !templates.has(k))).toEqual([]);
  });

  it('turns a broken quest map into a clear error', () => {
    const r = py.run({ code: 'print(1)', stage: { kind: 'grid', grid: 'H.Z' } });
    expect(r.error?.key).toBe('stage.invalid');
    expect(r.error?.params.problem).toMatch(/'Z'/);
  });

  it('stops a print flood with limits.output', () => {
    const r = py.run({ code: 'while True:\n    print("x" * 1000)' });
    expect(r.status).toBe('output-budget');
    expect(r.error?.key).toBe('limits.output');
  });

  it('keeps a real, trimmed traceback for the "show the real error" toggle', () => {
    const r = py.run({ code: 'def f():\n    return 1 / 0\nf()' });
    expect(r.error?.raw).toBe(
      'Traceback (most recent call last):\n  File "spellbook", line 3\n    f()\n  File "spellbook", line 2, in f\n    return 1 / 0\nZeroDivisionError: division by zero',
    );
  });

  it('shows real syntax errors with the caret', () => {
    const r = py.run({ code: 'print("hi"' });
    expect(r.error?.raw).toContain('File "spellbook", line 1');
    expect(r.error?.raw).toContain("SyntaxError: '(' was never closed");
  });
});
