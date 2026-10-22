// Loads, checks and compiles the YAML content in content/ (docs/specs.md §10).
// Shared by build-content, validate-content and the generated content tests.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { isMap, isSeq, LineCounter, parseDocument, visit, type Scalar } from 'yaml';
import type { z } from 'zod';
import {
  CourseSchema,
  ErrorsSchema,
  GlossarySchema,
  ItemsSchema,
  parseQuest,
  RegionSchema,
  type BossQuestFile,
  type CourseFile,
  type ErrorsFile,
  type GlossaryFile,
  type ItemsFile,
  type NormalQuestFile,
  type PhaseFile,
  type QuestFile,
  type RegionFile,
} from '../../src/content/schema';
import { parseRich, termsIn, type Rich } from '../../src/content/richtext';
import {
  BOSS_PHASE_XP,
  DEFAULT_XP,
  SIDE_QUEST_XP,
  type Course,
  type Phase,
  type Quest,
  type QuestBody,
  type Region,
} from '../../src/content/types';
import { STAGE_LEGEND, stageRows } from '../../src/game/legend';
import type { StageSpec, ValidatorSpec } from '../../src/runtime/protocol';
import { proseStrings } from './prose';

export const CONTENT_DIR = join(import.meta.dirname, '..', '..', 'content');

export interface Problem {
  file: string;
  line?: number;
  message: string;
}

export type Locate = (path: (string | number)[]) => number | undefined;

interface Located<T> {
  file: string;
  data: T;
  /** The line of a YAML path in this file (for author-friendly problems). */
  locate: Locate;
}

export interface LoadedContent {
  course: Located<CourseFile> | null;
  glossary: GlossaryFile;
  items: ItemsFile;
  errors: ErrorsFile;
  regions: (Located<RegionFile> & { dir: string })[];
  quests: Map<string, Located<QuestFile> & { regionDir: string }>;
  problems: Problem[];
}

// ----- reading YAML with line numbers -------------------------------------------

function readYaml(file: string, problems: Problem[]) {
  const text = readFileSync(file, 'utf8');
  const lineCounter = new LineCounter();
  const doc = parseDocument(text, { lineCounter, prettyErrors: true });
  for (const err of doc.errors) {
    problems.push({
      file: rel(file),
      line: err.linePos?.[0]?.line,
      message: `YAML: ${err.message.split('\n')[0]}`,
    });
  }
  // An unquoted ` #` inside a sentence silently starts a YAML comment and cuts the text short.
  visit(doc, {
    Scalar(_key, node: Scalar) {
      if (
        node.type === 'PLAIN' &&
        node.comment &&
        typeof node.value === 'string' &&
        node.value.trim().split(/\s+/).length >= 3
      ) {
        problems.push({
          file: rel(file),
          line: node.range ? lineCounter.linePos(node.range[0]).line : undefined,
          message: `the text "${node.value.slice(0, 40)}…" is cut short by a # — put the whole text in quotes`,
        });
      }
    },
  });
  const locate = (path: (string | number)[]): number | undefined => {
    for (let n = path.length; n >= 0; n--) {
      const node = doc.getIn(path.slice(0, n), true) as { range?: [number, number, number] } | undefined;
      if (node && typeof node === 'object' && node.range) return lineCounter.linePos(node.range[0]).line;
      if (n === 0 && (isMap(doc.contents) || isSeq(doc.contents))) return 1;
    }
    return undefined;
  };
  return { data: doc.toJS() as unknown, locate };
}

function rel(file: string) {
  return relative(join(CONTENT_DIR, '..'), file);
}

function parseWith<T>(
  file: string,
  schema: z.ZodType<T>,
  problems: Problem[],
): { data: T; locate: Locate } | null {
  const { data, locate } = readYaml(file, problems);
  const result = schema.safeParse(data);
  if (result.success) return { data: result.data, locate };
  for (const issue of result.error.issues) {
    const path = issue.path.filter((p): p is string | number => typeof p !== 'symbol');
    problems.push({
      file: rel(file),
      line: locate(path),
      message: `${path.join('.') || '(file)'}: ${issue.message}`,
    });
  }
  return null;
}

// ----- loading ------------------------------------------------------------------

export function loadContent(root = CONTENT_DIR): LoadedContent {
  const problems: Problem[] = [];
  const out: LoadedContent = {
    course: null,
    glossary: [],
    items: [],
    errors: {},
    regions: [],
    quests: new Map(),
    problems,
  };
  const courseFile = join(root, 'course.yaml');
  const course = parseWith(courseFile, CourseSchema, problems);
  if (course) out.course = { file: rel(courseFile), ...course };
  out.glossary = parseWith(join(root, 'glossary.yaml'), GlossarySchema, problems)?.data ?? [];
  out.items = parseWith(join(root, 'items.yaml'), ItemsSchema, problems)?.data ?? [];
  out.errors = parseWith(join(root, 'errors.yaml'), ErrorsSchema, problems)?.data ?? {};

  const regionsDir = join(root, 'regions');
  for (const dir of readdirSync(regionsDir).sort()) {
    const regionFile = join(regionsDir, dir, 'region.yaml');
    if (!existsSync(regionFile)) continue;
    const region = parseWith(regionFile, RegionSchema, problems);
    if (region) out.regions.push({ file: rel(regionFile), dir, ...region });
    const questsDir = join(regionsDir, dir, 'quests');
    if (!existsSync(questsDir)) continue;
    for (const name of readdirSync(questsDir).sort()) {
      if (!name.endsWith('.yaml')) continue;
      const file = join(questsDir, name);
      const { data, locate } = readYaml(file, problems);
      const result = parseQuest(data);
      if (!result.success) {
        for (const issue of result.error.issues) {
          const path = issue.path.filter((p): p is string | number => typeof p !== 'symbol');
          problems.push({
            file: rel(file),
            line: locate(path),
            message: `${path.join('.') || '(file)'}: ${issue.message}`,
          });
        }
        continue;
      }
      const quest = result.data as QuestFile;
      if (quest.id !== basename(name, '.yaml')) {
        problems.push({
          file: rel(file),
          line: locate(['id']),
          message: `id "${quest.id}" must match the file name`,
        });
      }
      if (out.quests.has(quest.id)) {
        problems.push({ file: rel(file), message: `duplicate quest id "${quest.id}"` });
      }
      out.quests.set(quest.id, { file: rel(file), data: quest, regionDir: dir, locate });
    }
  }
  return out;
}

// ----- playable units: a quest, or each phase of a boss --------------------------

export type Body = NormalQuestFile | PhaseFile;

export interface Unit {
  /** Quest id, or "questId›phaseId" for a boss phase. */
  key: string;
  questId: string;
  label: string;
  file: string;
  body: Body;
  /** The line of a path inside this body (a boss phase's paths start at its phase). */
  locate: Locate;
}

export function units(content: LoadedContent): Unit[] {
  const list: Unit[] = [];
  for (const [id, q] of content.quests) {
    if (q.data.type === 'boss') {
      (q.data as BossQuestFile).phases.forEach((phase, i) => {
        list.push({
          key: `${id}›${phase.id}`,
          questId: id,
          label: `${id} › ${phase.id}`,
          file: q.file,
          body: phase,
          locate: (path) => q.locate(['phases', i, ...path]),
        });
      });
    } else {
      list.push({
        key: id,
        questId: id,
        label: id,
        file: q.file,
        body: q.data as NormalQuestFile,
        locate: q.locate,
      });
    }
  }
  return list;
}

const CODE_CHECKED = new Set(['fix', 'fill', 'parsons', 'modify', 'make']);

export function isCodeChecked(body: Body) {
  return CODE_CHECKED.has(body.type);
}

/** The program a unit's solution stands for (Parsons solutions are assembled from lines). */
export function solutionCode(body: Body): string {
  if (body.type === 'parsons' && body.parsons) {
    return [...body.parsons.fixed_top, ...body.parsons.lines].join('\n') + '\n';
  }
  return body.solution ?? '';
}

/** Turn a Parsons order (indexes into lines, then distractors) into a program. */
export function parsonsProgram(body: Body, order: number[]): string {
  const p = body.parsons!;
  const pool = [...p.lines, ...p.distractors];
  return [...p.fixed_top, ...order.map((i) => pool[i] ?? '')].join('\n') + '\n';
}

// ----- cross-reference checks ---------------------------------------------------

/** The problems with a quest grid: unknown symbols, ragged rows, not exactly one hero. */
export function gridProblems(stage: StageSpec): string[] {
  if (stage.kind !== 'grid') return [];
  const rows = stageRows(stage);
  const problems: string[] = [];
  if (!rows.length) return ['the grid is empty'];
  const width = rows[0]!.length;
  let heroes = 0;
  rows.forEach((row, y) => {
    if (row.length !== width)
      problems.push(
        `grid row ${y + 1} has ${row.length} characters; row 1 has ${width} (make every row the same width)`,
      );
    [...row].forEach((ch, x) => {
      const entry = stage.legend?.[ch] ?? STAGE_LEGEND[ch];
      if (!entry) problems.push(`grid symbol "${ch}" at column ${x + 1}, row ${y + 1} is not in the legend`);
      else if (entry.hero) heroes++;
    });
  });
  if (heroes !== 1) problems.push(`the grid needs exactly one hero (H); it has ${heroes}`);
  return problems;
}

/** Fix quests tell the student how many bugs to find (F-QST-07). */
const BUG_COUNT =
  /\b(\d+|one|two|three|four|five|a single|an?)\s+(?:\*\*)?(?:little |tiny |sneaky )?(bugs?|glitch(?:es)?|mistakes?|errors?|problems?)\b/i;

export function crossCheck(content: LoadedContent, root = CONTENT_DIR): Problem[] {
  const problems: Problem[] = [];
  const glossary = new Set(content.glossary.map((g) => g.term.toLowerCase()));
  const items = new Set(content.items.map((i) => i.id));
  const add = (file: string, message: string, line?: number) => problems.push({ file, line, message });

  // Glossary links and ____ gaps, in every student-facing text of every file.
  for (const prose of proseStrings(root)) {
    for (const term of termsIn(parseRich(prose.value))) {
      if (!glossary.has(term))
        add(prose.file, `glossary link [[${term}]] has no entry in glossary.yaml`, prose.line);
    }
    const tier3 = prose.path.at(-2) === 'hints' && prose.path.at(-1) === 2;
    if (prose.value.includes('____') && !tier3)
      add(prose.file, `____ gaps belong only in fill starters and the third hint`, prose.line);
  }

  if (content.course) {
    const course = content.course;
    course.data.regions.forEach((r, i) => {
      if (!content.regions.some((reg) => reg.data.id === r.id))
        add(course.file, `region "${r.id}" has no region.yaml`, course.locate(['regions', i]));
    });
  }

  for (const [, q] of content.quests) {
    const quest = q.data;
    const region = content.regions.find((r) => r.dir === q.regionDir);
    if (region && quest.region !== region.data.id)
      add(q.file, `region should be "${region.data.id}"`, q.locate(['region']));
    quest.prerequisites.forEach((pre, i) => {
      if (!content.quests.has(pre))
        add(q.file, `prerequisite "${pre}" does not exist`, q.locate(['prerequisites', i]));
    });
    quest.vocabulary.forEach((term, i) => {
      if (!glossary.has(term.toLowerCase()))
        add(q.file, `vocabulary "${term}" has no entry in glossary.yaml`, q.locate(['vocabulary', i]));
    });
    if (quest.rewards.item && !items.has(quest.rewards.item))
      add(q.file, `reward item "${quest.rewards.item}" is not in items.yaml`, q.locate(['rewards', 'item']));
    if (quest.type !== 'boss' && !quest.concept_card)
      add(q.file, 'concept_card is required (it is shown in the Spellbook)', q.locate(['type']));
  }

  for (const unit of units(content)) {
    const b = unit.body;
    const where = unit.label;
    const at = (...path: (string | number)[]) => unit.locate(path);
    if (isCodeChecked(b)) {
      if (b.type !== 'parsons' && !b.solution) add(unit.file, `${where}: a solution is required`, at('type'));
      if (b.validators.length === 0) add(unit.file, `${where}: add at least one validator`, at('type'));
      if (b.wrong_solutions.length < 2)
        add(unit.file, `${where}: add at least 2 wrong_solutions`, at('wrong_solutions'));
    }
    if (b.type === 'predict' && !b.prompts?.length)
      add(unit.file, `${where}: predict quests need prompts`, at('type'));
    if (b.type === 'investigate' && !b.questions?.length)
      add(unit.file, `${where}: investigate quests need questions`, at('type'));
    if (b.type === 'parsons' && !b.parsons)
      add(unit.file, `${where}: parsons quests need a parsons block`, at('type'));
    if (b.type === 'fix' && !BUG_COUNT.test(`${b.story_intro} ${b.goal}`))
      add(
        unit.file,
        `${where}: say how many bugs there are, e.g. "This spell has 2 bugs"`,
        at('story_intro'),
      );
    b.prompts?.forEach((p, i) => {
      if (p.kind === 'mcq' && p.answer >= p.options.length)
        add(unit.file, `${where}: prompt answer index out of range`, at('prompts', i, 'answer'));
    });
    b.questions?.forEach((p, i) => {
      if (p.kind === 'mcq' && p.answer >= p.options.length)
        add(unit.file, `${where}: question answer index out of range`, at('questions', i, 'answer'));
    });
    if (b.type !== 'fill' && b.starter_code.includes('____'))
      add(unit.file, `${where}: ____ gaps belong only in fill quests`, at('starter_code'));
    for (const message of gridProblems(b.stage as StageSpec))
      add(unit.file, `${where}: ${message}`, at('stage', 'grid'));
    const mistakeIds = new Set(b.common_mistakes.map((m) => m.id));
    b.wrong_solutions.forEach((w, i) => {
      if (w.expect_mistake && !mistakeIds.has(w.expect_mistake)) {
        add(
          unit.file,
          `${where}: wrong solution expects mistake "${w.expect_mistake}", which is not in common_mistakes`,
          at('wrong_solutions', i, 'expect_mistake'),
        );
      }
    });
  }

  for (const region of content.regions) {
    const r = region.data;
    const at = region.locate;
    const listed = [...r.quests, r.boss, ...r.side_quests];
    for (const qid of listed) {
      const q = content.quests.get(qid);
      if (!q) add(region.file, `quest "${qid}" has no file`, at(['quests']));
      else if (q.data.region !== r.id)
        add(region.file, `quest "${qid}" belongs to region "${q.data.region}"`, at(['quests']));
    }
    for (const [qid, q] of content.quests) {
      if (q.regionDir === region.dir && !listed.includes(qid))
        add(q.file, `quest is not listed in ${region.file}`, q.locate(['id']));
    }
    if (content.quests.get(r.boss)?.data.type !== 'boss')
      add(region.file, `boss "${r.boss}" must be a boss quest`, at(['boss']));
    const regionUnits = units(content).filter((u) => content.quests.get(u.questId)?.data.region === r.id);
    if (!regionUnits.some((u) => u.body.type === 'fix'))
      add(region.file, 'every region needs at least one fix-the-bug quest', at(['quests']));
    if (r.number >= 3) {
      const hasRetrieval = listed.some((qid) => (content.quests.get(qid)?.data.retrieval.length ?? 0) > 0);
      if (!hasRetrieval)
        add(
          region.file,
          'regions from 3 on need a quest with `retrieval:` (spaced retrieval)',
          at(['quests']),
        );
    }
    const rows = r.overworld.grid.replace(/\n+$/, '').split('\n');
    r.overworld.objects.forEach((obj, i) => {
      const [x, y] = obj.at;
      const line = at(['overworld', 'objects', i]);
      if (y >= rows.length || x >= (rows[y]?.length ?? 0))
        add(region.file, `object at [${x}, ${y}] is off the map`, line);
      if (obj.kind === 'npc' && (!obj.id || !r.npcs[obj.id]))
        add(region.file, `npc object "${obj.id}" is not in npcs`, line);
      if (obj.quest && !content.quests.has(obj.quest))
        add(region.file, `object quest "${obj.quest}" does not exist`, line);
    });
    if (!r.overworld.objects.some((o) => o.kind === 'spawn'))
      add(region.file, 'the overworld needs a spawn object', at(['overworld', 'objects']));
    r.knowledge_check.items.forEach((it, i) => {
      if (it.kind === 'mcq' && it.answer >= it.options.length)
        add(
          region.file,
          `knowledge_check item ${i + 1}: answer index out of range`,
          at(['knowledge_check', 'items', i, 'answer']),
        );
    });
  }

  // Prerequisite cycles.
  const visiting = new Set<string>();
  const done = new Set<string>();
  const visit = (id: string, chain: string[]) => {
    if (done.has(id)) return;
    if (visiting.has(id)) {
      const q = content.quests.get(id);
      add(q?.file ?? id, `prerequisite cycle: ${[...chain, id].join(' → ')}`, q?.locate(['prerequisites']));
      return;
    }
    visiting.add(id);
    for (const pre of content.quests.get(id)?.data.prerequisites ?? []) visit(pre, [...chain, id]);
    visiting.delete(id);
    done.add(id);
  };
  for (const id of content.quests.keys()) visit(id, []);
  return problems;
}

// ----- compiling -----------------------------------------------------------------

const rich = (s: string): Rich => parseRich(s);
const richOrNull = (s: string | undefined): Rich | null => (s ? parseRich(s) : null);

function withIds(validators: ValidatorSpec[]): ValidatorSpec[] {
  return validators.map((v, i) => ({ ...v, id: v.id ?? `${v.type}-${i + 1}` }));
}

/** Validator lists that need running the solution first (hidden tests). */
export function needsBaking(body: Body) {
  return body.validators.some((v) => v.type === 'hidden_tests');
}

export function compileBody(body: Body, baked?: ValidatorSpec[]): QuestBody {
  return {
    type: body.type,
    learningOutcome: body.learning_outcome,
    csta: body.csta,
    estimatedMinutes: body.estimated_minutes,
    storyIntro: rich(body.story_intro),
    goal: rich(body.goal),
    stage: body.stage as StageSpec,
    starterCode: body.starter_code,
    validators: withIds(baked ?? (body.validators as ValidatorSpec[])),
    mistakes: body.common_mistakes,
    hints: body.hints.map(rich),
    inputs: body.inputs,
    seed: body.seed ?? 0,
    prompts: body.prompts
      ? body.prompts.map((p) =>
          p.kind === 'mcq'
            ? {
                kind: 'mcq',
                question: rich(p.question),
                options: p.options,
                answer: p.answer,
                explain: rich(p.explain),
              }
            : { kind: 'text', question: rich(p.question), answer: p.answer, explain: rich(p.explain) },
        )
      : null,
    questions: body.questions
      ? body.questions.map((q) => {
          const base = { question: rich(q.question), hint: rich(q.hint), explain: richOrNull(q.explain) };
          if (q.kind === 'mcq') return { kind: 'mcq', ...base, options: q.options, answer: q.answer };
          if (q.kind === 'number') return { kind: 'number', ...base, answer: q.answer };
          return { kind: 'text', ...base, accept: q.accept };
        })
      : null,
    parsons: body.parsons
      ? {
          lines: body.parsons.lines,
          distractors: body.parsons.distractors,
          fixedTop: body.parsons.fixed_top,
          indent: body.parsons.indent,
          check: body.parsons.check,
          alternatives: body.parsons.alternatives,
        }
      : null,
    jarShelf: body.jar_shelf ?? body.type !== 'predict',
    bonus: body.bonus.map((b) => ({ ...b, check: b.check as ValidatorSpec })),
  };
}

export function compileQuest(file: QuestFile, baked: Map<string, ValidatorSpec[]>): Quest {
  const meta = {
    id: file.id,
    region: file.region,
    title: file.title,
    prerequisites: file.prerequisites,
    sideQuest: file.side_quest,
    npc: file.npc ?? null,
    vocabulary: file.vocabulary,
    retrieval: file.retrieval,
    conceptCard: richOrNull(file.concept_card),
    storyOutro: rich(file.story_outro),
  };
  if (file.type === 'boss') {
    const phases: Phase[] = file.phases.map((p) => ({
      ...compileBody(p, baked.get(`${file.id}›${p.id}`)),
      id: p.id,
      title: p.title,
      carryCode: p.carry_code,
      storyOutro: richOrNull(p.story_outro),
    }));
    return {
      ...meta,
      type: 'boss',
      learningOutcome: file.learning_outcome,
      csta: file.csta,
      estimatedMinutes: file.estimated_minutes,
      storyIntro: rich(file.story_intro),
      goal: rich(file.goal),
      boss: file.boss,
      phases,
      rewards: {
        xp: file.rewards.xp ?? phases.length * BOSS_PHASE_XP,
        item: file.rewards.item ?? null,
        badge: file.rewards.badge ?? null,
      },
    };
  }
  const xp = file.rewards.xp ?? (file.side_quest ? SIDE_QUEST_XP : DEFAULT_XP[file.type]);
  return {
    ...meta,
    ...compileBody(file, baked.get(file.id)),
    rewards: { xp, item: file.rewards.item ?? null, badge: file.rewards.badge ?? null },
  };
}

export function compileRegion(region: RegionFile, quests: Record<string, Quest>): Region {
  return {
    id: region.id,
    number: region.number,
    name: region.name,
    concepts: region.concepts,
    intro: region.intro.map((l) => ({ speaker: l.speaker, text: rich(l.text) })),
    overworld: {
      grid: region.overworld.grid.replace(/\n+$/, ''),
      legend: region.overworld.legend ?? {},
      objects: region.overworld.objects.map((o) => ({
        kind: o.kind,
        id: o.id ?? null,
        at: o.at,
        quest: o.quest ?? null,
        text: o.text ?? null,
      })),
    },
    npcs: Object.fromEntries(
      Object.entries(region.npcs).map(([k, v]) => [
        k,
        { name: v.name, sprite: v.sprite, greeting: v.greeting ?? null },
      ]),
    ),
    conceptScene: {
      title: region.concept_scene.title,
      analogy: rich(region.concept_scene.analogy),
      lines: region.concept_scene.lines.map((l) => ({ speaker: l.speaker, text: rich(l.text) })),
      workedExample: {
        code: region.concept_scene.worked_example.code,
        stage: region.concept_scene.worked_example.stage as StageSpec,
        explain: region.concept_scene.worked_example.explain.map((e) => ({
          line: e.line,
          text: rich(e.text),
        })),
      },
    },
    quests: region.quests,
    boss: region.boss,
    sideQuests: region.side_quests,
    knowledgeCheck: {
      items: region.knowledge_check.items.map((it) =>
        it.kind === 'mcq'
          ? {
              kind: 'mcq',
              question: rich(it.question),
              code: it.code ?? null,
              options: it.options,
              answer: it.answer,
              explain: rich(it.explain),
            }
          : {
              kind: 'predict',
              question: rich(it.question),
              code: it.code,
              answer: it.answer,
              explain: rich(it.explain),
            },
      ),
    },
    fragment: {
      id: region.fragment.id,
      name: region.fragment.name,
      description: rich(region.fragment.description),
    },
    pois: region.pois,
    questData: quests,
  };
}

export function compileCourse(content: LoadedContent): Omit<Course, 'contentVersion'> {
  const course = content.course!.data;
  const regionOrder = course.regions.map((r) => content.regions.find((reg) => reg.data.id === r.id)!.data);
  const questOrder = regionOrder.flatMap((r) => [...r.quests, r.boss, ...r.side_quests]);
  return {
    id: course.id,
    title: course.title,
    opening: course.opening.map((l) => ({ speaker: l.speaker, text: rich(l.text) })),
    regions: course.regions.map((r) => {
      const reg = content.regions.find((x) => x.data.id === r.id)!.data;
      return { id: r.id, number: reg.number, name: reg.name, enabled: r.enabled, lessons: r.lessons };
    }),
    questOrder,
    questInfo: Object.fromEntries(
      [...content.quests.values()].map(({ data: q }) => [
        q.id,
        {
          region: q.region,
          type: q.type,
          title: q.title,
          item: q.rewards.item ?? null,
          xp:
            q.rewards.xp ??
            (q.type === 'boss'
              ? q.phases.length * BOSS_PHASE_XP
              : q.side_quest
                ? SIDE_QUEST_XP
                : DEFAULT_XP[q.type]),
          phases: q.type === 'boss' ? q.phases.map((p) => p.id) : [],
          sideQuest: q.side_quest,
          prerequisites: q.prerequisites,
        },
      ]),
    ),
    sideQuests: course.side_quests,
    glossary: Object.fromEntries(
      content.glossary.map((g) => [
        g.term.toLowerCase(),
        { term: g.term, definition: rich(g.definition), example: g.example ?? null, related: g.related },
      ]),
    ),
    items: Object.fromEntries(
      content.items.map((i) => [
        i.id,
        {
          id: i.id,
          name: i.name,
          icon: i.icon,
          region: i.region,
          description: rich(i.description),
          example: i.example ?? null,
        },
      ]),
    ),
    errors: Object.fromEntries(
      Object.entries(content.errors).map(([k, v]) => [
        k,
        { title: v.title, message: rich(v.message), tip: richOrNull(v.tip) },
      ]),
    ),
  };
}

export function contentVersion(json: string): string {
  return createHash('sha256').update(json).digest('hex').slice(0, 12);
}
