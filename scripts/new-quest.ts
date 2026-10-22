// npm run new-quest -- --region 1 --type make --slug river-ferry [--side]
//
// Writes a schema-valid quest file with a TODO marker in every field an author must fill in
// (docs/specs.md §10.6). Then: list the quest in region.yaml, replace the TODOs and run
// `npm run validate-content`.
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import { parseQuest, QuestTypeSchema } from '../src/content/schema';
import { CONTENT_DIR } from './lib/content';

export type QuestType = (typeof QuestTypeSchema.options)[number];

export interface ScaffoldRequest {
  region: number;
  type: QuestType;
  slug: string;
  side?: boolean;
}

export interface Scaffold {
  id: string;
  file: string;
  text: string;
  /** Where the id goes in region.yaml. */
  listIn: 'quests' | 'side_quests' | 'boss';
}

const indent = (text: string, spaces: number) =>
  text
    .split('\n')
    .map((l) => (l ? ' '.repeat(spaces) + l : l))
    .join('\n');

/** The fields every playable body has (a quest, or one boss phase). */
function body(type: Exclude<QuestType, 'boss'>): string {
  const outcome = 'learning_outcome: "TODO: Use … to … (start with a measurable verb)"';
  const head = `type: ${type}
${outcome}
csta: [2-AP-10] # TODO: check the CSTA codes in docs/curriculum-map.md
estimated_minutes: 8 # TODO
story_intro: |
  TODO: Set the scene in two or three short sentences. Who needs help, and why?
goal: "TODO: One sentence: what the student's code must do."
stage: { kind: none } # TODO: a grid or npc stage, if the quest shows one (see Region 1)
`;
  const hints = `hints:
  - "TODO: Hint 1, a nudge in the right direction."
  - "TODO: Hint 2, the idea explained."
  - |
    TODO: Hint 3, a near-complete example with a ____ gap.
    \`\`\`python
    print(____)
    \`\`\`
`;
  const checked = `validators:
  - id: main-check
    type: output
    expect: "TODO: the exact output"
    fail_hint: "TODO: what to look at when this check fails"
common_mistakes:
  - id: todo-mistake
    detect: { kind: validator_failed, id: main-check }
    feedback: "TODO: kind, specific feedback for this mistake"
wrong_solutions:
  - expect_mistake: todo-mistake
    code: |
      # TODO: a typical wrong attempt
  - expect_mistake: todo-mistake
    code: |
      # TODO: another typical wrong attempt
`;
  switch (type) {
    case 'predict':
      return `${head}starter_code: |
  # TODO: the program the student reads (it runs after they lock in)
  print("TODO")
prompts:
  - kind: mcq
    question: "TODO: What will this print?"
    options: ["TODO: right answer", "TODO: wrong answer", "TODO: another wrong answer"]
    answer: 0
    explain: "TODO: why the right answer is right"
${hints}`;
    case 'investigate':
      return `${head}starter_code: |
  # TODO: the program the student runs and changes
  print("TODO")
questions:
  - kind: mcq
    question: "TODO: a question about what the program does"
    options: ["TODO: right answer", "TODO: wrong answer", "TODO: another wrong answer"]
    answer: 0
    hint: "TODO: where to look"
  - kind: text
    question: "TODO: Change … and run it again. What do you see?"
    accept: ["TODO"]
    hint: "TODO: where to look"
${hints}`;
    case 'parsons':
      return `${head}parsons:
  lines: # TODO: the solution, one line each, in order
    - print("TODO 1")
    - print("TODO 2")
  distractors: [] # TODO: one or two wrong lines that look right
${checked}${hints}`;
    case 'fill':
      return `${head}starter_code: |
  # TODO: the program with ____ where the student types
  print(____)
solution: |
  print("TODO")
${checked}${hints}`;
    default:
      return `${head}starter_code: |
  # TODO: starter code${type === 'fix' ? ' with the bugs to fix' : type === 'modify' ? ' that works; the student changes it' : ''}
solution: |
  # TODO: reference solution
  print("TODO")
${checked}${hints}`;
  }
}

export function scaffold(req: ScaffoldRequest, root = CONTENT_DIR): Scaffold {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(req.slug))
    throw new Error(`--slug "${req.slug}": use lowercase letters, digits and hyphens`);
  if (!QuestTypeSchema.options.includes(req.type))
    throw new Error(`--type "${req.type}": use one of ${QuestTypeSchema.options.join(', ')}`);
  const prefix = String(req.region).padStart(2, '0') + '-';
  const regions = join(root, 'regions');
  const dir = readdirSync(regions).find((d) => d.startsWith(prefix));
  if (!dir)
    throw new Error(
      `Region ${req.region} has no folder yet. Create content/regions/${prefix}<name>/region.yaml first (copy Region 1's).`,
    );
  const regionSlug = dir.slice(prefix.length);
  const questsDir = join(regions, dir, 'quests');
  const existing = existsSync(questsDir) ? readdirSync(questsDir) : [];
  const next = (kind: 'q' | 'side') => {
    const re = new RegExp(`^r${req.region}-${kind}(\\d+)-`);
    const numbers = existing.map((f) => Number(re.exec(f)?.[1] ?? 0));
    return Math.max(0, ...numbers) + 1;
  };
  let id: string;
  let listIn: Scaffold['listIn'] = 'quests';
  if (req.type === 'boss') {
    if (existing.some((f) => f.startsWith(`r${req.region}-boss-`)))
      throw new Error(`Region ${req.region} already has a boss quest.`);
    id = `r${req.region}-boss-${req.slug}`;
    listIn = 'boss';
  } else if (req.side) {
    id = `r${req.region}-side${next('side')}-${req.slug}`;
    listIn = 'side_quests';
  } else {
    id = `r${req.region}-q${next('q')}-${req.slug}`;
  }

  const meta = `# yaml-language-server: $schema=../../../../schema/quest.schema.json
id: ${id}
region: ${regionSlug}
title: "TODO: Quest title"
prerequisites: [] # TODO: the quest(s) that come before this one
vocabulary: [] # TODO: glossary terms this quest uses
${req.side ? 'side_quest: true\n' : ''}`;
  const outro = `story_outro: |
  TODO: What happens when the student succeeds?
`;
  let text: string;
  if (req.type === 'boss') {
    const phase = (n: number, type: 'fix' | 'make') =>
      `  - id: phase-${n}
    title: "TODO: Phase ${n} title"
${indent(body(type), 4)}`;
    text = `${meta}type: boss
learning_outcome: "TODO: Use … to … (start with a measurable verb)"
csta: [2-AP-17] # TODO
estimated_minutes: 12 # TODO
boss:
  name: "TODO: The … Bug"
  bug: "TODO: the bug's name"
  sprite: bug_clangle # TODO: draw a sprite in src/art/characters.ts
story_intro: |
  TODO: The bug appears and breaks something. What is at stake?
goal: "TODO: Fix … in three phases."
phases:
${phase(1, 'fix')}
${phase(2, 'fix')}
${phase(3, 'make')}
${outro}`;
  } else {
    text = `${meta}${body(req.type)}${outro}`;
  }

  const parsed = parseQuest(parse(text));
  if (!parsed.success) {
    throw new Error(
      `The ${req.type} template is not schema-valid (a bug in new-quest.ts):\n${parsed.error.message}`,
    );
  }
  return { id, file: join(questsDir, `${id}.yaml`), text, listIn };
}

function main() {
  const arg = (name: string) => {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  const region = Number(arg('region'));
  const type = arg('type') as QuestType | undefined;
  const slug = arg('slug');
  if (!region || !type || !slug) {
    console.error('Usage: npm run new-quest -- --region 4 --type make --slug river-ferry [--side]');
    process.exit(1);
  }
  try {
    const result = scaffold({ region, type, slug, side: process.argv.includes('--side') });
    if (existsSync(result.file)) throw new Error(`${relative(process.cwd(), result.file)} already exists.`);
    writeFileSync(result.file, result.text);
    console.log(`✓ wrote ${relative(process.cwd(), result.file)}
Next:
  1. Add "${result.id}" to ${result.listIn === 'boss' ? 'boss:' : `the ${result.listIn}: list`} in this region's region.yaml.
  2. Replace every TODO.
  3. Run npm run validate-content (it runs your solution and wrong solutions).
  4. Play it: npm run dev, then open /?dev#/dev/quest/${result.id}`);
  } catch (e) {
    console.error(`✖ ${(e as Error).message}`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.filename === process.argv[1]) main();
