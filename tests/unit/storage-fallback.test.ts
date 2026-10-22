// Without IndexedDB, saving falls back to localStorage, then to memory (specs §12.2).
// (No fake-indexeddb here, so IndexedDB really is missing.)
import { afterEach, describe, expect, it } from 'vitest';
import { newProfile } from '../../src/state/profile';
import { Storage } from '../../src/state/storage';

function fakeLocalStorage() {
  const data = new Map<string, string>();
  const ls = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
  // Object.keys(localStorage) lists the stored keys in browsers.
  return new Proxy(ls, {
    ownKeys: () => [...data.keys()],
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
  });
}

afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe('storage fallbacks', () => {
  it('uses localStorage when IndexedDB is missing', async () => {
    (globalThis as { localStorage?: unknown }).localStorage = fakeLocalStorage();
    const storage = await Storage.open();
    expect(storage.mode).toBe('localstorage');
    const p = newProfile('Local Newt', 'avatar-1', 'moss', 'one');
    await storage.saveProfile(p);
    await storage.saveDraft(p.id, 'q1', 'print(1)');
    expect((await storage.profiles()).map((x) => x.nickname)).toEqual(['Local Newt']);
    expect(await storage.draft(p.id, 'q1')).toBe('print(1)');
  });

  it('keeps working in memory when nothing can be stored', async () => {
    const storage = await Storage.open();
    expect(storage.mode).toBe('memory');
    const p = newProfile('Memory Newt', 'avatar-1', 'moss', 'one');
    await storage.saveProfile(p);
    expect((await storage.profiles())[0]?.nickname).toBe('Memory Newt');
  });
});
