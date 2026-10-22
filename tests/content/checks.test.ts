// The content rules themselves: a broken copy of content/ must produce clear problems with
// file and line (F-AUT-02, F-AUT-03, F-API-05, F-QA-04).
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { CONTENT_DIR, crossCheck, gridProblems, loadContent, units, type Problem } from '../../scripts/lib/content';
import { checkUnit } from '../../scripts/lib/contentCheck';
import { pacing, pacingLine } from '../../scripts/lib/pacing';
import { contentFiles } from '../../scripts/lib/prose';
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

describe('rules for the Phase 2 quest types (M2.1)', () => {
  const q3 = `${R1}/quests/r1-q3-path-to-the-well.yaml`;
  const q4 = `${R1}/quests/r1-q4-notes-for-the-baker.yaml`;
  const q6 = `${R1}/quests/r1-q6-welcome-sign.yaml`;
  let problems: Problem[];

  beforeAll(() => {
    const root = brokenCopy({
      [q4]: (t) => t.replace(/^starter_code:/m, 'locked: true\nstarter_code:'),
      [q6]: (t) =>
        t.replace('type: make', 'type: fill').replace(
          /^validators:\n/m,
          [
            'validators:',
            '  - { type: runs_ok, min_runs: 3, distinct_inputs: true }',
            '  - type: hidden_tests',
            '    mode: stages',
            '    cases:',
            '      - { stage: { kind: grid, grid: "H.Z" } }',
            '',
          ].join('\n'),
        ),
      [q3]: (t) => t.replace('  indent: false', '  indent: false\n  alternatives: [[0, 1, 2]]'),
    });
    problems = crossCheck(loadContent(root), root);
  });
  const find = (re: RegExp) => problems.find((p) => re.test(p.message));

  it('allows locked lines only in fill quests', () => {
    expect(find(/r1-q4-notes-for-the-baker: locked: true only works in fill quests/)).toBeDefined();
  });
  it("needs a ____ gap in a fill quest's starter", () => {
    expect(find(/r1-q6-welcome-sign: a fill quest's starter_code needs at least one ____ gap/)).toBeDefined();
  });
  it('needs typed input for runs_ok with distinct inputs', () => {
    expect(find(/runs_ok with distinct_inputs needs interactive_input: true/)).toBeDefined();
  });
  it('checks the maps of hidden stages', () => {
    expect(find(/r1-q6-welcome-sign: grid symbol "Z"/)).toBeDefined();
  });
  it('makes a Parsons alternative use every line once', () => {
    expect(find(/alternative 1 must list every line number from 0 to 4 once/)).toBeDefined();
  });
});

describe('order-checked Parsons and predict twins are proven (M2.1)', () => {
  it('fails a "wrong" order that is really right, and a twin with the wrong answer', async () => {
    const root = brokenCopy({
      [`${R1}/quests/r1-q3-path-to-the-well.yaml`]: (t) =>
        t
          .replace('  indent: false', '  indent: false\n  check: order')
          .replace('  - order: [1, 0, 2, 3, 4]\n    expect_mistake: bonked', '  - order: [0, 1, 2, 3, 4]\n    expect_feedback_contains: Not quite'),
      [`${R1}/quests/r1-q1-first-steps.yaml`]: (t) =>
        t.replace(
          '    verify: { kind: none }\n',
          [
            '    verify: { kind: none }',
            '    twin:',
            '      kind: text',
            '      code: print(2 + 2)',
            '      question: What does this print?',
            '      answer: "5"',
            '      explain: Two plus two.',
            '',
          ].join('\n'),
        ),
    });
    const content = loadContent(root);
    expect(content.problems).toEqual([]);
    const host = await getPyHost();
    const q3 = checkUnit(host, units(content).find((u) => u.key === 'r1-q3-path-to-the-well')!);
    expect(q3).toContain('wrong solution 1 is in a right order, but it should fail');
    expect(q3).toContain('wrong solution 2: a check: order puzzle has no mistakes; use expect_feedback_contains');
    const q1 = checkUnit(host, units(content).find((u) => u.key === 'r1-q1-first-steps')!);
    expect(q1).toContain('prompt 2 twin: answer "5" ≠ real output "4\\n"');
  });
});

describe('editor support for authors (F-AUT-07)', () => {
  it('every content file names its JSON Schema, so VS Code autocompletes and checks it', () => {
    const missing = contentFiles(CONTENT_DIR).filter(
      (f) => !/^# yaml-language-server: \$schema=\S+\.schema\.json/.test(readFileSync(f, 'utf8')),
    );
    expect(missing).toEqual([]);
  });
});

describe('the Quest Board and map NPCs (F-WLD-07)', () => {
  it('needs a Quest Board on every map, and an npc quest to be offered by that npc', () => {
    const q2 = `${R1}/quests/r1-q2-hello-hearthvale.yaml`;
    const root = brokenCopy({
      [`${R1}/region.yaml`]: (t) => t.replace(/^ {4}- \{ kind: board, at: \[11, 13\] \}\n/m, ''),
      [q2]: (t) => t.replace('npc: pip', 'npc: baker'),
    });
    const problems = crossCheck(loadContent(root), root);
    const board = problems.find((p) => /needs a Quest Board/.test(p.message));
    expect(board?.file.endsWith(`${R1}/region.yaml`)).toBe(true);
    const npc = problems.find((p) => /npc "baker" does not offer this quest on the map/.test(p.message));
    expect(npc?.file.endsWith(q2)).toBe(true);
    expect(npc?.line).toBe(lineOf(root, q2, 'npc: baker'));
  });
});

describe('random needs a seed (F-EXE-10)', () => {
  it('asks a quest whose code uses random for seed:', () => {
    const q6 = `${R1}/quests/r1-q6-welcome-sign.yaml`;
    const root = brokenCopy({ [q6]: (t) => t.replace(/^solution: \|\n/m, 'solution: |\n  import random\n') });
    const problems = crossCheck(loadContent(root), root);
    expect(problems.find((p) => /the code uses random: add `seed:`/.test(p.message))).toBeDefined();
  });
});

describe('pacing summary (F-AUT-11)', () => {
  it('adds up the regions, lessons, quests and minutes that course.yaml turns on', () => {
    // Only Hearthvale on: every later region gets `enabled: false`.
    const onlyFirst = (t: string) =>
      t.replace(/( {2}- id: (?!hearthvale-village)[\w-]+\n)( {4}lessons: \d+)/g, '$1    enabled: false\n$2');
    const root = brokenCopy({ 'course.yaml': onlyFirst });
    const first = pacing(loadContent(root));
    expect(first).toMatchObject({ regions: 1, lessons: 2, quests: 7, sideQuests: 1 });
    expect(first.skipped).toContain('whispering-library');
    expect(first.minutes).toBeGreaterThan(50);
    expect(pacingLine(first)).toMatch(/^pacing: 1 region\(s\), 2 lesson\(s\), 7 quest\(s\) and bosses \+ 1 side/);
    expect(pacingLine(first)).toContain('left out: whispering-library');
    const noSide = brokenCopy({
      'course.yaml': (t) => onlyFirst(t).replace('side_quests: true', 'side_quests: false'),
    });
    expect(pacing(loadContent(noSide))).toMatchObject({ sideQuests: 0, quests: 7 });
    // The whole course counts every region it turns on.
    const all = pacing(loadContent());
    expect(all.regions).toBe(loadContent().course!.data.regions.filter((r) => r.enabled).length);
  });
});
