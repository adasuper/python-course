// The System check page's rules (F-OFF-08): every row says pass or fail in words, with a tip.
import { describe, expect, it } from 'vitest';
import { systemChecks, type SystemEnv } from '../../src/ui/systemCheck';

const GOOD: SystemEnv = {
  serviceWorker: 'controlled',
  storage: 'indexeddb',
  wasm: true,
  wasmType: 'application/wasm',
  quota: { usage: 20 * 2 ** 20, quota: 2 ** 30 },
  voices: 2,
  python: 'ready',
  offlineReady: true,
};

const byId = (env: SystemEnv) => Object.fromEntries(systemChecks(env).map((r) => [r.id, r]));

describe('system check', () => {
  it('passes everything on a good device', () => {
    const results = systemChecks(GOOD);
    expect(results.map((r) => r.id)).toEqual([
      'sw',
      'storage',
      'wasm',
      'wasm-type',
      'quota',
      'python',
      'offline',
      'voices',
    ]);
    expect(results.every((r) => r.status === 'pass')).toBe(true);
    expect(byId(GOOD).quota!.detail).toBe('20 MB used of 1024 MB.');
  });

  it('gives a fix tip for every failure', () => {
    const bad: SystemEnv = {
      serviceWorker: 'none',
      storage: 'memory',
      wasm: false,
      wasmType: 'application/octet-stream',
      quota: { usage: 0, quota: 10 * 2 ** 20 },
      voices: 0,
      python: 'failed',
      offlineReady: false,
    };
    const results = systemChecks(bad);
    expect(results.filter((r) => r.status === 'pass')).toEqual([]);
    for (const r of results) expect(r.tip, r.id).toBeTruthy();
    expect(byId(bad)['wasm-type']!.detail).toContain('application/octet-stream');
  });

  it('tells apart the softer problems', () => {
    const r = byId({
      ...GOOD,
      serviceWorker: 'registered',
      storage: 'localstorage',
      wasmType: null,
      quota: null,
      voices: 0,
      python: 'loading',
      offlineReady: false,
    });
    expect(r.sw!.tip).toBe('Reload the page once.');
    expect(r.storage!.status).toBe('warn');
    expect(r['wasm-type']!.detail).toContain('could not be downloaded');
    expect(r.quota!.status).toBe('warn');
    expect(r.python!.status).toBe('warn');
    expect(r.voices!.status).toBe('warn');
    expect(r.voices!.detail).toContain('optional');
  });
});
