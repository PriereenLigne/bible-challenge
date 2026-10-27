"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

const field = "mt-1 block min-h-12 w-full rounded-xl border border-line bg-surface px-3";

export default function Page() {
  const [ready, setReady] = useState(false);
  const [waited, setWaited] = useState(false);
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const sb = getSupabase(); if (!sb) return;
    const { data } = sb.auth.onAuthStateChange((event, session) => { if (event === "PASSWORD_RECOVERY" || session) setReady(true); });
    sb.auth.getSession().then(({ data: d }) => { if (d.session) setReady(true); }).catch((e) => console.error("Session :", e));
    const t = setTimeout(() => setWaited(true), 3000);
    return () => { data.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    const sb = getSupabase(); if (!sb) return;
    if (pw.length < 8) { setMsg("Le mot de passe doit contenir au moins 8 caractères."); return; }
    if (pw !== pw2) { setMsg("Les deux mots de passe ne sont pas identiques."); return; }
    setBusy(true); setMsg(null);
    try {
      const { error } = await sb.auth.updateUser({ password: pw });
      if (error) setMsg(error.message); else setDone(true);
    } catch (err) { setMsg(`Serveur injoignable : ${(err as Error).message}`); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <h1 className="font-reading text-3xl font-semibold text-forest">Nouveau mot de passe</h1>
      {done ? (
        <div className="space-y-3"><p role="status" className="text-progress">Mot de passe modifié.</p><Link href="/" className="inline-flex min-h-12 items-center rounded-xl bg-forest px-5 font-medium text-bg">Continuer</Link></div>
      ) : !ready ? (
        waited ? <p role="alert" className="text-sm text-calm">Ce lien n’est plus valide ou a expiré. <Link href="/connexion" className="underline">Demandez-en un nouveau</Link> depuis la page de connexion (« Mot de passe oublié ? »).</p>
               : <p className="text-sm text-muted">Vérification du lien…</p>
      ) : (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-surface p-5">
          <label className="block text-sm">Nouveau mot de passe<input type="password" className={field} value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} required autoComplete="new-password" /></label>
          <label className="block text-sm">Confirmer<input type="password" className={field} value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={8} required autoComplete="new-password" /></label>
          <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl bg-forest px-5 font-medium text-bg disabled:opacity-60">{busy ? "Un instant…" : "Enregistrer"}</button>
          {msg && <p role="alert" className="text-sm text-calm">{msg}</p>}
        </form>
      )}
    </div>
  );
}
