import { markKey, type LocalMark, type ServerMark } from "./types";

/** Dernier écrit gagne (horodatage du client). Une opération encore en file n'est jamais écrasée. */
export function reconcileMark(local: LocalMark | undefined, s: ServerMark, hasQueued: boolean): { mark: LocalMark; changed: boolean; requeue: boolean } {
  const adopt = (): LocalMark => ({ key: markKey(s.book, s.chapter, s.verse), book: s.book, chapter: s.chapter, verse: s.verse, favorite: s.favorite, color: s.color, ts: s.ts, dirty: false });
  if (!local) return { mark: adopt(), changed: true, requeue: false };
  if (hasQueued) return { mark: local, changed: false, requeue: false };
  if (s.ts > local.ts) return { mark: adopt(), changed: true, requeue: false };
  if (s.ts === local.ts) return { mark: { ...local, dirty: false }, changed: local.dirty, requeue: false };
  return { mark: local, changed: false, requeue: true }; // l'appareil est plus récent et rien n'est en file : on renvoie
}
