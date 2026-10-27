"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Notice } from "@/components/Notice";
import { getSupabase } from "@/lib/supabase/client";
import { createTeam, joinByCode, listMyTeams, type TeamRow } from "@/lib/teams/api";
import { buildTeamParams, normalizeInviteCode } from "@/lib/teams/build";
import { DURATIONS, SCOPES, type ScopeId } from "@/lib/plans/scopes";
import { localToday } from "@/lib/challenges/active";

const field = "mt-1 block min-h-12 w-full rounded-xl border border-line bg-surface px-3";
const primary = "min-h-12 rounded-xl bg-forest px-5 font-medium text-bg disabled:opacity-60";

export function TeamsHome() {
  const router = useRouter();
  const { configured, loading, session } = useAuth();
  const [teams, setTeams] = useState<TeamRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState(""); const [description, setDescription] = useState("");
  const [withChallenge, setWithChallenge] = useState(true);
  const [scope, setScope] = useState<ScopeId>("gospels"); const [durationId, setDurationId] = useState("1m"); const [start, setStart] = useState(localToday());

  const load = useCallback(async () => {
    const sb = getSupabase(); if (!sb || !navigator.onLine) return;
    try { setTeams(await listMyTeams(sb)); } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { if (session) void load(); }, [session, load]);
  useEffect(() => { const c = new URLSearchParams(window.location.search).get("code"); if (c) setCode(c); }, []); // lien d'invitation

  async function run(fn: (sb: NonNullable<ReturnType<typeof getSupabase>>) => Promise<string>) {
    const sb = getSupabase(); if (!sb) return;
    if (!navigator.onLine) { setError("Une connexion Internet est nécessaire pour la communauté."); return; }
    setBusy(true); setError(null);
    try { router.push(`/communaute/equipe?id=${await fn(sb)}`); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const create = (e: React.SyntheticEvent) => { e.preventDefault(); let p; try { p = buildTeamParams({ name, description, withChallenge, scope, durationId, start }); } catch (err) { setError((err as Error).message); return; } void run((sb) => createTeam(sb, p)); };
  const join = (e: React.SyntheticEvent) => { e.preventDefault(); const c = normalizeInviteCode(code); if (!c) { setError("Ce code n’est pas valide : il comporte 12 caractères (chiffres et lettres A à F)."); return; } void run((sb) => joinByCode(sb, c)); };

  if (loading) return <p className="text-sm text-muted">Chargement…</p>;
  if (!configured) return <Notice title="Serveur non configuré"><p>Les clés Supabase manquent sur ce site.</p></Notice>;
  if (!session) return (
    <Notice title="Connexion requise">
      <p>Connectez-vous pour créer une équipe ou rejoindre celle d’un ami.</p>
      <Link href="/connexion" className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-forest px-5 font-medium text-bg">Se connecter</Link>
    </Notice>
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">La communauté nécessite une connexion Internet. Votre lecture, elle, reste disponible hors connexion.</p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mes équipes</h2>
        {teams === null ? <p className="text-sm text-muted">Chargement…</p>
          : teams.length === 0 ? <p className="text-sm text-muted">Vous ne faites partie d’aucune équipe pour l’instant.</p>
          : <ul className="space-y-2">{teams.map((t) => (
              <li key={t.id}><Link href={`/communaute/equipe?id=${t.id}`} className="block min-h-14 rounded-2xl border border-line bg-surface p-4">
                <span className="font-medium">{t.name}</span>
                {t.description && <span className="mt-1 block text-sm text-muted">{t.description}</span>}
                {t.start_date && <span className="mt-1 block text-xs text-muted">Défi commun du {t.start_date} au {t.end_date}</span>}
              </Link></li>))}</ul>}
      </section>

      <form onSubmit={join} className="space-y-3 rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold">Rejoindre avec un code</h2>
        <label className="block text-sm">Code d’invitation
          <input className={`${field} font-mono uppercase tracking-wider`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXX-XXXX-XXXX" autoComplete="off" />
        </label>
        <button type="submit" disabled={busy} className={primary}>{busy ? "Un instant…" : "Rejoindre l’équipe"}</button>
      </form>

      {!showCreate ? <button type="button" onClick={() => setShowCreate(true)} className="min-h-12 w-full rounded-xl border border-line px-5 font-medium">Créer une équipe</button> : (
        <form onSubmit={create} className="space-y-4 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold">Nouvelle équipe</h2>
          <label className="block text-sm">Nom<input className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required /></label>
          <label className="block text-sm">Description (facultatif)<textarea className={`${field} py-2`} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} /></label>
          <label className="flex min-h-12 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={withChallenge} onChange={(e) => setWithChallenge(e.target.checked)} />Définir un défi commun (même calendrier pour tous)</label>
          {withChallenge && (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">Programme<select className={field} value={scope} onChange={(e) => setScope(e.target.value as ScopeId)}>{Object.entries(SCOPES).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}</select></label>
              <label className="text-sm">Durée<select className={field} value={durationId} onChange={(e) => setDurationId(e.target.value)}>{DURATIONS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}</select></label>
              <label className="text-sm">Début<input type="date" className={field} value={start} onChange={(e) => e.target.value && setStart(e.target.value)} /></label>
            </div>
          )}
          <div className="flex gap-3"><button type="submit" disabled={busy} className={primary}>{busy ? "Création…" : "Créer l’équipe"}</button>
            <button type="button" onClick={() => setShowCreate(false)} className="min-h-12 rounded-xl border border-line px-5">Annuler</button></div>
        </form>
      )}
      {error && <p role="alert" className="text-sm text-calm">{error}</p>}
    </div>
  );
}
