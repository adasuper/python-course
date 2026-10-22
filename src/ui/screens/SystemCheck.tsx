// System check (F-OFF-08): for school IT, or anyone wondering why the game won't run here.
import { useEffect, useRef, useState } from 'preact/hooks';
import { t } from '../../i18n/en';
import { getRunner, go, profile, storageMode } from '../../state/store';
import { checkOfflineReady, offlineReady, pyodideURL } from '../pwa';
import { offlineVoices } from '../speech';
import { systemChecks, type CheckResult, type SystemEnv } from '../systemCheck';

const ICON = { pass: '✅', fail: '❌', warn: '⚠️' } as const;

async function gather(): Promise<SystemEnv> {
  const sw = navigator.serviceWorker as ServiceWorkerContainer | undefined;
  const serviceWorker = !sw
    ? 'unsupported'
    : sw.controller
      ? 'controlled'
      : (await sw.getRegistration().catch(() => undefined))
        ? 'registered'
        : 'none';
  // The smallest valid WebAssembly module: the magic number and version 1.
  const wasm =
    typeof WebAssembly === 'object' && WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
  let wasmType: string | null;
  try {
    const url = pyodideURL('pyodide.asm.wasm');
    const cached = typeof caches === 'undefined' ? undefined : await caches.match(url);
    const res = cached ?? (await fetch(url, { method: 'HEAD', cache: 'no-store' }));
    wasmType = res.ok ? (res.headers.get('content-type') ?? '') : null;
  } catch {
    wasmType = null;
  }
  const quota = await navigator.storage
    ?.estimate()
    .then((e) => ({ usage: e.usage ?? 0, quota: e.quota ?? 0 }))
    .catch(() => null);
  const status = getRunner().status.value;
  return {
    serviceWorker,
    storage: storageMode.value,
    wasm,
    wasmType,
    quota: quota ?? null,
    voices: offlineVoices().length,
    python: status === 'failed' ? 'failed' : status === 'ready' || status === 'running' ? 'ready' : 'loading',
    offlineReady: offlineReady.value || (await checkOfflineReady()),
  };
}

export function SystemCheckScreen() {
  const heading = useRef<HTMLHeadingElement>(null);
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const run = () => {
    setResults(null);
    void gather().then((env) => setResults(systemChecks(env)));
  };
  useEffect(() => {
    heading.current?.focus();
    run();
  }, []);
  const back = () => go(profile.value ? { name: 'settings' } : { name: 'title' });
  const failed = results?.filter((r) => r.status === 'fail').length ?? 0;
  return (
    <main id="main" class="screen system-screen">
      <div class="quest-header">
        <button type="button" class="ghost" onClick={back}>
          ◀ {t.system.back}
        </button>
        <h1 ref={heading} tabIndex={-1}>
          🩺 {t.system.heading}
        </h1>
      </div>
      <p>{t.system.intro}</p>
      <div class="card">
        {!results ? (
          <p role="status">{t.system.checking}</p>
        ) : (
          <>
            <p role="status" class={`banner ${failed ? 'warn' : 'ok'}`}>
              {failed ? t.system.someFailed(failed) : t.system.allGood}
            </p>
            <table class="system-table">
              <caption class="sr-only">{t.system.heading}</caption>
              <thead>
                <tr>
                  <th scope="col">{t.system.check}</th>
                  <th scope="col">{t.system.result}</th>
                  <th scope="col">{t.system.fix}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} class={`check-${r.status}`}>
                    <th scope="row">{r.label}</th>
                    <td>
                      <span aria-hidden="true">{ICON[r.status]} </span>
                      <strong>{t.system.status[r.status]}:</strong> {r.detail}
                    </td>
                    <td>{r.tip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <button type="button" onClick={run} disabled={!results}>
          ↻ {t.system.again}
        </button>
      </div>
    </main>
  );
}
