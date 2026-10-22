import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { fillRich, parseRich, plainText, termsIn } from '../../src/content/richtext';
import { STAGE_LEGEND } from '../../src/game/legend';
import { getPyHost } from '../../scripts/lib/pyHost';

describe('rich text', () => {
  it('parses the safe Markdown subset', () => {
    const rich = parseRich(
      'Hello **brave** *friend*, use `print()`.\n\n- one [[variable]]\n- two [[jars|variable]]\n\n```\nx = 1\n```',
    );
    expect(rich[0]).toEqual({
      t: 'p',
      c: [
        { t: 'text', v: 'Hello ' },
        { t: 'b', c: [{ t: 'text', v: 'brave' }] },
        { t: 'text', v: ' ' },
        { t: 'i', c: [{ t: 'text', v: 'friend' }] },
        { t: 'text', v: ', use ' },
        { t: 'code', v: 'print()' },
        { t: 'text', v: '.' },
      ],
    });
    expect(rich[1]?.t).toBe('ul');
    expect(rich[2]).toEqual({ t: 'pre', v: 'x = 1' });
    expect(termsIn(rich)).toEqual(['variable', 'variable']);
    expect(plainText(rich)).toContain('Hello brave friend');
  });

  it('never produces HTML, even from HTML-looking text', () => {
    const rich = parseRich('<script>alert(1)</script>');
    expect(rich).toEqual([{ t: 'p', c: [{ t: 'text', v: '<script>alert(1)</script>' }] }]);
  });

  it('fills placeholders', () => {
    expect(plainText(fillRich(parseRich('Line {line}: `{name}`'), { line: '3', name: 'x' }), true)).toBe(
      'Line 3: x',
    );
  });
});

describe('compiled content (F-INS-02)', () => {
  const dir = join(import.meta.dirname, '..', '..', 'src', 'generated', 'content');
  it('contains no reference, sample or wrong solutions', () => {
    for (const file of readdirSync(dir)) {
      const json = readFileSync(join(dir, file), 'utf8');
      expect(json, file).not.toMatch(
        /"(solution|solutionEnc|wrong_solutions|wrongSolutions|sample_solutions|sampleSolutions)"/,
      );
    }
  });
});

describe('stage legend', () => {
  let pythonLegend: Record<string, unknown>;
  beforeAll(async () => {
    const host = await getPyHost();
    pythonLegend = JSON.parse(
      host.pyodide.runPython(
        'import json\nfrom codeweald._world import DEFAULT_LEGEND\njson.dumps(DEFAULT_LEGEND)',
      ) as string,
    );
  });
  it('matches the Python simulation exactly', () => {
    expect(STAGE_LEGEND).toEqual(pythonLegend);
  });
});
