import type { Problem } from './content';

/** Print content problems the way a teacher can act on them: file:line — message. */
export function reportProblems(problems: Problem[]) {
  for (const p of problems) {
    console.error(`✗ ${p.file}${p.line ? `:${p.line}` : ''} — ${p.message}`);
  }
  console.error(`\n${problems.length} problem(s) found in content/.`);
}
