import { getSupabase, supabaseConfig } from "@/lib/supabase/client";
import { dayKey, daysStore, kv, readKey, readsStore, type DayDone, type LocalRead } from "./local-db";
import { pullNotes } from "@/lib/notes/client";
import { idbOpStore } from "./idb-store";
import { enqueue, syncOnce } from "./sync";
import { createSupabaseTransport } from "./supabase-transport";

/** Validation d'un chapitre : 1) sur l'appareil, 2) en file d'attente. L'envoi se fait ensuite par runSync(). */
export async function markChapterRead(challengeId: string, book: string, chapter: number, today: string): Promise<LocalRead> {
  const rec: LocalRead = { key: readKey(challengeId, book, chapter), challengeId, book, chapter, readOn: today };
  await readsStore.put(rec);
  await enqueue(idbOpStore, { type: "reading_event", challengeId, book, chapter, readOn: today }, Date.now(), () => crypto.randomUUID());
  return rec;
}

/** Jour terminé (lecture complète + quiz réussi) : enregistré sur l'appareil, puis mis en file. */
export async function completeDay(challengeId: string, dayIndex: number, score: number, total: number, doneOn: string): Promise<DayDone> {
  const rec: DayDone = { key: dayKey(challengeId, dayIndex), challengeId, dayIndex, score, total, doneOn };
  await daysStore.put(rec);
  await enqueue(idbOpStore, { type: "day_quiz", challengeId, dayIndex, score, total, doneOn }, Date.now(), () => crypto.randomUUID());
  return rec;
}

/** Une passe de synchronisation. Retourne le nombre d'opérations encore en attente. Ne perd jamais de données. */
export async function runSync(): Promise<number> {
  const sb = getSupabase(); const cfg = supabaseConfig();
  if (sb && cfg) {
    const transport = createSupabaseTransport({ url: cfg.url, anonKey: cfg.key, getAccessToken: async () => (await sb.auth.getSession()).data.session?.access_token ?? null });
    await syncOnce(idbOpStore, transport, Date.now());
    try { if (await pullNotes()) await syncOnce(idbOpStore, transport, Date.now()); } // fusion des notes puis renvoi
    catch (e) { console.error("Notes :", e); }
  }
  return (await idbOpStore.getAll()).length;
}

export { kv };
