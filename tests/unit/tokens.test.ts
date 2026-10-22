// Every color pair the UI uses meets WCAG 2.1 AA in every theme (F-A11-05).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(import.meta.dirname, '../../src/ui/tokens.css'), 'utf8');

/** Token values per :root block, keyed by its selector. */
function blocks(): Map<string, Record<string, string>> {
  const out = new Map<string, Record<string, string>>();
  for (const m of css.matchAll(/(:root[^{]*)\{([^}]*)\}/g)) {
    const vars: Record<string, string> = {};
    for (const v of m[2]!.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{3,6})\s*;/gi))
      vars[v[1]!] = v[2]!.toLowerCase();
    out.set(m[1]!.trim(), vars);
  }
  return out;
}

function luminance(hex: string): number {
  const h = hex.length === 4 ? hex.replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3') : hex;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

// [foreground, background]
const TEXT: [string, string][] = [
  ['ink', 'parchment'],
  ['ink', 'parchment-2'],
  ['ink-muted', 'parchment'],
  ['ink-muted', 'parchment-2'],
  ['ok', 'parchment'],
  ['ok', 'ok-bg'],
  ['warn', 'parchment'],
  ['warn', 'warn-bg'],
  ['err', 'parchment'],
  ['err', 'err-bg'],
  ['accent', 'parchment'],
  ['accent-ink', 'accent'],
  ['parchment', 'night'],
  ['parchment', 'night-2'],
  ['code-fg', 'code-bg'],
  ['code-fg', 'code-active'],
  ['code-fg', 'code-replay'],
  ['code-fg', 'code-error'],
  ['code-gutter-fg', 'code-gutter'],
];
const UI: [string, string][] = [
  ['line', 'parchment'],
  ['focus-halo', 'parchment'],
  ['focus', 'night'],
  ['accent', 'code-bg'],
  ['err', 'code-bg'],
];

const all = blocks();
const base = all.get(':root')!;
const themes: [string, Record<string, string>][] = [
  ['default', base],
  ...[...all]
    .filter(([selector]) => selector !== ':root' && !selector.includes('data-font'))
    .map(([selector, vars]): [string, Record<string, string>] => [selector, { ...base, ...vars }]),
];

describe('design tokens', () => {
  it('found the base tokens and the themes', () => {
    expect(base['ink']).toBeDefined();
    expect(themes.length).toBeGreaterThanOrEqual(8); // default, 6 accent themes, high contrast
  });

  it.each(themes)('%s: text is at least 4.5:1, UI parts at least 3:1', (_name, vars) => {
    const failures: string[] = [];
    for (const [pairs, min] of [
      [TEXT, 4.5],
      [UI, 3],
    ] as const) {
      for (const [fg, bg] of pairs) {
        const ratio = contrast(vars[fg]!, vars[bg]!);
        if (!(ratio >= min)) failures.push(`${fg} on ${bg}: ${ratio.toFixed(2)} < ${min}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('computes contrast the WCAG way', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });
});
