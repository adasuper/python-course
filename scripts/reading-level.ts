// npm run reading-level — Flesch–Kincaid grade for all student text (docs/specs.md §18.5).
//
//   --flag-above 7     warn about texts above this grade (default 7)
//   --fail-above 9     exit with an error for texts above this grade (default 9; "off" to disable)
//   --min-words 8      shorter texts are counted in the totals but never flagged (default 8)
//   --markdown FILE    also write the report as Markdown (for the CI job summary)
//   --quiet            print only the summary
//
// Flags and failures use the score with glossary terms left out; the raw score is shown too.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseDocument } from 'yaml';
import { CONTENT_DIR } from './lib/content';
import { proseStrings } from './lib/prose';
import { glossaryRemover, score, studentText, type Score } from './lib/readingLevel';

export const FLAG_ABOVE = 7;
export const MIN_WORDS = 8;

export interface TextScore {
  file: string;
  line: number;
  kind: string;
  text: string;
  raw: Score;
  adjusted: Score;
}

function glossaryTerms(root: string): string[] {
  const data = parseDocument(readFileSync(join(root, 'glossary.yaml'), 'utf8')).toJS() as { term: string }[];
  return (data ?? []).map((g) => g.term);
}

export function readingLevels(root = CONTENT_DIR): TextScore[] {
  const removeTerms = glossaryRemover(glossaryTerms(root));
  const out: TextScore[] = [];
  for (const prose of proseStrings(root)) {
    const text = studentText(prose.value);
    if (!text.trim()) continue;
    out.push({
      file: prose.file,
      line: prose.line,
      kind: prose.kind,
      text,
      raw: score(text),
      adjusted: score(removeTerms(text)),
    });
  }
  return out;
}

/** Texts long enough to score whose grade (glossary terms left out) is above the limit. */
export function above(texts: TextScore[], limit: number, minWords = MIN_WORDS): TextScore[] {
  return texts
    .filter((t) => t.adjusted.words >= minWords && (t.adjusted.grade ?? 0) > limit)
    .sort((a, b) => (b.adjusted.grade ?? 0) - (a.adjusted.grade ?? 0));
}

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}

function main() {
  const flagAbove = Number(arg('flag-above', String(FLAG_ABOVE)));
  const failArg = arg('fail-above', '9');
  const failAbove = failArg === 'off' ? Infinity : Number(failArg);
  const minWords = Number(arg('min-words', String(MIN_WORDS)));
  const markdown = arg('markdown', '');
  const quiet = process.argv.includes('--quiet');

  const all = readingLevels();
  const scored = all.filter((t) => t.adjusted.words >= minWords && t.adjusted.grade !== null);
  const grade = (t: TextScore) => t.adjusted.grade ?? 0;
  const flagged = above(all, flagAbove, minWords);
  const failing = flagged.filter((t) => grade(t) > failAbove);
  const total = score(all.map((t) => t.text).join('\n'));

  const excerpt = (t: TextScore) => {
    const one = t.text.replace(/\s+/g, ' ').trim();
    return one.length > 90 ? `${one.slice(0, 87)}…` : one;
  };
  const row = (t: TextScore) =>
    `${t.file}:${t.line} — ${t.kind}, grade ${grade(t)} (raw ${t.raw.grade}): "${excerpt(t)}"`;

  const summary = [
    `Reading level: ${all.length} texts, ${total.words} words, overall grade ${total.grade}.`,
    `${scored.length} texts have ${minWords}+ words; ${flagged.length} are above grade ${flagAbove}` +
      (Number.isFinite(failAbove) ? `, ${failing.length} above grade ${failAbove} (fails).` : '.'),
  ];
  if (!quiet) {
    for (const t of flagged) console.log(`${grade(t) > failAbove ? '✖' : '⚠'} ${row(t)}`);
    if (flagged.length) console.log('');
  }
  console.log(summary.join('\n'));

  if (markdown) {
    const md = [
      '## Reading level',
      '',
      ...summary,
      '',
      'Scores are Flesch–Kincaid grades with glossary terms left out (raw score in brackets).',
      '',
      ...(flagged.length
        ? [
            '| Grade | Raw | Where | Kind | Text |',
            '|---:|---:|---|---|---|',
            ...flagged.map(
              (t) =>
                `| ${grade(t) > failAbove ? '**' + grade(t) + '**' : grade(t)} | ${t.raw.grade} | \`${t.file}:${t.line}\` | ${t.kind} | ${excerpt(t).replace(/\|/g, '\\|')} |`,
            ),
          ]
        : ['No text is above the target grade.']),
      '',
    ];
    writeFileSync(markdown, md.join('\n'));
  }
  if (failing.length) process.exit(1);
}

if (process.argv[1] && import.meta.filename === process.argv[1]) main();
