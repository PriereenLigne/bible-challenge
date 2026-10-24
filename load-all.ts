import { getSupabase } from "@/lib/supabase/client";
import { dayKey, daysStore, readKey, readsStore } from "@/lib/offline/local-db";

const PAGE = 1000;
/** Rapatrie sur l'appareil lectures et jours terminés de chacun des défis (autres appareils inclus). Sans effet hors connexion. */
export async function loadAllProgress(challengeIds: readonly string[]): Promise<void> {
  const sb = getSupabase();
  if (!sb || !navigator.onLine) return;
  for (const cid of challengeIds) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await sb.from("reading_events").select("book_id,chapter,read_on").eq("challenge_id", cid).order("received_at").range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as { book_id: string; chapter: number; read_on: string }[];
      for (const r of rows) await readsStore.put({ key: readKey(cid, r.book_id, r.chapter), challengeId: cid, book: r.book_id, chapter: r.chapter, readOn: r.read_on });
      if (rows.length < PAGE) break;
    }
    const { data: days, error: e2 } = await sb.from("day_completions").select("day_index,score,total,completed_on").eq("challenge_id", cid).range(0, 3999);
    if (e2) throw new Error(e2.message);
    for (const d of (days ?? []) as { day_index: number; score: number; total: number; completed_on: string }[])
      await daysStore.put({ key: dayKey(cid, d.day_index), challengeId: cid, dayIndex: d.day_index, score: d.score, total: d.total, doneOn: d.completed_on });
  }
}
