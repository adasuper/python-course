// The quest-authoring guide's complete examples really work (Phase 5 exit criterion): each
// ````yaml quest block in docs/quest-authoring.md goes into a copy of the course as a Region 1
// side quest, and gets the same checks as `npm run validate-content`.
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { CONTENT_DIR, crossCheck, loadContent, units, type LoadedContent } from '../../scripts/lib/content';
import { checkUnit } from '../../scripts/lib/contentCheck';
import { getPyHost } from '../../scripts/lib/pyHost';

const GUIDE = join(import.meta.dirname, '..', '..', 'docs', 'quest-authoring.md');
const R1 = join('regions', '01-hearthvale-village');

const examples = [...readFileSync(GUIDE, 'utf8').matchAll(/^````yaml quest\n([\s\S]*?)\n````$/gm)].map((m) => {
  const text = m[1]!;
  return { id: (parse(text) as { id: string }).id, text };
});

let content: LoadedContent;
let root: string;

beforeAll(() => {
  root = join(mkdtempSync(join(tmpdir(), 'cw-guide-')), 'content');
  cpSync(CONTENT_DIR, root, { recursive: true });
  for (const ex of examples) writeFileSync(join(root, R1, 'quests', `${ex.id}.yaml`), ex.text);
  const regionFile = join(root, R1, 'region.yaml');
  const region = readFileSync(regionFile, 'utf8');
  const listed = region.replace(
    /^side_quests:\n((?: {2}- .*\n)+)/m,
    (all) => all + examples.map((ex) => `  - ${ex.id}\n`).join(''),
  );
  expect(listed).not.toBe(region);
  writeFileSync(regionFile, listed);
  content = loadContent(root);
});

describe('docs/quest-authoring.md examples', () => {
  it('has complete examples of several quest types', () => {
    const types = examples.map((ex) => (parse(ex.text) as { type: string }).type);
    expect(examples.length).toBeGreaterThanOrEqual(5);
    expect(new Set(types)).toEqual(new Set(['make', 'predict', 'fix', 'fill']));
  });

  it('pass the schema and every cross-check', () => {
    expect(content.problems).toEqual([]);
    expect(crossCheck(content, root)).toEqual([]);
  });

  it.each(examples.map((ex) => ex.id))('%s: its solution passes and every wrong solution gets its feedback', async (id) => {
    const unit = units(content).find((u) => u.key === id);
    expect(unit).toBeDefined();
    expect(checkUnit(await getPyHost(), unit!)).toEqual([]);
  });
});
