// Local storage for profiles and code drafts (docs/specs.md §12.2).
// IndexedDB first, then localStorage, then memory (with a "can't save" banner).
import { createStore, del, get, keys, set, type UseStore } from 'idb-keyval';
import { migrateProfile } from './migrations';
import type { SessionRun } from '../runtime/protocol';
import type { Profile } from './profile';

export type StorageMode = 'indexeddb' | 'localstorage' | 'memory';

interface KV {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

function idbKV(store: UseStore): KV {
  return {
    get: (k) => get(k, store),
    set: (k, v) => set(k, v, store),
    del: (k) => del(k, store),
    keys: async () => (await keys(store)).map(String),
  };
}

function localKV(prefix = 'codeweald:'): KV {
  return {
    get: async (k) => {
      const raw = localStorage.getItem(prefix + k);
      return raw === null ? undefined : JSON.parse(raw);
    },
    set: async (k, v) => localStorage.setItem(prefix + k, JSON.stringify(v)),
    del: async (k) => localStorage.removeItem(prefix + k),
    keys: async () =>
      Object.keys(localStorage)
        .filter((k) => k.startsWith(prefix))
        .map((k) => k.slice(prefix.length)),
  };
}

function memoryKV(): KV {
  const map = new Map<string, unknown>();
  return {
    get: async (k) => structuredClone(map.get(k)) as never,
    set: async (k, v) => void map.set(k, structuredClone(v)),
    del: async (k) => void map.delete(k),
    keys: async () => [...map.keys()],
  };
}

export class Storage {
  private constructor(
    private kv: KV,
    readonly mode: StorageMode,
  ) {}

  static async open(): Promise<Storage> {
    try {
      const kv = idbKV(createStore('codeweald', 'kv'));
      await kv.set('meta:probe', 1);
      void navigator.storage?.persist?.().catch(() => {});
      return new Storage(kv, 'indexeddb');
    } catch {
      /* fall through */
    }
    try {
      const kv = localKV();
      await kv.set('meta:probe', 1);
      return new Storage(kv, 'localstorage');
    } catch {
      return new Storage(memoryKV(), 'memory');
    }
  }

  /** For tests. */
  static memory(): Storage {
    return new Storage(memoryKV(), 'memory');
  }

  async profiles(): Promise<Profile[]> {
    const ids = (await this.kv.keys()).filter((k) => k.startsWith('profile:'));
    const list = await Promise.all(ids.map((k) => this.kv.get<unknown>(k)));
    const out: Profile[] = [];
    for (const raw of list) {
      try {
        if (raw) out.push(migrateProfile(raw));
      } catch {
        /* a save from a newer game version, or damaged: leave it untouched */
      }
    }
    return out;
  }

  saveProfile(profile: Profile) {
    return this.kv.set(`profile:${profile.id}`, profile);
  }

  async deleteProfile(id: string) {
    await this.kv.del(`profile:${id}`);
    await this.kv.del(`programs:${id}`);
    for (const k of await this.kv.keys()) if (k.startsWith(`draft:${id}:`)) await this.kv.del(k);
  }

  /** Saved Workshop programs (§11.7), newest first. */
  async programs(profileId: string): Promise<Program[]> {
    const list = await this.kv.get<unknown>(`programs:${profileId}`);
    return Array.isArray(list) ? (list as Program[]) : [];
  }

  savePrograms(profileId: string, programs: Program[]) {
    return this.kv.set(`programs:${profileId}`, programs.slice(0, MAX_PROGRAMS));
  }

  async draft(profileId: string, key: string): Promise<string | undefined> {
    return draftCode(await this.kv.get<unknown>(`draft:${profileId}:${key}`));
  }

  /** The draft and the quest session's run history (for session validators, §9.3). */
  async draftWithSession(
    profileId: string,
    key: string,
  ): Promise<{ code: string; session: SessionRun[] } | undefined> {
    const value = await this.kv.get<unknown>(`draft:${profileId}:${key}`);
    const code = draftCode(value);
    if (code === undefined) return undefined;
    const session = (value as Partial<DraftRecord>).session;
    return { code, session: Array.isArray(session) ? session : [] };
  }

  saveDraft(profileId: string, key: string, code: string, session?: SessionRun[]) {
    const record: DraftRecord = { schemaVersion: 1, code, ...(session?.length ? { session } : {}) };
    return this.kv.set(`draft:${profileId}:${key}`, record);
  }

  async drafts(profileId: string): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    for (const k of await this.kv.keys()) {
      if (k.startsWith(`draft:${profileId}:`)) {
        const code = draftCode(await this.kv.get<unknown>(k));
        if (code !== undefined) out[k.slice(`draft:${profileId}:`.length)] = code;
      }
    }
    return out;
  }

  lastProfileId() {
    return this.kv.get<string>('meta:lastProfile');
  }

  setLastProfileId(id: string) {
    return this.kv.set('meta:lastProfile', id);
  }
}

/** A saved Workshop program. */
export interface Program {
  id: string;
  name: string;
  code: string;
  mapId: string;
  savedOn: string;
}

/** Students keep up to this many Workshop programs (§11.7). */
export const MAX_PROGRAMS = 20;

/** A saved draft. Version 1 drafts were stored as bare strings. */
interface DraftRecord {
  schemaVersion: 1;
  code: string;
  /** Recent runs in this quest session, newest last (only quests with session validators). */
  session?: SessionRun[];
}

export function draftCode(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as DraftRecord).code === 'string')
    return (value as DraftRecord).code;
  return undefined;
}
