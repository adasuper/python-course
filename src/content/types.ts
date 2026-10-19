// Compiled content, as the game reads it (produced by scripts/build-content.ts).
import type { BonusSpec, MistakeSpec, StageSpec, ValidatorSpec } from '../runtime/protocol';
import type { Rich } from './richtext';

export type QuestType = 'predict' | 'investigate' | 'fix' | 'fill' | 'parsons' | 'modify' | 'make' | 'boss';

export interface DialogueLine {
  speaker: string;
  text: Rich;
}

export type PredictPrompt =
  | { kind: 'mcq'; question: Rich; options: string[]; answer: number; explain: Rich }
  | { kind: 'text'; question: Rich; answer: string; explain: Rich };

export type InvestigateQuestion =
  | { kind: 'mcq'; question: Rich; options: string[]; answer: number; hint: Rich; explain: Rich | null }
  | { kind: 'number'; question: Rich; answer: number; hint: Rich; explain: Rich | null }
  | { kind: 'text'; question: Rich; accept: string[]; hint: Rich; explain: Rich | null };

export interface ParsonsSpec {
  lines: string[];
  distractors: string[];
  fixedTop: string[];
  indent: boolean;
  check: 'run' | 'order';
  alternatives: number[][];
}

/** The playable part of a quest or a boss phase. */
export interface QuestBody {
  type: Exclude<QuestType, 'boss'>;
  learningOutcome: string;
  csta: string[];
  estimatedMinutes: number;
  storyIntro: Rich;
  goal: Rich;
  stage: StageSpec;
  starterCode: string;
  validators: ValidatorSpec[];
  mistakes: MistakeSpec[];
  hints: Rich[];
  inputs: string[];
  seed: number;
  prompts: PredictPrompt[] | null;
  questions: InvestigateQuestion[] | null;
  parsons: ParsonsSpec | null;
  jarShelf: boolean;
  bonus: BonusSpec[];
  // Reference solutions never ship in the game (owner decision Q13); instructors read
  // them in docs/solutions.md.
}

export interface Phase extends QuestBody {
  id: string;
  title: string;
  carryCode: boolean;
  storyOutro: Rich | null;
}

interface QuestMeta {
  id: string;
  region: string;
  title: string;
  prerequisites: string[];
  sideQuest: boolean;
  npc: string | null;
  vocabulary: string[];
  retrieval: string[];
  conceptCard: Rich | null;
  storyOutro: Rich;
  rewards: { xp: number; item: string | null; badge: string | null };
}

export interface NormalQuest extends QuestMeta, QuestBody {}

export interface BossQuest extends QuestMeta {
  type: 'boss';
  learningOutcome: string;
  csta: string[];
  estimatedMinutes: number;
  storyIntro: Rich;
  goal: Rich;
  boss: { name: string; bug: string; sprite: string };
  phases: Phase[];
}

export type Quest = NormalQuest | BossQuest;

export type CheckItem =
  | { kind: 'mcq'; question: Rich; code: string | null; options: string[]; answer: number; explain: Rich }
  | { kind: 'predict'; question: Rich; code: string; answer: string; explain: Rich };

export interface OverworldObject {
  kind: 'npc' | 'board' | 'poi' | 'spawn' | 'sign' | 'exit';
  id: string | null;
  at: [number, number];
  quest: string | null;
  text: string | null;
}

export interface Region {
  id: string;
  number: number;
  name: string;
  concepts: string[];
  intro: DialogueLine[];
  overworld: {
    grid: string;
    legend: Record<string, { tile: string; over?: string; solid?: boolean }>;
    objects: OverworldObject[];
  };
  npcs: Record<string, { name: string; sprite: string; greeting: string | null }>;
  conceptScene: {
    title: string;
    analogy: Rich;
    lines: DialogueLine[];
    workedExample: { code: string; stage: StageSpec; explain: { line: number; text: Rich }[] };
  };
  quests: string[];
  boss: string;
  sideQuests: string[];
  knowledgeCheck: { items: CheckItem[] };
  fragment: { id: string; name: string; description: Rich };
  pois: string[];
  questData: Record<string, Quest>;
}

export interface QuestInfo {
  region: string;
  type: QuestType;
  title: string;
  item: string | null;
  xp: number;
  phases: string[];
  sideQuest: boolean;
  prerequisites: string[];
}

export interface GlossaryEntry {
  term: string;
  definition: Rich;
  example: string | null;
  related: string[];
}

export interface Item {
  id: string;
  name: string;
  icon: string;
  region: string;
  description: Rich;
  example: string | null;
}

export interface ErrorTemplate {
  title: string;
  message: Rich;
  tip: Rich | null;
}

export interface Course {
  id: string;
  title: string;
  contentVersion: string;
  opening: DialogueLine[];
  regions: { id: string; number: number; name: string; enabled: boolean; lessons: number }[];
  /** Every quest id in a stable order; save codes depend on it. */
  questOrder: string[];
  /** Small facts about every quest, so progress can be read without loading regions. */
  questInfo: Record<string, QuestInfo>;
  sideQuests: boolean;
  glossary: Record<string, GlossaryEntry>;
  items: Record<string, Item>;
  errors: Record<string, ErrorTemplate>;
}

export const DEFAULT_XP: Record<QuestType, number> = {
  predict: 20,
  investigate: 25,
  fill: 30,
  parsons: 30,
  fix: 35,
  modify: 40,
  make: 50,
  boss: 0,
};
export const BOSS_PHASE_XP = 40;
export const BOSS_DEFEAT_XP = 50;
export const SIDE_QUEST_XP = 40;
export const CHECK_XP = 20;
