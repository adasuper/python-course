// After boot, student code (even through a sandbox escape) must not reach the network or
// storage from the Python worker (docs/specs.md §6.4 (5)).

export const BLOCKED_GLOBALS = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'importScripts',
  'Worker',
];
export const BLOCKED_GETTERS = ['indexedDB', 'caches'];

export function neuterNetwork(scope: object): void {
  const blocked = (name: string) => () => {
    throw new Error(`${name} is not available inside Codeweald's Python worker`);
  };
  const target = scope as Record<string, unknown>;
  for (const name of BLOCKED_GLOBALS) {
    try {
      target[name] = blocked(name);
    } catch {
      /* some globals are read-only; the CSP still blocks them */
    }
  }
  for (const name of BLOCKED_GETTERS) {
    try {
      Object.defineProperty(scope, name, { get: blocked(name), configurable: false });
    } catch {
      /* ignore */
    }
  }
}
