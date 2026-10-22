"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Notice } from "@/components/Notice";
import { DayQuiz } from "@/components/DayQuiz";
import { NoteBlock } from "@/components/NoteBlock";
import { getSupabase } from "@/lib/supabase/client";
import { BOOK_BY_ID } from "@/lib/bible/canon";
import { dayKey, daysStore, kv, readKey, readsStore, type DayDone, type LocalRead } from "@/lib/offline/local-db";
import { idbOpStore } from "@/lib/offline/idb-store";
import { markChapterRead, runSync as runSyncPass } from "@/lib/offline/mark-read";
import { readerHref } from "@/lib/bible/params";
import { dayDiff, localToday, pickChallenge, planOf, type ChallengeLite } from "@/lib/challenges/active";
import { chaptersOfDay, dayStatus, type DayStatus } from "@/lib/challenges/day-status";
import { computeProgress } from "@/lib/progress/compute";

const PAGE = 1000; // limite par défaut de Supabase : on pagine
const nav = "min-h-12 min-w-12 rounded-xl border border-line px-4 text-lg disabled:opacity-40";
const longDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const CELL: Record<DayStatus, string> = {
  done: "bg-progress text-bg", quiz: "border-2 border-progress", partial: "bg-sand/60", todo: "border border-line", rest: "border border-dashed border-line opacity-50",
};
const CELL_LABEL: Record<DayStatus, string> = { done: "terminé", quiz: "quiz à passer", partial: "lecture commencée", todo: "à faire", rest: "repos" };

export function TodayReading() {
  const { configured, loading, session } = useAuth();
  const uid = session?.user.id;
  const today = useMemo(() => localToday(), []);
  const [challenge, setChallenge] = useState<ChallengeLite | null>(null);
  const [ready, setReady] = useState(false);
  const [reads, setReads] = useState<Map<string, LocalRead>>(new Map());
  const [done, setDone] = useState<Map<number, DayDone>>(new Map());
  const [selDay, setSelDay] = useState<number | null>(null);
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runSync = useCallback(async () => {
    try { setPending(await runSyncPass()); }
    catch (e) { console.error("Synchronisation :", e); setError("Synchronisation impossible pour le moment. Vos données sont conservées."); }
  }, []);

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

  // lectures et jours terminés : locaux d'abord, puis fusion avec le serveur (autres appareils)
  const cid = challenge?.id;
  useEffect(() => {
    if (!cid) return;
    let active = true;
    (async () => {
      try {
        const local = await readsStore.forChallenge(cid);
        const localDays = await daysStore.forChallenge(cid);
        if (active) { setReads(new Map(local.map((r) => [r.key, r]))); setDone(new Map(localDays.map((d) => [d.dayIndex, d]))); }
        const sb = getSupabase();
        if (navigator.onLine && sb) {
          for (let from = 0; ; from += PAGE) {
            const { data, error: err } = await sb.from("reading_events").select("book_id,chapter,read_on").eq("challenge_id", cid).order("received_at").range(from, from + PAGE - 1);
            if (err) throw new Error(err.message);
            const rows = (data ?? []) as { book_id: string; chapter: number; read_on: string }[];
            for (const row of rows) {
              const rec: LocalRead = { key: readKey(cid, row.book_id, row.chapter), challengeId: cid, book: row.book_id, chapter: row.chapter, readOn: row.read_on };
              await readsStore.put(rec);
              if (active) setReads((m) => (m.has(rec.key) ? m : new Map(m).set(rec.key, rec)));
            }
            if (rows.length < PAGE) break;
          }
          const { data: days, error: dErr } = await sb.from("day_completions").select("day_index,score,total,completed_on").eq("challenge_id", cid).range(0, 3999);
          if (dErr) throw new Error(dErr.message);
          for (const d of (days ?? []) as { day_index: number; score: number; total: number; completed_on: string }[]) {
            const rec: DayDone = { key: dayKey(cid, d.day_index), challengeId: cid, dayIndex: d.day_index, score: d.score, total: d.total, doneOn: d.completed_on };
            await daysStore.put(rec);
            if (active) setDone((m) => (m.has(rec.dayIndex) ? m : new Map(m).set(rec.dayIndex, rec)));
          }
        }
        void runSync();
      } catch (e) { if (active) setError(`Chargement de la progression : ${(e as Error).message}`); }
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
  const statuses = useMemo<DayStatus[]>(() => (plan && cid ? plan.days.map((d) => dayStatus(d, (b, c) => reads.has(readKey(cid, b, c)), done.has(d.dayIndex))) : []), [plan, cid, reads, done]);

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
  if (!challenge || !plan || !cid) {
    return (
      <Notice title="Aucun défi en cours">
        <p>Choisissez un programme et une durée : le calendrier de lecture est généré pour vous, jour après jour.</p>
        <Link href="/defis" className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-forest px-5 font-medium text-bg">Choisir un programme</Link>
      </Notice>
    );
  }

  const total = plan.days.length;
  const rawIdx = dayDiff(challenge.start_date, today);
  const todayIdx = Math.min(Math.max(rawIdx, 0), total - 1);
  const dayIdx = Math.min(Math.max(selDay ?? todayIdx, 0), total - 1);
  const day = plan.days[dayIdx]!;
  const chapters = chaptersOfDay(day);
  const allRead = chapters.length > 0 && chapters.every((c) => reads.has(readKey(cid, c.book, c.chapter)));
  const dayDone = done.get(dayIdx);
  const daysDone = [...done.keys()].length;
  const syncLabel = !online ? "Hors connexion" : pending > 0 ? `${pending} modification(s) en attente d’envoi` : "Tout est synchronisé";

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm text-muted">{challenge.title}</p>
        {rawIdx < 0 && <p className="mt-1 text-sm text-calm">Le défi commence dans {-rawIdx} jour(s). Vous pouvez déjà prendre de l’avance.</p>}
        {rawIdx >= total && <p className="mt-1 text-sm text-calm">Le calendrier prévu est terminé. Vous pouvez poursuivre à votre rythme.</p>}

        <div className="mt-3 flex items-center justify-between gap-2">
          <button type="button" className={nav} aria-label="Jour précédent" disabled={dayIdx <= 0} onClick={() => setSelDay(dayIdx - 1)}>‹</button>
          <div className="text-center">
            <p className="font-reading text-xl">Jour {dayIdx + 1} sur {total}</p>
            <p className="text-xs capitalize text-muted">{longDate(day.date)}{dayIdx === todayIdx && rawIdx >= 0 && rawIdx < total ? " · aujourd’hui" : ""}</p>
          </div>
          <button type="button" className={nav} aria-label="Jour suivant" disabled={dayIdx >= total - 1} onClick={() => setSelDay(dayIdx + 1)}>›</button>
        </div>
        {dayIdx !== todayIdx && <button type="button" onClick={() => setSelDay(null)} className="mt-2 min-h-11 w-full text-sm text-calm underline">Revenir à aujourd’hui</button>}

        {day.rest ? <p className="mt-4 text-sm text-muted">Jour de repos : aucune lecture prévue.</p> : (
          <ul className="mt-3 divide-y divide-line">
            {chapters.map(({ book, chapter }) => {
              const isDone = reads.has(readKey(cid, book, chapter));
              return (
                <li key={`${book}:${chapter}`} className="flex items-center justify-between gap-3 py-2">
                  <Link href={readerHref(book, chapter, cid)} className="min-h-11 flex-1 py-2 underline decoration-line underline-offset-4">{BOOK_BY_ID.get(book)?.name ?? book} {chapter}</Link>
                  <button type="button" disabled={isDone} onClick={() => void markRead(book, chapter)}
                    className={`min-h-11 rounded-xl px-4 text-sm font-medium ${isDone ? "bg-progress/15 text-progress" : "bg-forest text-bg"}`}>
                    {isDone ? "Lu ✓" : "Marquer comme lu"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {progress && (
          <div className="mt-4">
            <div role="progressbar" aria-valuenow={progress.contentReadPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Contenu lu" className="h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-progress" style={{ width: `${Math.min(100, progress.contentReadPercent)}%` }} />
            </div>
            <p className="mt-2 text-sm text-muted">{progress.uniqueRead} chapitre(s) lu(s) · {progress.contentReadPercent} % du programme · {daysDone} jour(s) terminé(s) sur {total}</p>
            {progress.chaptersBehind > 0 && <p className="mt-1 text-sm text-muted">Il reste {progress.chaptersBehind} chapitre(s) à rattraper, à votre rythme.</p>}
          </div>
        )}
      </section>

      {!day.rest && (dayDone ? (
        <p className="rounded-2xl bg-progress/15 p-4 text-progress">Jour {dayIdx + 1} terminé ✓ — quiz {dayDone.score}/{dayDone.total}</p>
      ) : allRead ? (
        <DayQuiz key={`${cid}:${dayIdx}`} challengeId={cid} dayIndex={dayIdx} chapters={chapters} onCompleted={(d) => setDone((m) => new Map(m).set(d.dayIndex, d))} />
      ) : (
        <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">Le quiz du jour s’ouvre dès que tous les chapitres de ce jour sont marqués comme lus.</p>
      ))}

      {!day.rest && <NoteBlock refKey={`day:${cid}:${dayIdx}`} title="Ma méditation du jour" placeholder="Qu’est-ce que Dieu vous a dit à travers ces passages ? Une phrase, une prière, une décision…" />}

      <details className="rounded-2xl border border-line bg-surface p-4">
        <summary className="min-h-11 cursor-pointer py-2 font-medium">Tous les jours</summary>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {plan.days.map((d, i) => (
            <button key={d.dayIndex} type="button" onClick={() => setSelDay(i)} aria-label={`Jour ${i + 1}, ${CELL_LABEL[statuses[i] ?? "todo"]}`} aria-current={i === dayIdx ? "true" : undefined}
              className={`min-h-10 rounded-lg text-xs ${CELL[statuses[i] ?? "todo"]} ${i === dayIdx ? "ring-2 ring-calm" : ""} ${i === todayIdx && rawIdx >= 0 && rawIdx < total ? "font-bold underline" : ""}`}>
              {i + 1}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Plein : terminé · cadre plein : quiz à passer · sable : commencé · cadre fin : à faire · pointillé : repos.</p>
      </details>

      <p role="status" className="text-sm text-muted">{syncLabel}</p>
      {error && <p role="alert" className="text-sm text-calm">{error}</p>}
    </div>
  );
}
