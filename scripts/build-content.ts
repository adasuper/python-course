// Compiles content/**/*.yaml into src/generated/content/*.json for the game.
// Hidden-test expectations are baked here by running each reference solution.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Quest } from '../src/content/types';
import type { ValidatorSpec } from '../src/runtime/protocol';
import {
  compileCourse,
  compileQuest,
  compileRegion,
  contentVersion,
  crossCheck,
  loadContent,
  needsBaking,
  units,
} from './lib/content';
import { bakeValidators } from './lib/contentCheck';
import { getPyHost } from './lib/pyHost';
import { reportProblems } from './lib/report';
import { writeSchemas } from './write-schema';

const OUT = join(import.meta.dirname, '..', 'src', 'generated', 'content');

async function main() {
  const content = loadContent();
  const problems = [...content.problems, ...crossCheck(content)];
  if (problems.length) {
    reportProblems(problems);
    process.exit(1);
  }
  const baked = new Map<string, ValidatorSpec[]>();
  const toBake = units(content).filter((u) => needsBaking(u.body));
  if (toBake.length) {
    const host = await getPyHost();
    for (const unit of toBake) {
      const { validators, problem } = bakeValidators(host, unit.body);
      if (problem) {
        reportProblems([{ file: unit.file, message: `${unit.label}: ${problem}` }]);
        process.exit(1);
      }
      baked.set(unit.key, validators);
    }
  }

  const course = compileCourse(content);
  const regionJson: Record<string, string> = {};
  for (const region of content.regions) {
    const quests: Record<string, Quest> = {};
    for (const [id, q] of content.quests) {
      if (q.data.region === region.data.id) quests[id] = compileQuest(q.data, baked);
    }
    regionJson[region.data.id] = JSON.stringify(compileRegion(region.data, quests));
  }
  const version = contentVersion(JSON.stringify(course) + Object.values(regionJson).join(''));
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'course.json'), JSON.stringify({ ...course, contentVersion: version }));
  for (const [id, json] of Object.entries(regionJson)) writeFileSync(join(OUT, `region-${id}.json`), json);
  writeSchemas();
  console.log(
    `content: ${content.regions.length} region(s), ${content.quests.size} quest(s), version ${version}` +
      (toBake.length ? `, ${toBake.length} hidden-test set(s) baked` : ''),
  );
}

void main();
