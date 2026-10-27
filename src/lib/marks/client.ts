import { getSupabase } from "@/lib/supabase/client";
import { marksStore } from "@/lib/offline/local-db";
import { idbOpStore } from "@/lib/offline/idb-store";
import { enqueue } from "@/lib/offline/sync";
import { reconcileMark } from "./reconcile";
import { markKey, type LocalMark, type MarkColor, type ServerMark } from "./types";

/** Remplace l'opération en file pour ce verset : seule la plus récente compte (dernier écrit gagne). */
async function queueMark(m: LocalMark): Promise<void> {
  for (const op of await idbOpStore.getAll()) if (op.payload.type === "verse_mark" && markKey(op.payload.book, op.payload.chapter, op.payload.verse) === m.key) await idbOpStore.remove(op.opId);
  await enqueue(idbOpStore, { type: "verse_mark", book: m.book, chapter: m.chapter, verse: m.verse, favorite: m.favorite, color: m.color, ts: m.ts }, Date.now(), () => crypto.randomUUID());
}

/** Modifie favori et/ou couleur d'un verset. Enregistré sur l'appareil d'abord, puis mis en file. */
export async function setMark(book: string, chapter: number, verse: number, patch: { favorite?: boolean; color?: MarkColor | null }): Promise<LocalMark> {
  const key = markKey(book, chapter, verse);
  const prev = await marksStore.get(key);
  const m: LocalMark = {
    key, book, chapter, verse,
    favorite: patch.favorite ?? prev?.favorite ?? false,
    color: patch.color === undefined ? prev?.color ?? null : patch.color,
    ts: Math.max(Date.now(), (prev?.ts ?? 0) + 1), // toujours strictement plus récent que la version précédente
    dirty: true,
  };
  await marksStore.put(m);
  await queueMark(m);
  return m;
}

/** Récupère les marques du serveur (autres appareils) et les réconcilie. Retourne true si un renvoi est nécessaire. */
export async function pullMarks(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || !navigator.onLine) return false;
  const queued = new Set((await idbOpStore.getAll()).flatMap((o) => (o.payload.type === "verse_mark" ? [markKey(o.payload.book, o.payload.chapter, o.payload.verse)] : [])));
  let needsSend = false;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("verse_marks").select("book_id,chapter,verse,favorite,color,client_ts").order("book_id").order("chapter").order("verse").range(from, from + 999);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { book_id: string; chapter: number; verse: number; favorite: boolean; color: MarkColor | null; client_ts: number }[];
    for (const r of rows) {
      const s: ServerMark = { book: r.book_id, chapter: r.chapter, verse: r.verse, favorite: r.favorite, color: r.color, ts: Number(r.client_ts) };
      const key = markKey(s.book, s.chapter, s.verse);
      const res = reconcileMark(await marksStore.get(key), s, queued.has(key));
      if (res.changed) await marksStore.put(res.mark);
      if (res.requeue) { await queueMark(res.mark); needsSend = true; }
    }
    if (rows.length < 1000) break;
  }
  return needsSend;
}
