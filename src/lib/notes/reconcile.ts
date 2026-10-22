export interface LocalNote { refKey: string; body: string; baseVersion: number; dirty: boolean; updatedAt: number }
export interface ServerNote { refKey: string; body: string; version: number }
export const MERGE_SEPARATOR = "\n\n— Version enregistrée sur cet appareil —\n";

/**
 * Compare la note locale à celle du serveur. Règles :
 * - jamais de perte : en cas de divergence, les deux textes sont conservés (fusion déterministe) ;
 * - une opération encore en file n'est pas écrasée : elle sera résolue par le serveur.
 */
export function reconcileNote(local: LocalNote | undefined, server: ServerNote, hasQueuedOp: boolean): { note: LocalNote; changed: boolean; enqueue: boolean } {
  const adopt = (): LocalNote => ({ refKey: server.refKey, body: server.body, baseVersion: server.version, dirty: false, updatedAt: local?.updatedAt ?? 0 });
  if (!local) return { note: adopt(), changed: true, enqueue: false };
  if (hasQueuedOp) return { note: local, changed: false, enqueue: false };
  if (local.body === server.body) {
    const same = !local.dirty && local.baseVersion === server.version;
    return { note: { ...local, baseVersion: server.version, dirty: false }, changed: !same, enqueue: false };
  }
  if (!local.dirty) return { note: adopt(), changed: true, enqueue: false };
  if (server.body.includes(local.body)) return { note: adopt(), changed: true, enqueue: false }; // le serveur contient déjà notre texte
  return { note: { refKey: local.refKey, body: server.body + MERGE_SEPARATOR + local.body, baseVersion: server.version, dirty: true, updatedAt: local.updatedAt }, changed: true, enqueue: true };
}
