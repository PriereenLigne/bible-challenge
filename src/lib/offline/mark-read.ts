import { getSupabase, supabaseConfig } from "@/lib/supabase/client";
import { kv, readKey, readsStore, type LocalRead } from "./local-db";
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

/** Une passe de synchronisation. Retourne le nombre d'opérations encore en attente. Ne perd jamais de données. */
export async function runSync(): Promise<number> {
  const sb = getSupabase(); const cfg = supabaseConfig();
  if (sb && cfg) {
    const transport = createSupabaseTransport({ url: cfg.url, anonKey: cfg.key, getAccessToken: async () => (await sb.auth.getSession()).data.session?.access_token ?? null });
    await syncOnce(idbOpStore, transport, Date.now());
  }
  return (await idbOpStore.getAll()).length;
}

export { kv };
