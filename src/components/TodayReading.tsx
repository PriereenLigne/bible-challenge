"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Notice } from "@/components/Notice";
import { getSupabase, supabaseConfig } from "@/lib/supabase/client";
import { BOOK_BY_ID } from "@/lib/bible/canon";
import { kv, readKey, readsStore, type LocalRead } from "@/lib/offline/local-db";
import { idbOpStore } from "@/lib/offline/idb-store";
import { markChapterRead, runSync as runSyncPass } from "@/lib/offline/mark-read";
import { readerHref } from "@/lib/bible/params";
import { localToday, pickChallenge, planOf, todayState, type ChallengeLite } from "@/lib/challenges/active";
import { computeProgress } from "@/lib/progress/compute";

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const PAGE = 1000; // limite par défaut de Supabase : on pagine

export function TodayReading() {
  const { configured, loading, session } = useAuth();
  const uid = session?.user.id;
  const today = useMemo(() => localToday(), []);
  const [challenge, setChallenge] = useState<ChallengeLite | null>(null);
  const [ready, setReady] = useState(false);
  const [reads, setReads] = useState<Map<string, LocalRead>>(new Map());
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runSync = useCallback(async () => {
    try { setPending(await runSyncPass()); }
    catch (e) { console.error("Synchronisation :", e); setError("Synchronisation impossible pour le moment. Vos lectures sont conservées."); }
  }, []);

  // état réseau + resynchronisation au retour de la connexion
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => { setOnline(true); void runSync(); };
    const off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [runSync]);

  // défi : cache local d'abord (fonctionne hors connexion), puis serveur
  useEffect(() => {
    if (!uid) { setReady(true); return; }
    let active = true;
    (async () => {
      const cacheKey = `challenges:${uid}`;
      try {
        const cached = await kv.get<ChallengeLite[]>(cacheKey);
        const fromCache = cached ? pickChallenge(cached, today) : null;
        if (fromCache) await kv.set(`challenge:${fromCache.id}`, fromCache);
        if (fromCache && active) setChallenge(fromCache);
        const sb = getSupabase();
        if (navigator.onLine && sb) {
          const { data, error: err } = await sb.from("challenges").select("id,title,scope,book_ids,start_date,end_date,status").in("status", ["active", "planned"]);
          if (err) throw new Error(err.message);
          const list = (data ?? []) as ChallengeLite[];
          await kv.set(cacheKey, list);
          const picked = pickChallenge(list, today);
          if (picked) await kv.set(`challenge:${picked.id}`, picked);
          if (active) setChallenge(picked);
        }
        setPending((await idbOpStore.getAll()).length);
      } catch (e) { if (active) setError(`Chargement du défi : ${(e as Error).message}`); }
      finally { if (active) setReady(true); }
    })();
    return () => { active = false; };
  }, [uid, today]);

  // lectures : locales d'abord, puis fusion avec celles du serveur (autres appareils)
  const cid = challenge?.id;
  useEffect(() => {
    if (!cid) return;
    let active = true;
    (async () => {
      try {
        const local = await readsStore.forChallenge(cid);
        if (active) setReads(new Map(local.map((r) => [r.key, r])));
        const sb = getSupabase();
        if (navigator.onLine && sb) {
          for (let from = 0; ; from += PAGE) {
            const { data, error: err } = await sb.from("reading_events").select("book_id,chapter,read_on").eq("challenge_id", cid).order("received_at").range(from, from + PAGE - 1);
            if (err) throw new Error(err.message);
            const rows = data ?? [];
            for (const row of rows as { book_id: string; chapter: number; read_on: string }[]) {
              const rec: LocalRead = { key: readKey(cid, row.book_id, row.chapter), challengeId: cid, book: row.book_id, chapter: row.chapter, readOn: row.read_on };
              await readsStore.put(rec);
              if (active) setReads((m) => (m.has(rec.key) ? m : new Map(m).set(rec.key, rec)));
            }
            if (rows.length < PAGE) break;
          }
        }
        void runSync();
      } catch (e) { if (active) setError(`Chargement des lectures : ${(e as Error).message}`); }
    })();
    return () => { active = false; };
  }, [cid, runSync]);

  async function markRead(book: string, chapter: number) {
    if (!challenge) return;
    const key = readKey(challenge.id, book, chapter);
    if (reads.has(key)) return;
    try {
      const rec = await markChapterRead(challenge.id, book, chapter, today);
      setReads((m) => new Map(m).set(key, rec));
      setError(null);
      void runSync();
    } catch (e) { setError(`Impossible d'enregistrer la lecture : ${(e as Error).message}`); }
  }

  const plan = useMemo(() => (challenge ? planOf(challenge) : null), [challenge]);
  const progress = useMemo(() => (plan ? computeProgress(plan, [...reads.values()].map((r) => ({ book: r.book, chapter: r.chapter })), today) : null), [plan, reads, today]);

  if (loading || (session && !ready)) return <p className="text-sm text-muted">Chargement…</p>;
  if (!configured) return <Notice title="Serveur non configuré"><p>Les clés Supabase manquent sur ce site.</p></Notice>;
  if (!session) {
    return (
      <Notice title="Bienvenue">
        <p>Créez un compte pour enregistrer vos défis et votre progression, même lorsque vous lisez sans connexion.</p>
        <Link href="/connexion" className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-forest px-5 font-medium text-bg">Se connecter</Link>
      </Notice>
    );
  }
  if (!challenge) {
    return (
      <Notice title="Aucun défi en cours">
        <p>Choisissez un programme et une durée : le calendrier de lecture est généré pour vous, jour après jour.</p>
        <Link href="/defis" className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-forest px-5 font-medium text-bg">Choisir un programme</Link>
      </Notice>
    );
  }

  const state = todayState(challenge, today);
  const syncLabel = !online ? "Hors connexion" : pending > 0 ? `${pending} modification(s) en attente d’envoi` : "Tout est synchronisé";
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm text-muted">{challenge.title}</p>
        {state.kind === "not_started" && <p className="mt-1 font-reading text-xl">Votre défi commence dans {state.startsIn} jour(s).</p>}
        {state.kind === "ended" && <p className="mt-1 font-reading text-xl">Ce défi est arrivé à son terme.</p>}
        {state.kind === "running" && (
          <>
            <p className="mt-1 font-reading text-xl">Jour {state.dayIndex + 1} sur {state.totalDays}</p>
            {state.day.rest ? <p className="mt-3 text-sm text-muted">Jour de repos : aucune lecture prévue aujourd’hui.</p> : (
              <ul className="mt-3 divide-y divide-line">
                {state.day.passages.flatMap((p) => range(p.from, p.to).map((c) => ({ book: p.book, chapter: c }))).map(({ book, chapter }) => {
                  const done = reads.has(readKey(challenge.id, book, chapter));
                  return (
                    <li key={`${book}:${chapter}`} className="flex items-center justify-between gap-3 py-2">
                      <Link href={readerHref(book, chapter, challenge.id)} className="min-h-11 flex-1 py-2 underline decoration-line underline-offset-4">{BOOK_BY_ID.get(book)?.name ?? book} {chapter}</Link>
                      <button type="button" disabled={done} onClick={() => void markRead(book, chapter)}
                        className={`min-h-11 rounded-xl px-4 text-sm font-medium ${done ? "bg-progress/15 text-progress" : "bg-forest text-bg"}`}>
                        {done ? "Lu ✓" : "Marquer comme lu"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
        {progress && (
          <div className="mt-4">
            <div role="progressbar" aria-valuenow={progress.contentReadPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Contenu lu" className="h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-progress" style={{ width: `${Math.min(100, progress.contentReadPercent)}%` }} />
            </div>
            <p className="mt-2 text-sm text-muted">{progress.uniqueRead} chapitre(s) lu(s) · {progress.contentReadPercent} % du programme</p>
            {progress.chaptersBehind > 0 && <p className="mt-1 text-sm text-muted">Il reste {progress.chaptersBehind} chapitre(s) à rattraper, à votre rythme.</p>}
          </div>
        )}
      </section>
      <p role="status" className="text-sm text-muted">{syncLabel}</p>
      {error && <p role="alert" className="text-sm text-calm">{error}</p>}
    </div>
  );
}
