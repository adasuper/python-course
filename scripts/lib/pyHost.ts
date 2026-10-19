// Runs the codeweald Python package in Node via Pyodide: used by content tools and tests.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadPyodide, type PyodideInterface } from 'pyodide';
import { installPackage } from '../../src/runtime/pythonPackage';
import type { RunRequest, RunResult, ValidatorSpec } from '../../src/runtime/protocol';

export const PYTHON_DIR = join(import.meta.dirname, '..', '..', 'src', 'python', 'codeweald');

export function readPythonSources(): Record<string, string> {
  const files: Record<string, string> = {};
  for (const name of readdirSync(PYTHON_DIR)) {
    if (name.endsWith('.py')) files[name] = readFileSync(join(PYTHON_DIR, name), 'utf8');
  }
  return files;
}

export interface BakeResult {
  ok: boolean;
  validators?: ValidatorSpec[];
  error?: RunResult['error'];
  status?: string;
}

export interface PyHost {
  pyodide: PyodideInterface;
  run(request: Partial<RunRequest> & { code: string }): RunResult;
  bake(request: Partial<RunRequest> & { code: string }): BakeResult;
}

export const DEFAULT_REQUEST: Omit<RunRequest, 'code'> = {
  mode: 'quest',
  stage: null,
  inputs: [],
  interactiveInput: false,
  seed: 0,
  validators: [],
  mistakes: [],
  bonus: [],
};

let shared: Promise<PyHost> | null = null;

/** One Pyodide per process (they are heavy); every caller shares it. */
export function getPyHost(): Promise<PyHost> {
  shared ??= createPyHost();
  return shared;
}

async function createPyHost(): Promise<PyHost> {
  const pyodide = await loadPyodide();
  installPackage(pyodide, readPythonSources());
  const host = pyodide.pyimport('codeweald._host') as {
    run(json: string): string;
    bake(json: string): string;
  };
  return {
    pyodide,
    run: (request) => JSON.parse(host.run(JSON.stringify({ ...DEFAULT_REQUEST, ...request }))) as RunResult,
    bake: (request) =>
      JSON.parse(host.bake(JSON.stringify({ ...DEFAULT_REQUEST, ...request }))) as BakeResult,
  };
}
