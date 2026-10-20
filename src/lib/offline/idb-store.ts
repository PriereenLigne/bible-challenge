import { run, STORES } from "./local-db";
import type { OpStore, QueuedOp } from "./types";

/** File persistante : survit à la fermeture et au redémarrage. */
export const idbOpStore: OpStore = {
  put: async (op) => { await run(STORES.queue, "readwrite", (s) => s.put(op)); },
  getAll: () => run<QueuedOp[]>(STORES.queue, "readonly", (s) => s.getAll() as IDBRequest<QueuedOp[]>),
  remove: async (id) => { await run(STORES.queue, "readwrite", (s) => s.delete(id)); },
};
