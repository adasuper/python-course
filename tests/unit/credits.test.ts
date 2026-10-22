// The Credits screen shows ASSETS_LICENSES.md, and that file credits every bundled library (F-DEP-06).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCredits } from '../../src/ui/markdown';

const root = join(import.meta.dirname, '../..');
const licenses = readFileSync(join(root, 'ASSETS_LICENSES.md'), 'utf8');

describe('credits', () => {
  it('reads the headings, paragraphs and tables, without links', () => {
    const blocks = parseCredits(licenses);
    expect(blocks.filter((b) => b.t === 'h').map((b) => (b.t === 'h' ? b.text : ''))).toEqual(
      expect.arrayContaining(['Art', 'Fonts', 'Code libraries (bundled)']),
    );
    const tables = blocks.filter((b) => b.t === 'table');
    expect(tables.length).toBeGreaterThanOrEqual(3);
    expect(JSON.stringify(blocks)).not.toMatch(/\]\(https?:/);
  });

  it('credits every runtime dependency', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    // How each package is named in ASSETS_LICENSES.md.
    const named = (dep: string) =>
      dep.startsWith('@codemirror/')
        ? 'CodeMirror'
        : dep.startsWith('@fontsource/')
          ? `\`${dep}\``
          : dep === '@preact/signals'
            ? '@preact/signals'
            : dep.charAt(0).toUpperCase() + dep.slice(1);
    for (const dep of Object.keys(pkg.dependencies)) {
      expect(licenses.toLowerCase()).toContain(named(dep).toLowerCase());
    }
  });
});
