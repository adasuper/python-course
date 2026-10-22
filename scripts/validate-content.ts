// npm run validate-content
// Checks every content file against the schema, cross-checks references, and runs
// every reference solution and known-wrong solution through the real Python runtime.
import { crossCheck, loadContent, units, type Problem } from './lib/content';
import { checkRegion, checkUnit } from './lib/contentCheck';
import { getPyHost } from './lib/pyHost';
import { reportProblems } from './lib/report';
import { above, FLAG_ABOVE, readingLevels } from './reading-level';

async function main() {
  const started = Date.now();
  const content = loadContent();
  const problems: Problem[] = [...content.problems, ...crossCheck(content)];
  if (!problems.length) {
    const host = await getPyHost();
    for (const unit of units(content)) {
      for (const message of checkUnit(host, unit))
        problems.push({ file: unit.file, message: `${unit.label}: ${message}` });
    }
    for (const region of content.regions) {
      for (const message of checkRegion(host, region.data)) problems.push({ file: region.file, message });
    }
  }
  if (problems.length) {
    reportProblems(problems);
    process.exit(1);
  }
  const all = units(content);
  console.log(
    `✓ content OK: ${content.regions.length} region(s), ${content.quests.size} quest(s), ${all.length} playable unit(s) checked in ${((Date.now() - started) / 1000).toFixed(1)} s`,
  );
  const hard = above(readingLevels(), FLAG_ABOVE);
  console.log(
    hard.length
      ? `⚠ reading level: ${hard.length} text(s) above grade ${FLAG_ABOVE} — run npm run reading-level for the list`
      : `✓ reading level: no text above grade ${FLAG_ABOVE}`,
  );
}

void main();
