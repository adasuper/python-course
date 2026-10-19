// One test per quest (and boss phase): the reference solution passes, every
// known-wrong solution fails with its expected feedback (docs/specs.md §18.3).
import { beforeAll, describe, expect, it } from 'vitest';
import { crossCheck, loadContent, units } from '../../scripts/lib/content';
import { checkRegion, checkUnit } from '../../scripts/lib/contentCheck';
import { getPyHost, type PyHost } from '../../scripts/lib/pyHost';

const content = loadContent();
let host: PyHost;

beforeAll(async () => {
  host = await getPyHost();
});

describe('content files', () => {
  it('match the schema', () => {
    expect(content.problems.map((p) => `${p.file}:${p.line ?? ''} ${p.message}`)).toEqual([]);
  });
  it('pass the cross-reference checks', () => {
    expect(crossCheck(content).map((p) => `${p.file} ${p.message}`)).toEqual([]);
  });
});

describe.each(units(content).map((u) => [u.label, u] as const))('quest %s', (_label, unit) => {
  it('solutions behave as declared', () => {
    expect(checkUnit(host, unit)).toEqual([]);
  });
});

describe.each(content.regions.map((r) => [r.data.id, r] as const))('region %s', (_id, region) => {
  it('worked example and knowledge-check answers are right', () => {
    expect(checkRegion(host, region.data)).toEqual([]);
  });
});
