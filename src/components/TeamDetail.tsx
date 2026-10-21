"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Notice } from "@/components/Notice";
import { getSupabase } from "@/lib/supabase/client";
import { createInvite, getTeamProgress, leaveTeam, listInvites, listMyTeams, revokeInvite, setSharing, type InviteRow, type TeamRow } from "@/lib/teams/api";
import { computeTeamStats, type MemberProgress } from "@/lib/teams/stats";
import { countChapters, formatInviteCode } from "@/lib/teams/build";
import { isUuid } from "@/lib/validation/ops";
import { localToday } from "@/lib/challenges/active";

const btn = "min-h-12 rounded-xl border border-line px-5 font-medium disabled:opacity-60";

export function TeamDetail() {
  const router = useRouter();
  const { session } = useAuth();
  const uid = session?.user.id;
  const [teamId, setTeamId] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [rows, setRows] = useState<MemberProgress[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const today = useMemo(() => localToday(), []);

  useEffect(() => { const id = new URLSearchParams(window.location.search).get("id"); setTeamId(isUuid(id) ? id : null); setReady(true); }, []);

  const load = useCallback(async () => {
    const sb = getSupabase(); if (!sb || !teamId || !uid) return;
    if (!navigator.onLine) { setError("Une connexion Internet est nécessaire pour la communauté."); return; }
    try {
      const teams = await listMyTeams(sb);
      const t = teams.find((x) => x.id === teamId) ?? null;
      setTeam(t);
      if (!t) { setError("Équipe introuvable, ou vous n’en êtes pas membre."); return; }
      const progress = await getTeamProgress(sb, teamId);
      setRows(progress);
      const me = progress.find((r) => r.user_id === uid);
      setInvites(me && (me.role === "creator" || me.role === "leader") ? await listInvites(sb, teamId) : []);
      setError(null);
    } catch (e) { setError((e as Error).message); }
  }, [teamId, uid]);
  useEffect(() => { void load(); }, [load]);

  const me = rows.find((r) => r.user_id === uid);
  const isLeader = me?.role === "creator" || me?.role === "leader";
  const perMember = team?.book_ids ? countChapters(team.book_ids) : 0;
  const stats = useMemo(() => computeTeamStats(rows, perMember, today), [rows, perMember, today]);

  async function act(fn: () => Promise<void>, ok?: string) {
    setError(null); setInfo(null);
    try { await fn(); if (ok) setInfo(ok); await load(); } catch (e) { setError((e as Error).message); }
  }
  const sb = () => getSupabase()!;
  const link = (code: string) => `${window.location.origin}/communaute?code=${code}`;
  async function share(code: string) {
    const url = link(code); const text = `Rejoins mon équipe « ${team?.name} » sur Bible Challenge : ${url}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setInfo("Lien d’invitation copié."); }
    } catch (e) { if ((e as Error).name !== "AbortError") setError("Impossible de partager automatiquement : copiez le code ci-dessus."); }
  }

  if (!ready) return null;
  if (!teamId) return <Notice title="Équipe introuvable"><p>Ce lien n’est pas valide.</p><Link href="/communaute" className="mt-3 inline-block underline">Retour à la communauté</Link></Notice>;
  if (!team) return <div className="space-y-3">{error ? <p role="alert" className="text-sm text-calm">{error}</p> : <p className="text-sm text-muted">Chargement…</p>}<Link href="/communaute" className="inline-block underline">← Mes équipes</Link></div>;

  const activeInvites = invites.filter((i) => !i.revoked_at && new Date(i.expires_at) > new Date());
  return (
    <div className="space-y-6">
      <Link href="/communaute" className="text-sm text-calm underline">← Mes équipes</Link>
      <header>
        <h1 className="font-reading text-3xl font-semibold text-forest">{team.name}</h1>
        {team.description && <p className="mt-1 text-muted">{team.description}</p>}
        {team.start_date && <p className="mt-1 text-sm text-muted">Défi commun : {perMember} chapitres, du {team.start_date} au {team.end_date}. Retrouvez-le sur votre accueil.</p>}
      </header>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold">Ensemble</h2>
        <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div><dt className="text-xs text-muted">Membres</dt><dd className="text-2xl font-semibold">{stats.members}</dd></div>
          <div><dt className="text-xs text-muted">Chapitres lus</dt><dd className="text-2xl font-semibold">{stats.totalRead}</dd></div>
          <div><dt className="text-xs text-muted">Actifs (7 j)</dt><dd className="text-2xl font-semibold">{stats.participationPercent === null ? "–" : `${stats.participationPercent} %`}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-muted">« Chapitres lus » additionne les lectures individuelles des membres qui partagent leur progression. Ce n’est pas le pourcentage de la Bible lue en commun.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Membres</h2>
        <ul className="space-y-2">
          {stats.perMember.map((m) => (
            <li key={m.userId} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{m.name}{m.userId === uid ? " (vous)" : ""}</span>
                <span className="text-xs text-muted">{m.role === "creator" ? "Créateur" : m.role === "leader" ? "Responsable" : m.role === "moderator" ? "Modérateur" : "Membre"}</span>
              </div>
              {m.percent === null ? <p className="mt-2 text-sm text-muted">Progression non partagée</p> : (
                <>
                  <div role="progressbar" aria-valuenow={m.percent} aria-valuemin={0} aria-valuemax={100} aria-label={`Progression de ${m.name}`} className="mt-2 h-2 overflow-hidden rounded-full bg-line"><div className="h-full bg-progress" style={{ width: `${m.percent}%` }} /></div>
                  <p className="mt-1 text-xs text-muted">{m.read} chapitre(s) · {m.percent} % du programme</p>
                </>
              )}
            </li>))}
        </ul>
      </section>

      {isLeader && (
        <section className="space-y-3 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold">Inviter</h2>
          {activeInvites.length === 0 && <p className="text-sm text-muted">Aucune invitation active.</p>}
          <ul className="space-y-3">{activeInvites.map((i) => (
            <li key={i.code} className="rounded-xl border border-line p-3">
              <p className="font-mono text-lg tracking-wider">{formatInviteCode(i.code)}</p>
              <p className="text-xs text-muted">Valable jusqu’au {new Date(i.expires_at).toLocaleDateString("fr-FR")} · utilisée {i.uses} fois{i.max_uses ? ` sur ${i.max_uses}` : ""}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className={btn} onClick={() => void share(i.code)}>Partager le lien</button>
                <button type="button" className={btn} onClick={() => void act(() => revokeInvite(sb(), i.code), "Invitation révoquée.")}>Révoquer</button>
              </div>
            </li>))}</ul>
          <button type="button" className={btn} onClick={() => void act(async () => { await createInvite(sb(), team.id, 7, null); }, "Nouvelle invitation valable 7 jours.")}>Créer une invitation (7 jours)</button>
        </section>
      )}

      <section className="space-y-3 rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold">Mes réglages</h2>
        <label className="flex min-h-12 items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5" checked={me?.shares ?? true} onChange={(e) => void act(() => setSharing(sb(), team.id, e.target.checked))} />
          Partager ma progression avec cette équipe
        </label>
        {me?.role !== "creator" && <button type="button" className={btn} onClick={() => { if (confirm("Quitter cette équipe ? Votre historique de lecture est conservé.")) void act(async () => { await leaveTeam(sb(), team.id); router.push("/communaute"); }); }}>Quitter l’équipe</button>}
      </section>
      {info && <p role="status" className="text-sm text-progress">{info}</p>}
      {error && <p role="alert" className="text-sm text-calm">{error}</p>}
    </div>
  );
}
