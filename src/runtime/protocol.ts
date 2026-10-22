// Types shared by the main thread, the Python worker and Node tools.
// They mirror the JSON produced by src/python/codeweald/_host.py (docs/specs.md §6.1).

export type Dir = 'up' | 'down' | 'left' | 'right';
export type XY = [number, number];

export type Action = { ln: number | null } & (
  | { t: 'move'; dir: Dir; from: XY; to: XY }
  | { t: 'bonk'; dir: Dir; at: XY; into: string }
  | { t: 'face'; dir: Dir }
  | { t: 'say'; text: string }
  | { t: 'out'; stream: 'stdout' | 'stderr'; text: string }
  | { t: 'pickup'; at: XY; item: string | null }
  | { t: 'chest'; at: XY; ok: boolean; code: string; loot: string[]; missing?: boolean }
  | { t: 'look'; at: XY; saw: string }
  | { t: 'wait'; seconds: number }
  | {
      t: 'input';
      prompt: string;
      value: string;
      source: 'queue' | 'player';
      /** Who handed the answer over: the first named character on stage (F-EXE-12). */
      by?: string;
    }
);

export interface LegendEntry {
  tile?: string;
  solid?: boolean;
  object?: string;
  item?: string;
  hero?: boolean;
  name?: string;
  look?: string;
}

export interface StageSpec {
  kind: 'grid' | 'npc' | 'none';
  grid?: string;
  legend?: Record<string, LegendEntry>;
  facing?: Dir;
  chests?: Record<string, { code: string; loot?: string[] }>;
  npcs?: Record<string, { name?: string; sprite?: string }>;
  /** For kind: npc — who stands on stage with the hero. */
  cast?: { sprite: string; name: string }[];
  /** kind none: show the output as a woven "tapestry" grid (Region 6 patterns). */
  view?: 'scroll' | 'tapestry';
}

export interface Limits {
  loopBudget: number;
  maxActions: number;
  maxOutputChars: number;
  recursionLimit: number;
}

export interface ValidatorSpec {
  type: string;
  id?: string;
  fail_hint?: string;
  [key: string]: unknown;
}

export interface MistakeSpec {
  id: string;
  detect: { kind: string; [key: string]: unknown };
  feedback: string;
}

export interface BonusSpec {
  id: string;
  description: string;
  check: ValidatorSpec;
  xp: number;
}

export interface RunRequest {
  mode: 'quest' | 'workshop' | 'example';
  code: string;
  stage: StageSpec | null;
  inputs: string[];
  interactiveInput: boolean;
  seed: number;
  validators: ValidatorSpec[];
  mistakes: MistakeSpec[];
  bonus: BonusSpec[];
  limits?: Partial<Limits>;
  coverage?: boolean;
  /** Earlier runs in this quest session, for session validators (§9.3). */
  session?: SessionRun[];
}

/** What a quest session remembers about one run (session validators, §9.3). */
export interface SessionRun {
  /** Same value = same program (comments and spacing don't count). */
  program: string;
  ok: boolean;
  inputs: string[];
  /** The program's if/elif/else doors, e.g. "1.1if,1.2else". */
  shape: string;
  /** The line each door is written on, in the same order. */
  lines: number[];
  /** The doors that ran. */
  lit: string[];
}

/** A branch_coverage lamp: one if/elif/else door and whether it has run yet. */
export interface Lamp {
  id: string;
  kind: 'if' | 'elif' | 'else';
  line: number;
  lit: boolean;
}

export interface PyErrorInfo {
  type: string;
  key: string;
  params: Record<string, string>;
  line: number | null;
  col: number | null;
  endCol: number | null;
  raw: string;
}

export interface WorldSnapshot {
  hasMap: boolean;
  hero: XY;
  facing: Dir;
  heroOn: string | null;
  inventory: string[];
  said: string[];
  bonks: number;
  picked: string[];
  chestsOpened: string[];
  visited: XY[];
}

export interface VarSnapshot {
  name: string;
  type: string;
  repr: string;
}

export interface ValidatorResult {
  id: string;
  type: string;
  passed: boolean;
  hint: string;
  detail: Record<string, unknown>;
}

export type FeedbackSource = 'success' | 'mistake' | 'validator' | 'error' | 'generic';

export interface ValidationReport {
  passed: boolean;
  results: ValidatorResult[];
  feedback: { source: FeedbackSource; id?: string; text?: string };
  bonus: string[];
  /** This run's summary, when the quest has session validators. */
  session?: SessionRun;
}

export type RunStatus =
  'ok' | 'error' | 'needs-input' | 'loop-budget' | 'action-budget' | 'output-budget' | 'timeout' | 'crashed';

export interface RunResult {
  status: RunStatus;
  actions: Action[];
  error: PyErrorInfo | null;
  needsInput: { prompt: string } | null;
  world: WorldSnapshot | null;
  vars: VarSnapshot[];
  output: string;
  coverage: number[] | null;
  stats: { loopIterations: number; durationMs?: number };
  validation?: ValidationReport;
}

export type ToWorker =
  | {
      kind: 'init';
      indexURL: string;
      /** A service worker controls the page, so Python's files are kept in its cache (§16). */
      cached?: boolean;
    }
  | { kind: 'run'; runId: number; request: RunRequest };

export type FromWorker =
  | { kind: 'progress'; stage: 'download' | 'compile' | 'stdlib' | 'ready'; loaded?: number; total?: number }
  | { kind: 'ready'; pyodideVersion: string; pythonVersion: string }
  | { kind: 'failed'; message: string }
  | { kind: 'result'; runId: number; result: RunResult }
  | { kind: 'crashed'; runId: number; message: string };
