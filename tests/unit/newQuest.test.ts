import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { parseQuest } from '../../src/content/schema';
import { scaffold, type QuestType } from '../../scripts/new-quest';

describe('new-quest scaffolder', () => {
  const types: QuestType[] = ['predict', 'investigate', 'fix', 'fill', 'parsons', 'modify', 'make'];

  it.each(types)('writes a schema-valid %s quest with TODO markers', (type) => {
    const result = scaffold({ region: 1, type, slug: 'river-ferry' });
    expect(result.id).toBe('r1-q7-river-ferry');
    expect(result.listIn).toBe('quests');
    expect(result.file.endsWith('content/regions/01-hearthvale-village/quests/r1-q7-river-ferry.yaml')).toBe(
      true,
    );
    const parsed = parseQuest(parse(result.text));
    expect(parsed.success).toBe(true);
    expect(result.text).toContain('TODO');
    expect(result.text.startsWith('# yaml-language-server: $schema=')).toBe(true);
  });

  it('numbers side quests separately', () => {
    const result = scaffold({ region: 1, type: 'make', slug: 'kite', side: true });
    expect(result.id).toBe('r1-side2-kite');
    expect(result.listIn).toBe('side_quests');
    expect(parse(result.text).side_quest).toBe(true);
  });

  it('refuses a second boss, a missing region and a bad slug', () => {
    expect(() => scaffold({ region: 1, type: 'boss', slug: 'again' })).toThrow(/already has a boss/);
    expect(() => scaffold({ region: 9, type: 'make', slug: 'x' })).toThrow(/no folder yet/);
    expect(() => scaffold({ region: 1, type: 'make', slug: 'Bad Slug' })).toThrow(/lowercase/);
  });
});
