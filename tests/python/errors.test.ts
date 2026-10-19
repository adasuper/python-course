import { beforeAll, describe, expect, it } from 'vitest';
import { getPyHost, type PyHost } from '../../scripts/lib/pyHost';

let py: PyHost;
beforeAll(async () => {
  py = await getPyHost();
});

// One fixture per classifier row in docs/specs.md §6.8, pinned to Python 3.14 messages.
const CASES: [string, string, Record<string, string>?, number?][] = [
  ['print("Hear ye!)', 'syntax.unclosed_string', {}, 1],
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
  ['x = None\nprint(x + 1)', 'type.none_value'],
  ['x = 5\nx()', 'type.not_callable', { what: 'int' }],
  ['print([1, 2][5])', 'index.out_of_range'],
  ['d = {"gems": 1}\nprint(d["gold"])', 'key.missing', { key: "'gold'" }],
  ['print(1 / 0)', 'zero_division'],
  ['int("abc")', 'value.int_conversion', { text: "'abc'" }],
  ['float("x")', 'value.float_conversion'],
  ['[1].remove(2)', 'value.remove_missing'],
  ['"abc".append(1)', 'attribute.generic', { what: 'str', name: 'append' }],
];

describe('error translation', () => {
  it.each(CASES)('%j → %s', (code, key, params = {}, line) => {
    const r = py.run({ code });
    expect(r.status).toBe('error');
    expect(r.error?.key).toBe(key);
    expect(r.error?.params).toMatchObject(params);
    if (line !== undefined) expect(r.error?.line).toBe(line);
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
