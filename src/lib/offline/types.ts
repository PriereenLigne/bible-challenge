export type OpPayload =
  | { type: "reading_event"; challengeId: string; book: string; chapter: number; readOn: string }
  | { type: "note_upsert"; noteId: string; body: string; baseVersion: number };

export interface QueuedOp {
  /** UUID généré sur l'appareil : clé d'idempotence côté serveur. */
  opId: string;
  createdAt: number;
  attempts: number;
  nextAttemptAt: number;
  payload: OpPayload;
}
export type OpResult = "applied" | "duplicate" | "rejected" | "conflict";

export interface OpStore {
  put(op: QueuedOp): Promise<void>;
  getAll(): Promise<QueuedOp[]>;
  remove(opId: string): Promise<void>;
}
export interface Transport {
  /** Doit réellement joindre le backend (pas seulement navigator.onLine). */
  health(): Promise<boolean>;
  send(ops: QueuedOp[]): Promise<Record<string, OpResult>>;
}
