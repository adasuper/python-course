// Writes JSON Schema files for content YAML, so editors can autocomplete and check them.
// Add `# yaml-language-server: $schema=<path>/schema/quest.schema.json` at the top of a file.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { CourseSchema, GlossarySchema, ItemsSchema, QuestSchema, RegionSchema } from '../src/content/schema';

const OUT = join(import.meta.dirname, '..', 'schema');

export function writeSchemas() {
  mkdirSync(OUT, { recursive: true });
  const schemas = {
    quest: QuestSchema,
    region: RegionSchema,
    course: CourseSchema,
    glossary: GlossarySchema,
    items: ItemsSchema,
  };
  for (const [name, schema] of Object.entries(schemas)) {
    const json = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });
    writeFileSync(join(OUT, `${name}.schema.json`), JSON.stringify(json, null, 2) + '\n');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  writeSchemas();
  console.log('schema: wrote schema/*.schema.json');
}
