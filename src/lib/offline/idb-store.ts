import type { OpStore, QueuedOp } from "./types";

const DB = "bible-challenge";
const STORE = "op_queue";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: "opId" }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const r = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(r.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  }));
}

/** File persistante : survit à la fermeture et au redémarrage. Exclue de tout nettoyage de cache. */
export const idbOpStore: OpStore = {
  put: async (op) => { await run("readwrite", (s) => s.put(op)); },
  getAll: () => run<QueuedOp[]>("readonly", (s) => s.getAll() as IDBRequest<QueuedOp[]>),
  remove: async (id) => { await run("readwrite", (s) => s.delete(id)); },
};
