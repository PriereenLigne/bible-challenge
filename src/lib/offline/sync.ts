import type { OpPayload, OpStore, QueuedOp, Transport } from "./types";

const BASE_DELAY_MS = 5_000;
const MAX_DELAY_MS = 15 * 60_000;
export const backoff = (attempts: number) => Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** Math.max(0, attempts - 1));

export async function enqueue(store: OpStore, payload: OpPayload, now: number, newId: () => string): Promise<QueuedOp> {
  const op: QueuedOp = { opId: newId(), createdAt: now, attempts: 0, nextAttemptAt: now, payload };
  await store.put(op); // persisté AVANT toute tentative réseau
  return op;
}

export interface SyncReport { status: "offline" | "server_unreachable" | "done"; applied: number; duplicates: number; rejected: number; conflicts: number; pending: number }

/**
 * Une passe de synchronisation.
 * - Vérifie d'abord que le serveur répond.
 * - Une opération n'est retirée de la file qu'après réponse explicite du serveur.
 * - En cas d'échec réseau ou serveur : rien n'est supprimé, tentative replanifiée.
 * - « conflict » et « rejected » sont retirés de la file ; le conflit de note doit être conservé
 *   côté serveur comme version concurrente (voir migration, table note_conflicts).
 */
export async function syncOnce(store: OpStore, transport: Transport, now: number): Promise<SyncReport> {
  const all = (await store.getAll()).sort((a, b) => a.createdAt - b.createdAt);
  const report: SyncReport = { status: "done", applied: 0, duplicates: 0, rejected: 0, conflicts: 0, pending: all.length };
  const due = all.filter((o) => o.nextAttemptAt <= now);
  if (due.length === 0) return report;

  let healthy = false;
  try { healthy = await transport.health(); } catch { healthy = false; }
  if (!healthy) return { ...report, status: "server_unreachable" };

  let results: Record<string, string>;
  try { results = await transport.send(due); }
  catch {
    for (const o of due) await store.put({ ...o, attempts: o.attempts + 1, nextAttemptAt: now + backoff(o.attempts + 1) });
    return { ...report, status: "server_unreachable" };
  }
  for (const o of due) {
    const r = results[o.opId];
    if (r === "applied") report.applied++;
    else if (r === "duplicate") report.duplicates++;
    else if (r === "conflict") report.conflicts++;
    else if (r === "rejected") report.rejected++;
    else { await store.put({ ...o, attempts: o.attempts + 1, nextAttemptAt: now + backoff(o.attempts + 1) }); continue; } // réponse absente : on garde
    await store.remove(o.opId);
  }
  report.pending = (await store.getAll()).length;
  return report;
}
