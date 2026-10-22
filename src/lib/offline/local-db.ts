const DB = "bible-challenge";
const VERSION = 3;
import type { LocalNote } from "@/lib/notes/reconcile";
export const STORES = { queue: "op_queue", kv: "kv", reads: "reads", notes: "notes", days: "days" } as const;

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result; // migration non destructive : ne supprime jamais un magasin existant
      if (!db.objectStoreNames.contains(STORES.queue)) db.createObjectStore(STORES.queue, { keyPath: "opId" });
      if (!db.objectStoreNames.contains(STORES.kv)) db.createObjectStore(STORES.kv);
      if (!db.objectStoreNames.contains(STORES.reads)) db.createObjectStore(STORES.reads, { keyPath: "key" });
      if (!db.objectStoreNames.contains(STORES.notes)) db.createObjectStore(STORES.notes, { keyPath: "refKey" });
      if (!db.objectStoreNames.contains(STORES.days)) db.createObjectStore(STORES.days, { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const r = fn(tx.objectStore(store));
    tx.oncomplete = () => { db.close(); resolve(r.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  }));
}

/** Petit coffre clé/valeur (cache des défis). Hors de portée du nettoyage de cache du Service Worker. */
export const kv = {
  get: <T,>(key: string) => run<T | undefined>(STORES.kv, "readonly", (s) => s.get(key) as IDBRequest<T | undefined>),
  set: async (key: string, value: unknown) => { await run(STORES.kv, "readwrite", (s) => s.put(value, key)); },
};

export interface LocalRead { key: string; challengeId: string; book: string; chapter: number; readOn: string }
export const readKey = (challengeId: string, book: string, chapter: number) => `${challengeId}:${book}:${chapter}`;
export const readsStore = {
  put: async (r: LocalRead) => { await run(STORES.reads, "readwrite", (s) => s.put(r)); },
  forChallenge: async (challengeId: string) => {
    const all = await run<LocalRead[]>(STORES.reads, "readonly", (s) => s.getAll() as IDBRequest<LocalRead[]>);
    return all.filter((r) => r.challengeId === challengeId);
  },
};

export type { LocalNote };
export const notesStore = {
  get: (refKey: string) => run<LocalNote | undefined>(STORES.notes, "readonly", (s) => s.get(refKey) as IDBRequest<LocalNote | undefined>),
  put: async (n: LocalNote) => { await run(STORES.notes, "readwrite", (s) => s.put(n)); },
};

export interface DayDone { key: string; challengeId: string; dayIndex: number; score: number; total: number; doneOn: string }
export const dayKey = (challengeId: string, dayIndex: number) => `${challengeId}:${dayIndex}`;
export const daysStore = {
  put: async (d: DayDone) => { await run(STORES.days, "readwrite", (s) => s.put(d)); },
  forChallenge: async (challengeId: string) => {
    const all = await run<DayDone[]>(STORES.days, "readonly", (s) => s.getAll() as IDBRequest<DayDone[]>);
    return all.filter((d) => d.challengeId === challengeId);
  },
};
