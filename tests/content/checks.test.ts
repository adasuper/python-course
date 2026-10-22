// The content rules themselves: a broken copy of content/ must produce clear problems with
// file and line (F-AUT-02, F-AUT-03, F-API-05, F-QA-04).
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { CONTENT_DIR, crossCheck, gridProblems, loadContent, units, type Problem } from '../../scripts/lib/content';
import { checkUnit } from '../../scripts/lib/contentCheck';
import { getPyHost } from '../../scripts/lib/pyHost';

const R1 = 'regions/01-hearthvale-village';

function brokenCopy(edits: Record<string, (text: string) => string>): string {
  const root = join(mkdtempSync(join(tmpdir(), 'cw-content-')), 'content');
  cpSync(CONTENT_DIR, root, { recursive: true });
  for (const [file, edit] of Object.entries(edits)) {
    const path = join(root, file);
    const before = readFileSync(path, 'utf8');
    const after = edit(before);
    if (after === before) throw new Error(`edit of ${file} changed nothing`);
    writeFileSync(path, after);
  }
  return root;
}

const lineOf = (root: string, file: string, needle: string) =>
  readFileSync(join(root, file), 'utf8').split('\n').findIndex((l) => l.includes(needle)) + 1;

describe('quest maps', () => {
  it('reports ragged rows, unknown symbols and a missing or extra hero', () => {
    expect(gridProblems({ kind: 'grid', grid: 'H..\n..' })).toEqual([expect.stringMatching(/row 2 has 2/)]);
    expect(gridProblems({ kind: 'grid', grid: 'H.Z' })).toEqual([expect.stringMatching(/"Z" at column 3, row 1/)]);
    expect(gridProblems({ kind: 'grid', grid: '...' })).toEqual([expect.stringMatching(/exactly one hero/)]);
    expect(gridProblems({ kind: 'grid', grid: 'H.H' })).toEqual([expect.stringMatching(/it has 2/)]);
    expect(gridProblems({ kind: 'grid', grid: 'HZ', legend: { Z: { tile: 'floor' } } })).toEqual([]);
  });
});

describe('cross-checks', () => {
  let root: string;
  let problems: Problem[];
  const q4 = `${R1}/quests/r1-q4-notes-for-the-baker.yaml`;
  const boss = `${R1}/quests/r1-boss-village-crier-bug.yaml`;

  beforeAll(() => {
    root = brokenCopy({
      [q4]: (t) =>
        t
          .replace('prerequisites: [r1-q3-path-to-the-well]', 'prerequisites: [r1-q3-no-such-quest]')
          .replace(/^hints:\n {2}- /m, 'hints:\n  - Fill the ____ first. '),
      [`${R1}/region.yaml`]: (t) => t.replace(/explain: /, 'explain: A [[frobnicator]] says so. '),
      [boss]: (t) => t.replace("There's **1 bug** this time: ", ''),
    });
    const content = loadContent(root);
    expect(content.problems).toEqual([]);
    problems = crossCheck(content, root);
  });

  const find = (re: RegExp) => problems.find((p) => re.test(p.message));

  it('names the file and line of a missing prerequisite', () => {
    const p = find(/prerequisite "r1-q3-no-such-quest" does not exist/);
    expect(p?.file).toMatch(/r1-q4-notes-for-the-baker\.yaml$/);
    expect(p?.line).toBe(lineOf(root, q4, 'r1-q3-no-such-quest'));
  });

  it('allows ____ gaps only in fill starters and the third hint', () => {
    const p = find(/____ gaps belong only/);
    expect(p?.line).toBe(lineOf(root, q4, 'Fill the ____ first'));
  });

  it('checks glossary links in every student text, not just quests', () => {
    const p = find(/\[\[frobnicator\]\]/);
    expect(p?.file).toMatch(/region\.yaml$/);
    expect(p?.line).toBe(lineOf(root, `${R1}/region.yaml`, 'frobnicator'));
  });

  it('makes fix quests say how many bugs there are', () => {
    const p = find(/words-in-order: say how many bugs/);
    expect(p?.line).toBeGreaterThan(lineOf(root, boss, 'id: words-in-order'));
  });

  it('finds nothing wrong with the real content', () => {
    expect(crossCheck(loadContent())).toEqual([]);
  });
});

describe('investigate answers are proven (F-QA-04)', () => {
  it('fails when a counted answer does not match the real output', async () => {
    const root = brokenCopy({
      [`${R1}/quests/r1-q2-hello-hearthvale.yaml`]: (t) => t.replace(/ {4}answer: 3\n/, '    answer: 4\n'),
    });
    const unit = units(loadContent(root)).find((u) => u.key === 'r1-q2-hello-hearthvale')!;
    const found = checkUnit(await getPyHost(), unit);
    expect(found).toContain('question 1: the program prints 3 line(s), but the answer is 4');
  });
});
