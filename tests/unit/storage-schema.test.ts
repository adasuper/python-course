import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { parseQuest } from '../../src/content/schema';
import { newProfile } from '../../src/state/profile';
import { Storage } from '../../src/state/storage';

describe('storage (IndexedDB)', () => {
  it('saves profiles and drafts, and deletes them together', async () => {
    const storage = await Storage.open();
    expect(storage.mode).toBe('indexeddb');
    const p = newProfile('Clever Newt', 'avatar-1', 'moss', 'r1');
    await storage.saveProfile(p);
    await storage.saveDraft(p.id, 'r1-q1', 'print("hi")');
    await storage.setLastProfileId(p.id);
    expect((await storage.profiles()).map((x) => x.nickname)).toContain('Clever Newt');
    expect(await storage.draft(p.id, 'r1-q1')).toBe('print("hi")');
    expect(await storage.drafts(p.id)).toEqual({ 'r1-q1': 'print("hi")' });
    expect(await storage.lastProfileId()).toBe(p.id);
    await storage.deleteProfile(p.id);
    expect((await storage.profiles()).find((x) => x.id === p.id)).toBeUndefined();
    expect(await storage.draft(p.id, 'r1-q1')).toBeUndefined();
  });
});

const good = {
  id: 'r1-q9-test',
  region: 'hearthvale-village',
  title: 'Test',
  type: 'make',
  learning_outcome: 'Use print() to show a greeting.',
  csta: ['2-AP-11'],
  estimated_minutes: 5,
  story_intro: 'Hi',
  goal: 'Print hello',
  story_outro: 'Yay',
  concept_card: 'print shows text',
  solution: 'print("hello")',
  validators: [{ type: 'output', expect: 'hello' }],
  hints: ['a', 'b', 'c'],
};

describe('quest schema', () => {
  it('accepts a minimal valid quest and fills defaults', () => {
    const r = parseQuest(good);
    expect(r.success).toBe(true);
    if (r.success && r.data.type !== 'boss') {
      expect(r.data.stage).toEqual({ kind: 'none' });
      expect(r.data.prerequisites).toEqual([]);
    }
  });

  it.each([
    [{ learning_outcome: 'Understand printing.' }, 'measurable verb'],
    [{ hints: ['only one'] }, 'exactly 3 hints'],
    [{ csta: ['AP-11'] }, 'CSTA codes look like'],
    [{ id: 'quest one' }, 'Quest ids look like'],
    [{ validators: [{ type: 'output', expect: 'x', typo_field: 1 }] }, 'Unrecognized key'],
  ])('rejects %j with a helpful message', (patch, message) => {
    const r = parseQuest({ ...good, ...patch });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.message).join(' | ')).toContain(message);
  });
});
