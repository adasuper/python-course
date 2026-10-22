// Good and bad fixtures for every content schema, not just quests (F-QA-02, F-AUT-02).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import type { z } from 'zod';
import {
  CourseSchema,
  ErrorsSchema,
  GlossarySchema,
  ItemsSchema,
  RegionSchema,
} from '../../src/content/schema';

const content = (file: string) =>
  parse(readFileSync(join(import.meta.dirname, '../../content', file), 'utf8')) as unknown;

const issuePaths = (schema: z.ZodType, data: unknown) => {
  const result = schema.safeParse(data);
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'));
};

type Raw = Record<string, unknown> & Record<string, Record<string, unknown>>;

describe.each([
  {
    name: 'course',
    schema: CourseSchema,
    file: 'course.yaml',
    // The opening needs at least one line.
    breakIt: (d: Raw) => ({ ...d, opening: [] }),
    path: 'opening',
  },
  {
    name: 'region',
    schema: RegionSchema,
    file: 'regions/01-hearthvale-village/region.yaml',
    // Knowledge checks have 3–5 items.
    breakIt: (d: Raw) => ({ ...d, knowledge_check: { items: [] } }),
    path: 'knowledge_check.items',
  },
  {
    name: 'glossary',
    schema: GlossarySchema,
    file: 'glossary.yaml',
    // Every term needs an example.
    breakIt: (d: unknown) =>
      (d as Record<string, unknown>[]).map(({ example: _e, ...g }, i) =>
        i === 0 ? g : { example: _e, ...g },
      ),
    path: '0.example',
  },
  {
    name: 'items',
    schema: ItemsSchema,
    file: 'items.yaml',
    // Item ids are slugs.
    breakIt: (d: unknown) =>
      (d as Record<string, unknown>[]).map((it, i) => (i === 0 ? { ...it, id: 'Not A Slug' } : it)),
    path: '0.id',
  },
  {
    name: 'errors',
    schema: ErrorsSchema,
    file: 'errors.yaml',
    // Every template needs a message.
    breakIt: (d: Raw) => ({ ...d, generic: { title: 'Only a title' } }),
    path: 'generic.message',
  },
])('$name schema', ({ schema, file, breakIt, path }) => {
  it('accepts the real content file', () => {
    expect(issuePaths(schema as z.ZodType, content(file))).toEqual([]);
  });

  it('rejects a broken copy, naming the field', () => {
    const broken = breakIt(content(file) as Raw);
    expect(issuePaths(schema as z.ZodType, broken)).toContain(path);
  });

  it('rejects unknown fields (typos in field names)', () => {
    const data = content(file);
    const withTypo = Array.isArray(data)
      ? [{ ...(data[0] as object), descripton: 'typo' }, ...data.slice(1)]
      : { ...(data as object), descripton: 'typo' };
    expect(schema.safeParse(withTypo).success).toBe(false);
  });
});
