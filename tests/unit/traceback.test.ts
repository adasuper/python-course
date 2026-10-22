// Byte's annotated traceback (F-FBK-10): every line of a real error gets a label.
import { describe, expect, it } from 'vitest';
import { annotateTraceback } from '../../src/ui/traceback';

describe('annotated traceback', () => {
  it('labels a runtime traceback, part by part', () => {
    const raw =
      'Traceback (most recent call last):\n  File "spellbook", line 3\n    f()\n  File "spellbook", line 2, in f\n    return 1 / 0\nZeroDivisionError: division by zero';
    expect(annotateTraceback(raw).map((p) => [p.kind, p.note])).toEqual([
      ['intro', 'Python lists the steps that led to the error. The newest step is last.'],
      ['where', 'Where: your spellbook, line 3.'],
      ['code', 'The code on that line.'],
      ['where', 'Where: your spellbook, line 2, inside the function f.'],
      ['code', 'The code on that line.'],
      [
        'error',
        'The kind of error is ZeroDivisionError. After the colon, Python says what went wrong: division by zero',
      ],
    ]);
  });

  it('labels a syntax error with its pointer', () => {
    const raw = '  File "spellbook", line 1\n    print("hi"\n         ^\nSyntaxError: \'(\' was never closed';
    expect(annotateTraceback(raw).map((p) => p.kind)).toEqual(['where', 'code', 'pointer', 'error']);
  });

  it('copes with an error that has no message', () => {
    expect(
      annotateTraceback(
        'Traceback (most recent call last):\n  File "spellbook", line 1\n    assert False\nAssertionError',
      ).at(-1),
    ).toMatchObject({
      kind: 'error',
      note: 'The kind of error is AssertionError.',
    });
  });
});
