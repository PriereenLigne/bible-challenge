"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Avatar } from "@/components/Avatar";
import { Icon, type IconName } from "@/components/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useUserStats } from "@/components/useUserStats";
import { getSupabase } from "@/lib/supabase/client";
import { kv } from "@/lib/offline/local-db";
import { runSync } from "@/lib/offline/mark-read";
import { loadAllProgress } from "@/lib/progress/load-all";
import { listMyTeams } from "@/lib/teams/api";
import { localToday, planOf, type ChallengeLite } from "@/lib/challenges/active";
import { isChallengeComplete } from "@/lib/challenges/day-status";
import { summarize, weeklyBilan } from "@/lib/stats/dashboard";
import { evaluateBadges } from "@/lib/badges/evaluate";

const LINKS: { href: string; label: string; hint: string; icon: IconName }[] = [
  { href: "/profil/journal", label: "Mon journal", hint: "Toutes mes notes", icon: "pencil" },
  { href: "/profil/favoris", label: "Favoris et surlignages", hint: "Mes versets marqués", icon: "heart" },
  { href: "/profil/rappels", label: "Rappels quotidiens", hint: "Heure et jours de lecture", icon: "bell" },
  { href: "/communaute", label: "Mes équipes", hint: "Lire ensemble", icon: "users" },
  { href: "/defis", label: "Mes défis", hint: "Choisir ou créer un programme", icon: "flag" },
];

function Tile({ icon, value, label, tone }: { icon: IconName; value: number; label: string; tone: string }) {
  return (
    <div className="card p-4">
      <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}><Icon name={icon} size={20} filled={icon === "flame"} /></span>
      <p className="mt-3 font-reading text-3xl font-semibold leading-none">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

export function ProfileDashboard() {
  const { configured, loading, session } = useAuth();
  const uid = session?.user.id;
  const today = useMemo(() => localToday(), []);
  const { data, reload } = useUserStats();
  const [challenges, setChallenges] = useState<ChallengeLite[]>([]);
  const [teamsCount, setTeamsCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let active = true;
    (async () => {
      try {
        const list = (await kv.get<ChallengeLite[]>(`challenges:${uid}`)) ?? [];
        const cachedTeams = (await kv.get<number>(`teams-count:${uid}`)) ?? 0;
        if (active) { setChallenges(list); setTeamsCount(cachedTeams); }
        const sb = getSupabase();
        if (sb && navigator.onLine) {
          setSyncing(true);
          await runSync();
          await loadAllProgress(list.map((c) => c.id));
          const teams = await listMyTeams(sb);
          await kv.set(`teams-count:${uid}`, teams.length);
          if (active) setTeamsCount(teams.length);
          await reload();
        }
      } catch (e) { console.error("Tableau de bord :", e); }
      finally { if (active) setSyncing(false); }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const summary = useMemo(() => (data ? summarize(data.reads, data.days, today) : null), [data, today]);
  const bilan = useMemo(() => (data ? weeklyBilan(data.reads, data.days, data.noteTimes.map((t) => localToday(new Date(t))), today) : null), [data, today]);
  const completed = useMemo(() => {
    if (!data) return 0;
    return challenges.filter((c) => {
      const readSet = new Set(data.reads.filter((r) => r.challengeId === c.id).map((r) => `${r.book}:${r.chapter}`));
      const doneSet = new Set(data.days.filter((d) => d.challengeId === c.id).map((d) => d.dayIndex));
      return isChallengeComplete(planOf(c), (b, ch) => readSet.has(`${b}:${ch}`), doneSet);
    }).length;
  }, [data, challenges]);
  const badges = useMemo(() => (summary && data ? evaluateBadges({
    distinctChapters: summary.distinctChapters, bestStreak: summary.best, booksCompleted: summary.booksCompleted.length, completedChallenges: completed,
    notesCount: data.notesCount, favoritesCount: data.favoritesCount, teamsCount, perfectQuizzes: summary.perfectQuizzes,
  }) : []), [summary, data, completed, teamsCount]);

  if (loading) return <p className="text-sm text-muted">Chargement…</p>;
  if (!configured) return <section className="card"><h2 className="font-reading text-xl font-semibold">Serveur non configuré</h2><p className="mt-2 text-sm text-muted">Les clés Supabase manquent sur ce site.</p></section>;
  if (!session) {
    return (
      <section className="hero animate-fade-up">
        <h1 className="font-reading text-2xl font-semibold">Votre espace personnel</h1>
        <p className="mt-2 muted">Connectez-vous pour retrouver votre progression, vos badges et vos notes sur tous vos appareils.</p>
        <Link href="/connexion" className="btn-sand mt-5 w-full">Se connecter</Link>
        <div className="mt-5 rounded-2xl bg-white/10 p-3"><p className="mb-2 text-xs uppercase tracking-widest muted">Apparence</p><ThemeToggle /></div>
      </section>
    );
  }

  const name = String(session.user.user_metadata?.display_name ?? session.user.email?.split("@")[0] ?? "Lecteur");
  const maxCh = Math.max(1, ...(bilan?.days.map((d) => d.chapters) ?? [1]));
  const earned = badges.filter((b) => b.earned).length;

  return (
    <div className="stagger space-y-5">
      <section className="hero">
        <div className="flex items-center gap-4">
          <Avatar name={name} size={64} ring />
          <div className="min-w-0"><h1 className="truncate font-reading text-2xl font-semibold">{name}</h1><p className="truncate text-sm muted">{session.user.email}</p></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold"><Icon name="flame" size={15} filled className="text-sand" />{summary?.streak ?? 0} jour{(summary?.streak ?? 0) > 1 ? "s" : ""} de suite</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold"><Icon name="award" size={15} className="text-sand" />{earned} badge{earned > 1 ? "s" : ""}</span>
          {syncing && <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs muted">Mise à jour…</span>}
        </div>
      </section>

      <section aria-label="Statistiques" className="grid grid-cols-2 gap-3">
        <Tile icon="flame" value={summary?.streak ?? 0} label="Série en cours (jours)" tone="bg-orange-100 text-orange-600" />
        <Tile icon="trophy" value={summary?.best ?? 0} label="Meilleure série (jours)" tone="bg-sand/50 text-forest" />
        <Tile icon="book" value={summary?.distinctChapters ?? 0} label="Chapitres lus" tone="bg-progress/15 text-progress" />
        <Tile icon="check" value={summary?.daysDone ?? 0} label="Jours terminés" tone="bg-calm/15 text-calm" />
      </section>

      {bilan && (
        <section className="card" aria-label="Bilan de la semaine">
          <p className="eyebrow">Bilan de la semaine</p>
          <p className="mt-1 font-reading text-lg leading-snug">{bilan.headline}</p>
          <div className="mt-5 flex h-28 items-end justify-between gap-2" role="img" aria-label={`Chapitres lus par jour : ${bilan.days.map((d) => `${d.label} ${d.chapters}`).join(", ")}`}>
            {bilan.days.map((d, i) => (
              <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <div className="flex w-full flex-1 items-end"><div className={`w-full rounded-t-xl transition-all duration-700 ${d.chapters > 0 ? "bg-gradient-to-t from-progress to-progress/60" : "bg-line"}`} style={{ height: d.chapters > 0 ? `${Math.max(14, (d.chapters / maxCh) * 100)}%` : "8%" }} /></div>
                <span className={`text-xs ${i === 6 ? "font-bold text-ink" : "text-muted"}`}>{d.label}</span>
              </div>
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[["Chapitres", bilan.totalChapters], ["Jours terminés", bilan.daysCompleted], ["Notes", bilan.notesWritten]].map(([l, v]) => (
              <div key={l as string} className="rounded-2xl bg-bg p-2.5"><dd className="font-reading text-xl font-semibold">{v}</dd><dt className="text-[0.7rem] text-muted">{l}</dt></div>
            ))}
          </dl>
        </section>
      )}

      <section className="card" aria-label="Badges">
        <div className="flex items-baseline justify-between"><p className="eyebrow">Badges</p><p className="text-sm text-muted">{earned} / {badges.length}</p></div>
        <ul className="mt-4 grid grid-cols-3 gap-3">
          {badges.map((b) => (
            <li key={b.id} className="flex flex-col items-center text-center" title={b.description}>
              <span className={`flex h-16 w-16 items-center justify-center rounded-full ${b.earned ? "bg-gradient-to-br from-sand to-gold text-forest shadow-lift animate-pop" : "bg-line/70 text-muted"}`}>
                <Icon name={b.earned ? b.icon : "lock"} size={b.earned ? 28 : 22} filled={b.earned && (b.icon === "flame" || b.icon === "star" || b.icon === "heart")} />
              </span>
              <span className={`mt-2 text-xs font-semibold leading-tight ${b.earned ? "" : "text-muted"}`}>{b.title}</span>
              <span className="mt-0.5 text-[0.65rem] leading-tight text-muted">{b.earned ? "Obtenu" : b.target > 1 ? `${b.value} / ${b.target}` : b.description}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-2" aria-label="Raccourcis">
        <ul>
          {LINKS.map((l) => (
            <li key={l.href}><Link href={l.href} className="flex min-h-14 items-center gap-3 rounded-2xl px-3 transition hover:bg-bg active:scale-[.99]">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest/10 text-forest"><Icon name={l.icon} size={20} /></span>
              <span className="flex-1"><span className="block font-medium">{l.label}</span><span className="text-xs text-muted">{l.hint}</span></span>
              <Icon name="chevron-right" size={18} className="text-muted" />
            </Link></li>
          ))}
        </ul>
      </section>

      <section className="card"><p className="eyebrow mb-3">Apparence</p><ThemeToggle /></section>
      <button type="button" onClick={() => { void getSupabase()?.auth.signOut(); }} className="btn-ghost w-full">Se déconnecter</button>
    </div>
  );
}
