/// <reference lib="webworker" />
// Hosts Pyodide in a Web Worker, so student code can never freeze the page.
// The main thread can always terminate() this worker (the hard timeout, specs §6.3).
import { loadPyodide, type PyodideInterface } from 'pyodide';
import { installPackage } from '../runtime/pythonPackage';
import type { FromWorker, RunResult, ToWorker } from '../runtime/protocol';
import { neuterNetwork } from './neuter';

declare const self: DedicatedWorkerGlobalScope;

const pythonFiles = import.meta.glob('../python/codeweald/*.py', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// The run function itself, kept from boot: replacing codeweald._host.run later changes nothing.
let run: ((json: string) => string) | null = null;

const post = (message: FromWorker) => self.postMessage(message);

/** Download the big files ourselves first, so the loading screen can show real progress. */
async function prefetch(indexURL: string): Promise<void> {
  const files = ['pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide.asm.mjs'];
  const sizes = await Promise.all(
    files.map(async (f) => {
      const res = await fetch(indexURL + f, { method: 'HEAD' }).catch(() => null);
      return Number(res?.headers.get('content-length') ?? 0);
    }),
  );
  const total = sizes.reduce((a, b) => a + b, 0) || undefined;
  let loaded = 0;
  for (const file of files) {
    const res = await fetch(indexURL + file);
    if (!res.ok || !res.body) throw new Error(`Could not download ${file} (${res.status})`);
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      loaded += value.byteLength;
      post({ kind: 'progress', stage: 'download', loaded, total });
    }
  }
}

async function init(indexURL: string): Promise<void> {
  await prefetch(indexURL);
  post({ kind: 'progress', stage: 'compile' });
  const pyodide: PyodideInterface = await loadPyodide({ indexURL, stdout: () => {}, stderr: () => {} });
  post({ kind: 'progress', stage: 'stdlib' });
  const files: Record<string, string> = {};
  for (const [path, source] of Object.entries(pythonFiles)) {
    files[path.split('/').pop()!] = source;
  }
  installPackage(pyodide, files);
  const host = pyodide.pyimport('codeweald._host') as { run(json: string): string; lockdown(): void };
  run = host.run.bind(host);
  // Warm up: the first run compiles our modules.
  run(JSON.stringify({ mode: 'example', code: 'pass', stage: null, inputs: [] }));
  host.lockdown();
  neuterNetwork(self);
  const pythonVersion = pyodide.runPython('import sys; sys.version.split()[0]') as string;
  post({ kind: 'progress', stage: 'ready' });
  post({ kind: 'ready', pyodideVersion: pyodide.version, pythonVersion });
}

self.onmessage = async (event: MessageEvent<ToWorker>) => {
  const message = event.data;
  if (message.kind === 'init') {
    try {
      await init(message.indexURL);
    } catch (error) {
      post({ kind: 'failed', message: String(error) });
    }
    return;
  }
  if (message.kind === 'run') {
    if (!run) {
      post({ kind: 'failed', message: 'Python is not ready yet' });
      return;
    }
    const started = performance.now();
    try {
      const result = JSON.parse(run(JSON.stringify(message.request))) as RunResult;
      result.stats.durationMs = Math.round(performance.now() - started);
      post({ kind: 'result', runId: message.runId, result });
    } catch (error) {
      // Pyodide itself failed (e.g. a WebAssembly stack overflow). The main thread
      // replaces this worker, just like after a timeout (specs §6.3).
      post({ kind: 'crashed', runId: message.runId, message: String(error) });
    }
  }
};
