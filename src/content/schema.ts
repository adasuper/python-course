// The shape of every content file teachers write (docs/specs.md §10).
// Zod checks the YAML at build time; `npm run schema` turns these into JSON Schema so
// editors like VS Code can autocomplete quest files.
import { z } from 'zod';

const Dir = z.enum(['up', 'down', 'left', 'right']);
const Csta = z.string().regex(/^2-(AP|CS|DA|IC|NI)-\d{2}$/, 'CSTA codes look like 2-AP-12');
const QuestId = z.string().regex(/^r\d+-(q\d+|boss|side\d+)-[a-z0-9-]+$/, 'Quest ids look like r4-q3-gatekeeper');
const Slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'Use lowercase letters, digits and hyphens');

// Learning outcomes must be measurable: start with an action verb, not "understand".
const VAGUE = /^(understand|know|learn|be aware|appreciate|grasp)\b/i;
const Outcome = z
  .string()
  .min(10)
  .refine((s) => !VAGUE.test(s.trim()), 'Start the learning outcome with a measurable verb (Use, Predict, Explain…)');

export const LegendEntrySchema = z.strictObject({
  tile: z.string().optional(),
  solid: z.boolean().optional(),
  object: z.string().optional(),
  item: z.string().optional(),
  hero: z.boolean().optional(),
  name: z.string().optional(),
  look: z.string().optional(),
});

export const StageSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('grid'),
    grid: z.string().min(1),
    legend: z.record(z.string().length(1), LegendEntrySchema).optional(),
    facing: Dir.optional(),
    chests: z.record(z.string().length(1), z.strictObject({ code: z.coerce.string(), loot: z.array(z.string()).optional() })).optional(),
    npcs: z.record(z.string().length(1), z.strictObject({ name: z.string().optional(), sprite: z.string().optional() })).optional(),
  }),
  z.strictObject({
    kind: z.literal('npc'),
    cast: z.array(z.strictObject({ sprite: z.string(), name: z.string() })).default([]),
  }),
  z.strictObject({ kind: z.literal('none') }),
]);

const Common = { id: z.string().optional(), fail_hint: z.string().optional() };

const OutputValidator = z.strictObject({
  ...Common,
  type: z.literal('output'),
  match: z.enum(['exact', 'normalized', 'contains', 'regex', 'fuzzy']).default('normalized'),
  expect: z.string().optional(),
  expect_regex: z.string().optional(),
  normalize: z.array(z.enum(['trim', 'case', 'spaces', 'punctuation'])).optional(),
  threshold: z.number().min(0).max(1).optional(),
});

const StateValidator = z.strictObject({
  ...Common,
  type: z.literal('state'),
  hero_at: z.tuple([z.number().int(), z.number().int()]).optional(),
  hero_on: z.string().optional(),
  facing: Dir.optional(),
  has_items: z.array(z.string()).optional(),
  items_count: z.record(z.string(), z.number().int()).optional(),
  chests_opened: z.union([z.number().int(), z.array(z.string())]).optional(),
  max_bonks: z.number().int().optional(),
  said_contains: z.string().optional(),
  said_exact: z.array(z.string()).optional(),
  visited: z.array(z.tuple([z.number().int(), z.number().int()])).optional(),
});

const VariableValidator = z.strictObject({
  ...Common,
  type: z.literal('variable'),
  name: z.string(),
  equals: z.unknown().optional(),
  value_type: z.enum(['int', 'float', 'str', 'bool', 'list', 'dict', 'tuple', 'NoneType']).optional(),
  matches: z.string().optional(),
});

const AstValidator = z.strictObject({
  ...Common,
  type: z.literal('ast'),
  require: z.array(z.string()).optional(),
  forbid: z.array(z.string()).optional(),
  require_calls: z.array(z.string()).optional(),
  min_count: z.record(z.string(), z.number().int()).optional(),
  require_else: z.boolean().optional(),
  function: z
    .strictObject({ name: z.string(), params: z.number().int().optional(), returns: z.boolean().optional() })
    .optional(),
  no_literal: z.array(z.union([z.string(), z.number()])).optional(),
  uses_names: z.array(z.string()).optional(),
  max_lines: z.number().int().optional(),
});

const StyleValidator = z.strictObject({
  ...Common,
  type: z.literal('style'),
  min_comments: z.number().int().optional(),
  comment_above: z.string().optional(),
  max_line_length: z.number().int().optional(),
});

const HiddenCase = z.strictObject({
  vars: z.record(z.string(), z.unknown()).optional(),
  inputs: z.array(z.coerce.string()).optional(),
  seed: z.number().int().optional(),
  stage: StageSchema.optional(),
  args: z.array(z.unknown()).optional(),
  expect: z.record(z.string(), z.unknown()).optional(),
});

const HiddenTestsValidator = z.strictObject({
  ...Common,
  type: z.literal('hidden_tests'),
  mode: z.enum(['vars', 'inputs', 'call', 'seed', 'stages']),
  compare: z.array(z.string()).default(['output']),
  function: z.string().optional(),
  expect: z.literal('from_solution').default('from_solution'),
  cases: z.array(HiddenCase).min(1),
});

const CustomValidator = z.strictObject({ ...Common, type: z.literal('custom'), python: z.string() });

// Session validators look across all of the student's runs in a quest, not just the last
// one (docs/specs.md §9.3).
const Session = { scope: z.literal('session').default('session') };

const BranchCoverageValidator = z.strictObject({
  ...Common,
  ...Session,
  type: z.literal('branch_coverage'),
  min: z.union([z.literal('all'), z.number().int().min(1)]).default('all'),
});

const RunsOkValidator = z.strictObject({
  ...Common,
  ...Session,
  type: z.literal('runs_ok'),
  min_runs: z.number().int().min(1).default(3),
  distinct_inputs: z.boolean().default(false),
});

export const SESSION_VALIDATOR_TYPES: readonly string[] = ['branch_coverage', 'runs_ok'];

export const ValidatorSchema = z.discriminatedUnion('type', [
  OutputValidator,
  StateValidator,
  VariableValidator,
  AstValidator,
  StyleValidator,
  HiddenTestsValidator,
  CustomValidator,
  BranchCoverageValidator,
  RunsOkValidator,
]);

export const DETECTOR_NAMES = [
  'missing_call_parens',
  'printed_not_stored',
  'stored_not_printed',
  'number_as_string',
  'missing_fstring_prefix',
  'assign_in_condition',
  'loop_var_not_updated',
  'function_not_called',
  'hardcoded_output',
] as const;

const Detect = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('error'),
    key: z.string().optional(),
    type: z.string().optional(),
    message_regex: z.string().optional(),
  }),
  z.strictObject({ kind: z.literal('code_regex'), pattern: z.string(), ignore_comments: z.boolean().optional() }),
  z.strictObject({
    kind: z.literal('output_regex'),
    pattern: z.string(),
    expect: z.enum(['present', 'absent']).optional(),
  }),
  z.strictObject({ kind: z.literal('validator_failed'), id: z.string() }),
  z.strictObject({ kind: z.literal('hidden_case_fails'), validator: z.string(), case: z.number().int() }),
  z.strictObject({
    kind: z.literal('state'),
    min_bonks: z.number().int().optional(),
    hero_at: z.tuple([z.number().int(), z.number().int()]).optional(),
  }),
  z.strictObject({
    kind: z.literal('detector'),
    name: z.enum(DETECTOR_NAMES),
    var: z.string().optional(),
    text: z.string().optional(),
    names: z.array(z.string()).optional(),
    function: z.string().optional(),
  }),
  z.strictObject({ kind: z.literal('custom'), python: z.string() }),
]);

export const MistakeSchema = z.strictObject({ id: Slug, detect: Detect, feedback: z.string() });

const WrongSolution = z
  .strictObject({
    code: z.string().optional(),
    order: z.array(z.number().int()).optional(),
    expect_mistake: z.string().optional(),
    expect_feedback_contains: z.string().optional(),
    note: z.string().optional(),
  })
  .refine((w) => (w.code === undefined) !== (w.order === undefined), 'Give either `code` or `order`')
  .refine(
    (w) => w.expect_mistake !== undefined || w.expect_feedback_contains !== undefined,
    'Say which feedback this wrong solution should get (`expect_mistake` or `expect_feedback_contains`)',
  );

const Verify = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('output') }),
  z.strictObject({ kind: z.literal('hero_at'), at: z.tuple([z.number().int(), z.number().int()]) }),
  z.strictObject({ kind: z.literal('none') }),
]);

/** A second, similar program to try after a wrong prediction (F-QST-05). Its answer is
 *  checked against what the program really prints. */
const Twin = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('mcq'),
    code: z.string(),
    question: z.string(),
    options: z.array(z.string()).min(3, 'Give at least 2 wrong options'),
    answer: z.number().int().min(0),
    explain: z.string(),
  }),
  z.strictObject({
    kind: z.literal('text'),
    code: z.string(),
    question: z.string(),
    answer: z.string(),
    explain: z.string(),
  }),
]);

const PredictPrompt = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('mcq'),
    question: z.string(),
    options: z.array(z.string()).min(3, 'Give at least 2 wrong options'),
    answer: z.number().int().min(0),
    explain: z.string(),
    verify: Verify.default({ kind: 'output' }),
    twin: Twin.optional(),
  }),
  z.strictObject({
    kind: z.literal('text'),
    question: z.string(),
    answer: z.string(),
    explain: z.string(),
    twin: Twin.optional(),
  }),
]);

/** How validate-content proves an investigate answer against the real program (F-QA-04). */
const InvestigateVerify = z.discriminatedUnion('kind', [
  // The answer is the number of lines the program prints.
  z.strictObject({ kind: z.literal('output_lines') }),
  // The change the question asks for: the changed program, and what really happens.
  z.strictObject({
    kind: z.literal('try'),
    code: z.string(),
    outcome: z.enum(['ok', 'error']),
    output: z.string().optional(),
  }),
]);

const InvestigateQuestion = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('mcq'),
    question: z.string(),
    options: z.array(z.string()).min(3, 'Give at least 2 wrong options'),
    answer: z.number().int().min(0),
    hint: z.string(),
    explain: z.string().optional(),
    verify: InvestigateVerify.optional(),
  }),
  z.strictObject({
    kind: z.literal('number'),
    question: z.string(),
    answer: z.number(),
    hint: z.string(),
    explain: z.string().optional(),
    verify: InvestigateVerify.optional(),
  }),
  z.strictObject({
    kind: z.literal('text'),
    question: z.string(),
    accept: z.array(z.string()).min(1),
    hint: z.string(),
    explain: z.string().optional(),
    verify: InvestigateVerify.optional(),
  }),
]);

const Parsons = z.strictObject({
  lines: z.array(z.string()).min(2),
  distractors: z.array(z.string()).default([]),
  fixed_top: z.array(z.string()).default([]),
  indent: z.boolean().default(true),
  check: z.enum(['run', 'order']).default('run'),
  alternatives: z.array(z.array(z.number().int())).default([]),
});

const Hints = z.array(z.string()).length(3, 'Every quest has exactly 3 hints: nudge, explanation, near-complete example');

const QUEST_TYPES = ['predict', 'investigate', 'fix', 'fill', 'parsons', 'modify', 'make'] as const;
export const QuestTypeSchema = z.enum([...QUEST_TYPES, 'boss']);

/** The playable part of a quest; a boss phase is exactly this. */
const QuestBody = {
  type: z.enum(QUEST_TYPES),
  learning_outcome: Outcome,
  csta: z.array(Csta).min(1),
  estimated_minutes: z.number().int().min(5, 'A quest takes 5–15 minutes').max(15, 'A quest takes 5–15 minutes'),
  story_intro: z.string(),
  goal: z.string(),
  stage: StageSchema.default({ kind: 'none' }),
  starter_code: z.string().default(''),
  // fill: only the lines with a ____ gap can be edited.
  locked: z.boolean().default(false),
  solution: z.string().optional(),
  validators: z.array(ValidatorSchema).default([]),
  common_mistakes: z.array(MistakeSchema).default([]),
  wrong_solutions: z.array(WrongSolution).default([]),
  hints: Hints,
  inputs: z.array(z.coerce.string()).default([]),
  // Ask the player when the input queue runs out (Mode B, §6.5).
  interactive_input: z.boolean().default(false),
  // Record line coverage for branch_coverage (on by default when that validator is used).
  track_coverage: z.boolean().default(false),
  seed: z.number().int().optional(),
  prompts: z.array(PredictPrompt).optional(),
  questions: z.array(InvestigateQuestion).optional(),
  parsons: Parsons.optional(),
  jar_shelf: z.boolean().optional(),
  bonus: z
    .array(z.strictObject({ id: Slug, description: z.string(), check: ValidatorSchema, xp: z.number().int() }))
    .default([]),
};

const Rewards = z.strictObject({
  xp: z.number().int().optional(),
  item: z.string().nullable().optional(),
  badge: z.string().nullable().optional(),
});

const QuestMeta = {
  id: QuestId,
  region: Slug,
  title: z.string().max(60),
  prerequisites: z.array(QuestId).default([]),
  side_quest: z.boolean().default(false),
  npc: z.string().optional(),
  vocabulary: z.array(z.string()).default([]),
  retrieval: z.array(z.string().regex(/^r\d+$/)).default([]),
  concept_card: z.string().optional(),
  story_outro: z.string(),
  rewards: Rewards.default({}),
};

export const PhaseSchema = z.strictObject({
  id: Slug,
  title: z.string(),
  ...QuestBody,
  starter_code: z.string().default(''),
  carry_code: z.boolean().default(false),
  story_outro: z.string().optional(),
  estimated_minutes: z
    .number()
    .int()
    .min(5, 'A boss phase takes 5–10 minutes')
    .max(10, 'A boss phase takes 5–10 minutes'),
});

export const NormalQuestSchema = z.strictObject({ ...QuestMeta, ...QuestBody });

export const BossQuestSchema = z.strictObject({
    ...QuestMeta,
    type: z.literal('boss'),
    learning_outcome: Outcome,
    csta: z.array(Csta).min(1),
    estimated_minutes: z.number().int().min(5).max(45),
    story_intro: z.string(),
    goal: z.string(),
    boss: z.strictObject({ name: z.string(), bug: z.string(), sprite: z.string() }),
    phases: z.array(PhaseSchema).min(2).max(4),
});

/** For JSON Schema / editor autocomplete. Code uses parseQuest (clearer errors). */
export const QuestSchema = z.union([NormalQuestSchema, BossQuestSchema]);

/** Validate a quest file, choosing the boss or normal schema by its `type`. */
export function parseQuest(raw: unknown) {
  const isBoss = typeof raw === 'object' && raw !== null && (raw as { type?: unknown }).type === 'boss';
  return isBoss ? BossQuestSchema.safeParse(raw) : NormalQuestSchema.safeParse(raw);
}

const DialogueLine = z.strictObject({ speaker: z.string(), text: z.string() });

const OverworldObject = z.strictObject({
  kind: z.enum(['npc', 'board', 'poi', 'spawn', 'sign', 'exit']),
  id: z.string().optional(),
  at: z.tuple([z.number().int(), z.number().int()]),
  quest: QuestId.optional(),
  text: z.string().optional(),
});

const CheckItem = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('mcq'),
    question: z.string(),
    code: z.string().optional(),
    options: z.array(z.string()).min(3),
    answer: z.number().int().min(0),
    explain: z.string(),
  }),
  z.strictObject({
    kind: z.literal('predict'),
    question: z.string().default('What will this print?'),
    code: z.string(),
    answer: z.string(),
    explain: z.string(),
  }),
]);

export const RegionSchema = z.strictObject({
  id: Slug,
  number: z.number().int().min(1),
  name: z.string(),
  concepts: z.array(z.string()),
  intro: z.array(DialogueLine).default([]),
  overworld: z.strictObject({
    grid: z.string(),
    legend: z.record(z.string().length(1), z.strictObject({ tile: z.string(), over: z.string().optional(), solid: z.boolean().optional() })).optional(),
    objects: z.array(OverworldObject),
  }),
  npcs: z.record(z.string(), z.strictObject({ name: z.string(), sprite: z.string(), greeting: z.string().optional() })),
  concept_scene: z.strictObject({
    title: z.string(),
    analogy: z.string(),
    lines: z.array(DialogueLine).min(1),
    worked_example: z.strictObject({
      code: z.string(),
      stage: StageSchema.default({ kind: 'none' }),
      explain: z.array(z.strictObject({ line: z.number().int(), text: z.string() })).default([]),
    }),
  }),
  quests: z.array(QuestId).min(1),
  boss: QuestId,
  side_quests: z.array(QuestId).default([]),
  knowledge_check: z.strictObject({ items: z.array(CheckItem).min(3).max(5) }),
  fragment: z.strictObject({ id: Slug, name: z.string(), description: z.string() }),
  pois: z.array(z.string()).default([]),
});

export const CourseSchema = z.strictObject({
  id: Slug,
  title: z.string(),
  opening: z.array(DialogueLine).min(1),
  regions: z
    .array(z.strictObject({ id: Slug, enabled: z.boolean().default(true), lessons: z.number().int().min(1).default(2) }))
    .min(1),
  side_quests: z.boolean().default(true),
});

export const GlossarySchema = z.array(
  z.strictObject({
    term: z.string(),
    definition: z.string(),
    /** Rich text: code in `backticks`, or a ``` block for several lines. */
    example: z.string(),
    related: z.array(z.string()).default([]),
  }),
);

export const ItemsSchema = z.array(
  z.strictObject({
    id: Slug,
    name: z.string(),
    icon: z.string(),
    region: Slug,
    description: z.string(),
    example: z.string().optional(),
  }),
);

export const ErrorsSchema = z.record(
  z.string(),
  z.strictObject({ title: z.string(), message: z.string(), tip: z.string().optional() }),
);

export type NormalQuestFile = z.infer<typeof NormalQuestSchema>;
export type BossQuestFile = z.infer<typeof BossQuestSchema>;
export type QuestFile = NormalQuestFile | BossQuestFile;
export type PhaseFile = z.infer<typeof PhaseSchema>;
export type RegionFile = z.infer<typeof RegionSchema>;
export type CourseFile = z.infer<typeof CourseSchema>;
export type GlossaryFile = z.infer<typeof GlossarySchema>;
export type ItemsFile = z.infer<typeof ItemsSchema>;
export type ErrorsFile = z.infer<typeof ErrorsSchema>;
export type Validator = z.infer<typeof ValidatorSchema>;
export type Stage = z.infer<typeof StageSchema>;
