// The System check page (F-OFF-08, docs/specs.md §21): can this device and network run the
// game? Each check says pass or fail in words, with a tip for fixing it.

export type CheckStatus = 'pass' | 'fail' | 'warn';

export interface CheckResult {
  id: string;
  status: CheckStatus;
  label: string;
  detail: string;
  tip?: string;
}

/** What the checks look at, passed in so they can be tested without a browser. */
export interface SystemEnv {
  serviceWorker: 'controlled' | 'registered' | 'none' | 'unsupported';
  storage: 'indexeddb' | 'localstorage' | 'memory';
  wasm: boolean;
  /** Content-Type of pyodide.asm.wasm, or null when it couldn't be fetched. */
  wasmType: string | null;
  quota: { usage: number; quota: number } | null;
  voices: number;
  python: 'ready' | 'loading' | 'failed';
  offlineReady: boolean;
}

const MB = 1024 * 1024;
/** Python plus the game need about 20 MB; ask for some room to spare. */
const ROOM_NEEDED = 60 * MB;

const mb = (n: number) => `${Math.round(n / MB)} MB`;

export function systemChecks(env: SystemEnv): CheckResult[] {
  const results: CheckResult[] = [];
  results.push(
    env.serviceWorker === 'controlled'
      ? { id: 'sw', status: 'pass', label: 'Offline helper (service worker)', detail: 'Running.' }
      : {
          id: 'sw',
          status: 'fail',
          label: 'Offline helper (service worker)',
          detail:
            env.serviceWorker === 'unsupported'
              ? 'This browser has no service workers.'
              : env.serviceWorker === 'registered'
                ? 'Installed, but not running on this page yet.'
                : 'Not running.',
          tip:
            env.serviceWorker === 'registered'
              ? 'Reload the page once.'
              : 'Use an up-to-date Chrome or Edge. If it still fails, a web filter or policy may block service workers for this site: ask IT to allow them.',
        },
  );
  results.push(
    env.storage === 'indexeddb'
      ? { id: 'storage', status: 'pass', label: 'Saving on this device', detail: 'IndexedDB works.' }
      : {
          id: 'storage',
          status: env.storage === 'localstorage' ? 'warn' : 'fail',
          label: 'Saving on this device',
          detail:
            env.storage === 'localstorage'
              ? 'IndexedDB is blocked, so a smaller backup store is used.'
              : 'Nothing can be saved: progress lasts only until this tab closes.',
          tip: 'Leave private or guest mode, or ask IT to allow site storage. Save a progress file often.',
        },
  );
  results.push(
    env.wasm
      ? { id: 'wasm', status: 'pass', label: 'WebAssembly (runs Python)', detail: 'Works.' }
      : {
          id: 'wasm',
          status: 'fail',
          label: 'WebAssembly (runs Python)',
          detail: 'WebAssembly is turned off or missing.',
          tip: 'Use an up-to-date Chrome or Edge, and ask IT whether a policy turns WebAssembly off.',
        },
  );
  results.push(
    env.wasmType?.startsWith('application/wasm')
      ? { id: 'wasm-type', status: 'pass', label: 'Python file type', detail: '.wasm is application/wasm.' }
      : {
          id: 'wasm-type',
          status: 'fail',
          label: 'Python file type',
          detail:
            env.wasmType === null
              ? "Python's main file could not be downloaded."
              : `.wasm is served as "${env.wasmType || 'nothing'}".`,
          tip:
            env.wasmType === null
              ? 'Check the network, or ask IT whether a web filter blocks .wasm files.'
              : 'Ask whoever hosts the game to serve .wasm files as application/wasm (see the README).',
        },
  );
  if (!env.quota) {
    results.push({
      id: 'quota',
      status: 'warn',
      label: 'Space for the game',
      detail: 'This browser does not say how much space is free.',
    });
  } else {
    const free = env.quota.quota - env.quota.usage;
    results.push({
      id: 'quota',
      status: free >= ROOM_NEEDED ? 'pass' : 'fail',
      label: 'Space for the game',
      detail: `${mb(env.quota.usage)} used of ${mb(env.quota.quota)}.`,
      ...(free < ROOM_NEEDED && {
        tip: 'Free some space on this device. The game needs about 60 MB to work offline.',
      }),
    });
  }
  results.push(
    env.python === 'ready'
      ? { id: 'python', status: 'pass', label: 'Python', detail: 'Ready.' }
      : env.python === 'loading'
        ? {
            id: 'python',
            status: 'warn',
            label: 'Python',
            detail: 'Still loading.',
            tip: 'Wait a moment, then check again.',
          }
        : {
            id: 'python',
            status: 'fail',
            label: 'Python',
            detail: 'Python could not start.',
            tip: 'Reload the page. If it fails again, check the other rows on this page.',
          },
  );
  results.push(
    env.offlineReady
      ? { id: 'offline', status: 'pass', label: 'Ready to play offline', detail: 'Yes ✓' }
      : {
          id: 'offline',
          status: 'warn',
          label: 'Ready to play offline',
          detail: 'Not yet.',
          tip: 'Keep the game open, online, until Python has loaded once.',
        },
  );
  results.push(
    env.voices > 0
      ? {
          id: 'voices',
          status: 'pass',
          label: 'Read-aloud voices',
          detail: `${env.voices} installed voice${env.voices === 1 ? '' : 's'}.`,
        }
      : {
          id: 'voices',
          status: 'warn',
          label: 'Read-aloud voices',
          detail: 'No installed voice. Read aloud is optional.',
          tip: 'Install a voice in the device settings (on a Chromebook: Settings → Accessibility → Text-to-speech).',
        },
  );
  return results;
}
