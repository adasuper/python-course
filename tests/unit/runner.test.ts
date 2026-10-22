import { describe, expect, it } from 'vitest';
import { PyRunner } from '../../src/runtime/pyRunner';
import type { FromWorker, ToWorker } from '../../src/runtime/protocol';
import { BLOCKED_GETTERS, BLOCKED_GLOBALS, neuterNetwork } from '../../src/worker/neuter';

describe('network neutering (F-EXE-08)', () => {
  it('replaces every network and storage API with one that throws', () => {
    const scope: Record<string, unknown> = { fetch: () => 'real', indexedDB: {}, caches: {} };
    neuterNetwork(scope);
    for (const name of BLOCKED_GLOBALS) expect(() => (scope[name] as () => void)()).toThrow(/not available/);
    for (const name of BLOCKED_GETTERS) expect(() => scope[name]).toThrow(/not available/);
  });
});

/** A stand-in for the Python worker that the test drives by hand. */
class FakeWorker {
  static made: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<FromWorker>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  sent: ToWorker[] = [];
  terminated = false;
  constructor() {
    FakeWorker.made.push(this);
  }
  postMessage(message: ToWorker) {
    this.sent.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  reply(message: FromWorker) {
    this.onmessage?.({ data: message } as MessageEvent<FromWorker>);
  }
  boot() {
    this.reply({ kind: 'ready', pyodideVersion: 'x', pythonVersion: '3.14' });
  }
  lastRunId() {
    const run = this.sent.findLast((m) => m.kind === 'run');
    return run?.kind === 'run' ? run.runId : -1;
  }
}

function makeRunner() {
  FakeWorker.made = [];
  const runner = new PyRunner({
    indexURL: '/pyodide/',
    timeoutMs: 60_000,
    createWorker: () => new FakeWorker() as unknown as Worker,
  });
  FakeWorker.made[0]!.boot();
  return runner;
}

const request = {
  mode: 'quest',
  code: 'pass',
  stage: null,
  inputs: [],
  interactiveInput: false,
  seed: 0,
} as never;

describe('a crashed worker is handled like a timeout (F-EXE-05)', () => {
  it('answers the run and starts a fresh worker when Pyodide fails mid-run', async () => {
    const runner = makeRunner();
    const pending = runner.run(request);
    await Promise.resolve();
    const first = FakeWorker.made[0]!;
    first.reply({
      kind: 'crashed',
      runId: first.lastRunId(),
      message: 'RangeError: Maximum call stack size exceeded',
    });
    const result = await pending;
    expect(result.status).toBe('crashed');
    expect(result.error?.key).toBe('limits.crashed');
    expect(first.terminated).toBe(true);
    expect(FakeWorker.made).toHaveLength(2);
    expect(runner.status.value).toBe('restarting');
    FakeWorker.made[1]!.boot();
    await runner.whenReady();
    expect(runner.status.value).toBe('ready');
  });

  it('recovers from a worker error event after boot', async () => {
    const runner = makeRunner();
    const pending = runner.run(request);
    await Promise.resolve();
    FakeWorker.made[0]!.onerror?.({ message: 'boom', preventDefault() {} } as ErrorEvent);
    expect((await pending).status).toBe('crashed');
    expect(FakeWorker.made).toHaveLength(2);
    expect(runner.status.value).not.toBe('failed');
  });

  it('still reports a worker that cannot boot at all', async () => {
    FakeWorker.made = [];
    const runner = new PyRunner({
      indexURL: '/pyodide/',
      timeoutMs: 60_000,
      createWorker: () => new FakeWorker() as unknown as Worker,
    });
    FakeWorker.made[0]!.onerror?.({ message: 'no wasm', preventDefault() {} } as ErrorEvent);
    await expect(runner.whenReady()).rejects.toThrow('no wasm');
    expect(runner.status.value).toBe('failed');
  });
});
