// Every student-facing text in content/, with its file, line and YAML path. Shared by the
// reading-level report and the content cross-checks (glossary links, ____ gaps).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isPair, isScalar, isSeq, LineCounter, parseDocument, visit, type Scalar } from 'yaml';

/** YAML keys whose string values are student-facing prose, and what to call them. */
export const PROSE: Record<string, string> = {
  story_intro: 'story',
  story_outro: 'story',
  goal: 'goal',
  hints: 'hint',
  hint: 'hint',
  fail_hint: 'hint',
  feedback: 'feedback',
  question: 'question',
  explain: 'explanation',
  text: 'dialogue',
  greeting: 'dialogue',
  analogy: 'concept',
  concept_card: 'concept',
  description: 'description',
  definition: 'glossary',
  message: 'error message',
  tip: 'error message',
};
/** Text under these keys is code, checks or author notes, never shown as prose. */
const SKIP_UNDER = new Set(['detect', 'validators', 'wrong_solutions', 'stage', 'check', 'hidden_tests']);

export interface ProseString {
  /** Relative to the repository, e.g. content/glossary.yaml */
  file: string;
  line: number;
  kind: string;
  /** YAML path, e.g. ['phases', 1, 'hints', 2] */
  path: (string | number)[];
  value: string;
}

export function contentFiles(root: string): string[] {
  const files = ['course.yaml', 'glossary.yaml', 'items.yaml', 'errors.yaml'].map((f) => join(root, f));
  const regions = join(root, 'regions');
  for (const dir of readdirSync(regions).sort()) {
    files.push(join(regions, dir, 'region.yaml'));
    const quests = join(regions, dir, 'quests');
    if (existsSync(quests))
      for (const f of readdirSync(quests).sort()) if (f.endsWith('.yaml')) files.push(join(quests, f));
  }
  return files.filter((f) => existsSync(f));
}

export function proseStrings(root: string): ProseString[] {
  const out: ProseString[] = [];
  for (const file of contentFiles(root)) {
    const lineCounter = new LineCounter();
    const doc = parseDocument(readFileSync(file, 'utf8'), { lineCounter });
    visit(doc, {
      Scalar(_key, node: Scalar, ancestors) {
        if (typeof node.value !== 'string') return;
        const parent = ancestors.at(-1);
        // A key's own scalar is a name, not a value.
        if (isPair(parent) && parent.key === node) return;
        const path: (string | number)[] = [];
        ancestors.forEach((a, i) => {
          const child = ancestors[i + 1] ?? node;
          if (isPair(a) && isScalar(a.key)) path.push(String(a.key.value));
          else if (isSeq(a)) path.push(a.items.indexOf(child as never));
        });
        const own = [...path].reverse().find((p): p is string => typeof p === 'string');
        if (!own || !(own in PROSE) || path.some((p) => typeof p === 'string' && SKIP_UNDER.has(p))) return;
        out.push({
          file: relative(join(root, '..'), file),
          line: node.range ? lineCounter.linePos(node.range[0]).line : 1,
          kind: PROSE[own]!,
          path,
          value: node.value,
        });
      },
    });
  }
  return out;
}
