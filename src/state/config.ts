// Deploy-time settings from public/codeweald.config.json (docs/specs.md §20).
export interface AppConfig {
  courseId: string;
  execution: {
    timeoutSeconds: number;
    loopBudget: number;
    workshopLoopBudget: number;
    maxActions: number;
    maxOutputChars: number;
  };
  /** New profiles start with these (students can change them later in Settings). */
  defaults: {
    /** all: three hints; nudge: only the first; off: no hints (e.g. for a review session). */
    hints: 'all' | 'nudge' | 'off';
    textScale: 1 | 1.25 | 1.5 | 2;
    reducedMotion: 'system' | 'on' | 'off';
    replaySpeed: 0.5 | 1 | 2 | 4 | 'instant';
    /** Read in Phase 2 (text-to-speech and sound). */
    tts: boolean;
    soundEffects: boolean;
  };
  features: {
    workshop: boolean;
    sideQuests: boolean;
    knowledgeCheckGates: boolean;
    standbyWorker: 'off' | 'auto' | 'on';
  };
}

export const DEFAULT_CONFIG: AppConfig = {
  courseId: 'codeweald-intro-python',
  execution: {
    timeoutSeconds: 3,
    loopBudget: 100_000,
    workshopLoopBudget: 1_000_000,
    maxActions: 2000,
    maxOutputChars: 100_000,
  },
  defaults: {
    hints: 'all',
    textScale: 1,
    reducedMotion: 'system',
    replaySpeed: 1,
    tts: false,
    soundEffects: false,
  },
  features: { workshop: true, sideQuests: true, knowledgeCheckGates: false, standbyWorker: 'off' },
};

export async function loadConfig(): Promise<AppConfig> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}codeweald.config.json`, { cache: 'no-cache' });
    if (!res.ok) return DEFAULT_CONFIG;
    const raw = (await res.json()) as Partial<AppConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...raw,
      execution: { ...DEFAULT_CONFIG.execution, ...raw.execution },
      defaults: { ...DEFAULT_CONFIG.defaults, ...raw.defaults },
      features: { ...DEFAULT_CONFIG.features, ...raw.features },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}
