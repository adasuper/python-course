// Main-thread client for the Python worker (docs/specs.md §6.1, §6.3).
// It owns the wall-clock timeout: if a run takes too long, the worker is terminated
// and a fresh one is started, so the page itself never freezes.
import { signal } from '@preact/signals';
import type { FromWorker, RunRequest, RunResult } from './protocol';

export type RunnerStatus = 'loading' | 'ready' | 'running' | 'restarting' | 'failed';

export interface LoadProgress {
  stage: 'download' | 'compile' | 'stdlib' | 'ready';
  loaded?: number;
  total?: number;
}

export interface RunnerOptions {
  indexURL: string;
  timeoutMs: number;
  createWorker?: () => Worker;
}

const defaultWorker = () =>
  new Worker(new URL('../worker/python.worker.ts', import.meta.url), { type: 'module', name: 'python' });

export class PyRunner {
  readonly status = signal<RunnerStatus>('loading');
  readonly progress = signal<LoadProgress>({ stage: 'download' });
  readonly error = signal<string | null>(null);
  pythonVersion = '';

  private worker!: Worker;
  private ready!: Promise<void>;
  private nextRunId = 1;
  private pending = new Map<number, (result: RunResult) => void>();
  private options: Required<RunnerOptions>;

  constructor(options: RunnerOptions) {
    this.options = { createWorker: defaultWorker, ...options };
    this.start();
  }

  setTimeoutMs(ms: number) {
    this.options.timeoutMs = ms;
  }

  /** Resolves when Python is ready to run code. */
  whenReady(): Promise<void> {
    return this.ready;
  }

  private start() {
    const worker = this.options.createWorker();
    this.worker = worker;
    this.ready = new Promise<void>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<FromWorker>) => {
        const msg = event.data;
        switch (msg.kind) {
          case 'progress':
            this.progress.value = msg;
            break;
          case 'ready':
            this.pythonVersion = msg.pythonVersion;
            this.status.value = 'ready';
            resolve();
            break;
          case 'failed':
            this.status.value = 'failed';
            this.error.value = msg.message;
            reject(new Error(msg.message));
            break;
          case 'result': {
            const done = this.pending.get(msg.runId);
            this.pending.delete(msg.runId);
            done?.(msg.result);
            break;
          }
        }
      };
      worker.onerror = (event) => {
        this.status.value = 'failed';
        this.error.value = event.message || 'The Python worker crashed';
        reject(new Error(this.error.value));
      };
    });
    this.ready.catch(() => {});
    worker.postMessage({ kind: 'init', indexURL: this.options.indexURL });
  }

  /** Throw the current worker away and boot a new one (after a timeout or crash). */
  restart(): Promise<void> {
    this.worker.terminate();
    for (const [, done] of this.pending) done(emptyResult('crashed'));
    this.pending.clear();
    this.status.value = 'restarting';
    this.start();
    return this.ready;
  }

  async run(request: RunRequest): Promise<RunResult> {
    await this.ready;
    const runId = this.nextRunId++;
    this.status.value = 'running';
    return new Promise<RunResult>((resolve) => {
      const timer = setTimeout(() => {
        if (!this.pending.has(runId)) return;
        this.pending.delete(runId);
        resolve(timeoutResult(this.options.timeoutMs));
        void this.restart();
      }, this.options.timeoutMs);
      this.pending.set(runId, (result) => {
        clearTimeout(timer);
        if (this.status.value === 'running') this.status.value = 'ready';
        resolve(result);
      });
      this.worker.postMessage({ kind: 'run', runId, request });
    });
  }
}

function emptyResult(status: RunResult['status']): RunResult {
  return {
    status,
    actions: [],
    error: null,
    needsInput: null,
    world: null,
    vars: [],
    output: '',
    coverage: null,
    stats: { loopIterations: 0 },
  };
}

function timeoutResult(timeoutMs: number): RunResult {
  return {
    ...emptyResult('timeout'),
    error: {
      type: 'Timeout',
      key: 'limits.timeout',
      params: { seconds: String(Math.round(timeoutMs / 1000)), line: '' },
      line: null,
      col: null,
      endCol: null,
      raw: '',
    },
  };
}
