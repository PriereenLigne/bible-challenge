import { getSupabase } from "@/lib/supabase/client";
import { notesStore, type LocalNote } from "@/lib/offline/local-db";
import { idbOpStore } from "@/lib/offline/idb-store";
import { enqueue } from "@/lib/offline/sync";
import { reconcileNote } from "./reconcile";

const newId = () => crypto.randomUUID();

/** Remplace toute opération de note encore en file pour cette référence : une seule opération, toujours la plus récente. */
async function queueNote(note: LocalNote): Promise<void> {
  for (const op of await idbOpStore.getAll()) if (op.payload.type === "note_upsert" && op.payload.refKey === note.refKey) await idbOpStore.remove(op.opId);
  await enqueue(idbOpStore, { type: "note_upsert", refKey: note.refKey, body: note.body, baseVersion: note.baseVersion }, Date.now(), newId);
}

/** Enregistre sur l'appareil d'abord, puis met en file pour l'envoi. */
export async function saveNote(refKey: string, body: string): Promise<LocalNote> {
  const prev = await notesStore.get(refKey);
  const note: LocalNote = { refKey, body, baseVersion: prev?.baseVersion ?? 0, dirty: true, updatedAt: Date.now() };
  await notesStore.put(note);
  await queueNote(note);
  return note;
}

/** Récupère les notes du serveur et les réconcilie avec les notes locales (aucune perte de texte). Retourne true si un renvoi est nécessaire. */
export async function pullNotes(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || !navigator.onLine) return false;
  const queued = new Set((await idbOpStore.getAll()).flatMap((o) => (o.payload.type === "note_upsert" ? [o.payload.refKey] : [])));
  let needsSend = false;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("notes").select("ref_key,body,version").order("ref_key").range(from, from + 999);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { ref_key: string; body: string; version: number }[];
    for (const r of rows) {
      const res = reconcileNote(await notesStore.get(r.ref_key), { refKey: r.ref_key, body: r.body, version: r.version }, queued.has(r.ref_key));
      if (res.changed) await notesStore.put(res.note);
      if (res.enqueue) { await queueNote(res.note); needsSend = true; }
    }
    if (rows.length < 1000) break;
  }
  return needsSend;
}
