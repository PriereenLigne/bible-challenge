"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ChallengeHero } from "@/components/ChallengeHero";
import { ChallengeSwitcher } from "@/components/ChallengeSwitcher";
import { DayPanel } from "@/components/DayPanel";
import { Icon } from "@/components/Icon";
import { RankingCard } from "@/components/RankingCard";
import { ReminderBanner } from "@/components/ReminderBanner";
import { useUserStats } from "@/components/useUserStats";
import { getSupabase } from "@/lib/supabase/client";
import { dayKey, daysStore, kv, readKey, readsStore, type DayDone, type LocalRead } from "@/lib/offline/local-db";
import { idbOpStore } from "@/lib/offline/idb-store";
import { markChapterRead, runSync as runSyncPass } from "@/lib/offline/mark-read";
import { dayDiff, localToday, pickChallenge, planOf, type ChallengeLite } from "@/lib/challenges/active";
import { dayStatus, type DayStatus } from "@/lib/challenges/day-status";
import { computeProgress } from "@/lib/progress/compute";
import { loadAllProgress } from "@/lib/progress/load-all";
import { getTeamProgress, listMyTeams } from "@/lib/teams/api";
import { rankMembers, ordinalFr } from "@/lib/ranking/rank";
import { summarize } from "@/lib/stats/dashboard";
import { DEFAULT_REMINDER, shouldNudge, type ReminderSettings } from "@/lib/reminders/settings";
import type { MemberProgress } from "@/lib/teams/stats";

const PAGE = 1000;
const SELECT = "id,title,scope,book_ids,start_date,end_date,status,team_id";
interface RankingData { rows: MemberProgress[]; teamName: string; showRanking: boolean; at: number }

const ago = (ms: number) => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? "à l’instant" : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j`; };

export function TodayReading() {
  const { configured, loading, session } = useAuth();
  const uid = session?.user.id;
  const firstName = String(session?.user.user_metadata?.display_name ?? session?.user.email?.split("@")[0] ?? "").split(" ")[0] || "ami";
  const today = useMemo(() => localToday(), []);
  const [challenges, setChallenges] = useState<ChallengeLite[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [reads, setReads] = useState<Map<string, LocalRead>>(new Map());
  const [done, setDone] = useState<Map<number, DayDone>>(new Map());
  const [selDay, setSelDay] = useState<number | null>(null);
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ranking, setRanking] = useState<RankingData | null>(null);
  const [reminder, setReminder] = useState<ReminderSettings>(DEFAULT_REMINDER);
  const [dismissed, setDismissed] = useState(false);
  const stats = useUserStats();

  const challenge = useMemo(() => challenges.find((c) => c.id === selectedId) ?? null, [challenges, selectedId]);

  const runSync = useCallback(async () => {
    try { setPending(await runSyncPass()); }
    catch (e) { console.error("Synchronisation :", e); setError("Synchronisation impossible pour le moment. Vos données sont conservées."); }
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => { setOnline(true); void runSync(); };
    const off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    kv.get<ReminderSettings>("reminder").then((r) => { if (r) setReminder(r); }).catch((e) => console.error("Rappel :", e));
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [runSync]);

  // liste des défis : cache local d'abord (hors connexion), puis serveur ; on ouvre directement le dernier défi consulté
  useEffect(() => {
    if (!uid) { setReady(true); return; }
    let active = true;
    (async () => {
      const cacheKey = `challenges:${uid}`;
      const choose = async (list: ChallengeLite[]) => {
        const remembered = await kv.get<string>(`selected:${uid}`);
        const id = list.find((c) => c.id === remembered)?.id ?? pickChallenge(list, today)?.id ?? list[0]?.id ?? null;
        for (const c of list) await kv.set(`challenge:${c.id}`, c);
        if (active) { setChallenges(list); setSelectedId((cur) => (cur && list.some((c) => c.id === cur) ? cur : id)); }
      };
      try {
        const cached = await kv.get<ChallengeLite[]>(cacheKey);
        if (cached) await choose(cached);
        const sb = getSupabase();
        if (navigator.onLine && sb) {
          const { data, error: err } = await sb.from("challenges").select(SELECT).in("status", ["active", "planned"]).order("start_date", { ascending: false });
          if (err) throw new Error(err.message);
          const list = (data ?? []) as ChallengeLite[];
          await kv.set(cacheKey, list);
          await choose(list);
          void loadAllProgress(list.map((c) => c.id)).then(() => stats.reload()).catch((e) => console.error("Progression globale :", e));
        }
        setPending((await idbOpStore.getAll()).length);
      } catch (e) { if (active) setError(`Chargement des défis : ${(e as Error).message}`); }
      finally { if (active) setReady(true); }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, today]);

  const select = (id: string) => { setSelectedId(id); setSelDay(null); setRanking(null); if (uid) void kv.set(`selected:${uid}`, id).catch((e) => console.error("Choix du défi non mémorisé :", e)); };

  // lectures et jours terminés du défi choisi
  const cid = challenge?.id;
  useEffect(() => {
    if (!cid) return;
    let active = true;
    setReads(new Map()); setDone(new Map());
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

  // classement de l'équipe (défi d'équipe) : serveur si possible, sinon dernier état connu
  const teamId = challenge?.team_id ?? null;
  useEffect(() => {
    if (!teamId) { setRanking(null); return; }
    let active = true;
    (async () => {
      const key = `ranking:${teamId}`;
      try {
        const cached = await kv.get<RankingData>(key);
        if (cached && active) setRanking(cached);
        const sb = getSupabase();
        if (navigator.onLine && sb) {
          const [teams, rows] = await Promise.all([listMyTeams(sb), getTeamProgress(sb, teamId)]);
          const t = teams.find((x) => x.id === teamId);
          const fresh: RankingData = { rows, teamName: t?.name ?? "Équipe", showRanking: t?.show_ranking ?? true, at: Date.now() };
          await kv.set(key, fresh);
          if (active) setRanking(fresh);
        }
      } catch (e) { console.error("Classement :", e); }
    })();
    return () => { active = false; };
  }, [teamId, reads.size, done.size]);

  async function markRead(book: string, chapter: number) {
    if (!challenge) return;
    const key = readKey(challenge.id, book, chapter);
    if (reads.has(key)) return;
    try {
      const rec = await markChapterRead(challenge.id, book, chapter, today);
      setReads((m) => new Map(m).set(key, rec));
      setError(null);
      void runSync().then(() => stats.reload());
    } catch (e) { setError(`Impossible d'enregistrer la lecture : ${(e as Error).message}`); }
  }

  const plan = useMemo(() => (challenge ? planOf(challenge) : null), [challenge]);
  const progress = useMemo(() => (plan ? computeProgress(plan, [...reads.values()].map((r) => ({ book: r.book, chapter: r.chapter })), today) : null), [plan, reads, today]);
  const statuses = useMemo<DayStatus[]>(() => (plan && cid ? plan.days.map((d) => dayStatus(d, (b, c) => reads.has(readKey(cid, b, c)), done.has(d.dayIndex))) : []), [plan, cid, reads, done]);
  const summary = useMemo(() => (stats.data ? summarize(stats.data.reads, stats.data.days, today) : null), [stats.data, today]);

  if (loading || (session && !ready)) return <div className="space-y-4" aria-busy="true"><div className="h-60 animate-pulse rounded-[1.9rem] bg-line/60" /><div className="h-40 animate-pulse rounded-3xl bg-line/60" /></div>;
  if (!configured) return <section className="card"><h2 className="font-reading text-xl font-semibold">Serveur non configuré</h2><p className="mt-2 text-sm text-muted">Les clés Supabase manquent sur ce site.</p></section>;

  if (!session) {
    return (
      <section className="hero animate-fade-up">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] muted">Bible Challenge</p>
        <h1 className="mt-2 font-reading text-3xl font-semibold leading-tight">Lire la Bible chaque jour, ensemble.</h1>
        <p className="mt-3 muted">Des défis de lecture, un quiz pour ancrer ce que vous lisez, des équipes pour avancer à plusieurs. Même sans connexion.</p>
        <Link href="/connexion" className="btn-sand mt-5 w-full">Commencer<Icon name="chevron-right" size={18} /></Link>
      </section>
    );
  }
  if (!challenge || !plan || !cid || !progress) {
    return (
      <div className="stagger space-y-4">
        {challenges.length > 0 && <ChallengeSwitcher challenges={challenges} selectedId={selectedId} onSelect={select} />}
        <section className="hero">
          <h1 className="font-reading text-[1.65rem] font-semibold leading-tight">Bonjour {firstName}</h1>
          <p className="mt-2 muted">Choisissez un programme et une durée : le calendrier de lecture se génère pour vous, jour après jour.</p>
          <Link href="/defis" className="btn-sand mt-5 w-full">Choisir un programme<Icon name="chevron-right" size={18} /></Link>
        </section>
        <Link href="/communaute" className="card flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sand/50 text-forest"><Icon name="users" size={22} /></span><span><span className="block font-medium">Rejoindre une équipe</span><span className="text-sm text-muted">Avec un code d’invitation reçu d’un ami</span></span></Link>
      </div>
    );
  }

  const total = plan.days.length;
  const rawIdx = dayDiff(challenge.start_date, today);
  const todayIdx = Math.min(Math.max(rawIdx, 0), total - 1);
  const dayIdx = Math.min(Math.max(selDay ?? todayIdx, 0), total - 1);
  const todayStatus = statuses[todayIdx] ?? "todo";
  const todayDone = todayStatus === "done" || todayStatus === "rest";
  const myRank = ranking?.showRanking ? rankMembers(ranking.rows, uid ?? "").me : null;
  const rankedCount = ranking?.showRanking ? rankMembers(ranking.rows, uid ?? "").ranked.length : 0;
  const d = new Date();
  const nudge = !dismissed && rawIdx >= 0 && rawIdx < total && shouldNudge(reminder, d.getDay(), d.getHours() * 60 + d.getMinutes(), todayDone);
  const cta = todayDone ? { label: "Journée terminée, bravo ✓", href: "#lecture" }
    : todayStatus === "quiz" ? { label: "Passer le quiz du jour", href: "#lecture" }
    : todayStatus === "partial" ? { label: "Continuer ma lecture", href: "#lecture" } : { label: "Commencer ma lecture", href: "#lecture" };
  const syncLabel = !online ? "Hors connexion : tout est enregistré sur l’appareil" : pending > 0 ? `${pending} modification(s) en attente d’envoi` : "Tout est synchronisé";

  return (
    <div className="stagger space-y-4">
      <ChallengeSwitcher challenges={challenges} selectedId={selectedId} onSelect={select} />
      <ChallengeHero firstName={firstName} title={challenge.title} dayNumber={todayIdx + 1} totalDays={total} percent={progress.contentReadPercent}
        daysDone={done.size} streak={summary?.streak ?? 0} cta={cta}
        rankText={myRank ? `${ordinalFr(myRank.rank)} sur ${rankedCount}` : null} />
      {nudge && <ReminderBanner onDismiss={() => setDismissed(true)} />}
      <DayPanel cid={cid} plan={plan} reads={reads} done={done} dayIdx={dayIdx} todayIdx={todayIdx} rawIdx={rawIdx} statuses={statuses}
        onSelect={setSelDay} onMark={(b, c) => void markRead(b, c)} onDayDone={(dd) => { setDone((m) => new Map(m).set(dd.dayIndex, dd)); void stats.reload(); }} />
      {ranking && uid && <RankingCard rows={ranking.rows} myId={uid} teamName={ranking.teamName} showRanking={ranking.showRanking} totalDays={total} stale={online ? null : ago(ranking.at)} />}
      <Link href="/profil" className="card flex items-center gap-3 transition active:scale-[.99]">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest/10 text-forest"><Icon name="chart" size={22} /></span>
        <span className="flex-1"><span className="block font-medium">Mon tableau de bord</span><span className="text-sm text-muted">Série, badges, bilan de la semaine</span></span>
        <Icon name="chevron-right" size={18} className="text-muted" />
      </Link>
      <p role="status" className="px-1 text-center text-xs text-muted">{syncLabel}</p>
      {error && <p role="alert" className="text-center text-sm text-calm">{error}</p>}
    </div>
  );
}
