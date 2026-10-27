"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Notice } from "@/components/Notice";

const field = "mt-1 block min-h-12 w-full rounded-xl border border-line bg-surface px-3";

export default function Page() {
  const router = useRouter();
  const { configured, loading, session } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { if (session) router.replace("/"); }, [session, router]);

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    if (!navigator.onLine) { setMsg("Une connexion Internet est nécessaire pour se connecter ou créer un compte."); return; }
    if (mode === "up" && password.length < 8) { setMsg("Le mot de passe doit contenir au moins 8 caractères."); return; }
    setBusy(true); setMsg(null);
    try {
      if (mode === "in") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) setMsg(error.message === "Invalid login credentials" ? "E-mail ou mot de passe incorrect." : error.message);
      } else {
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: name.trim() } } });
        if (error) setMsg(error.message);
        else if (!data.session) setMsg("Compte créé. Ouvrez l’e-mail de confirmation que nous venons d’envoyer, puis revenez vous connecter.");
      }
    } catch (err) {
      setMsg(`Serveur injoignable : ${(err as Error).message}`);
    } finally { setBusy(false); }
  }

  async function forgot() {
    const sb = getSupabase(); if (!sb) return;
    if (!email.trim()) { setMsg("Saisissez d’abord votre adresse e-mail ci-dessus."); return; }
    if (!navigator.onLine) { setMsg("Une connexion Internet est nécessaire."); return; }
    setBusy(true); setMsg(null);
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/connexion/nouveau` });
      // même message qu'un compte existe ou non : on ne révèle pas quelles adresses sont inscrites
      setMsg(error ? `Envoi impossible : ${error.message}` : "Si un compte existe avec cette adresse, un e-mail de réinitialisation vient d’être envoyé.");
    } catch (err) { setMsg(`Serveur injoignable : ${(err as Error).message}`); }
    finally { setBusy(false); }
  }

  if (!loading && !configured) {
    return <Notice title="Connexion indisponible"><p>Les clés Supabase ne sont pas configurées sur ce site (variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY).</p></Notice>;
  }
  return (
    <div className="space-y-5">
      <h1 className="font-reading text-3xl font-semibold text-forest">{mode === "in" ? "Se connecter" : "Créer un compte"}</h1>
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        {mode === "up" && (
          <label className="block text-sm">Prénom ou pseudo
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} autoComplete="given-name" />
          </label>
        )}
        <label className="block text-sm">Adresse e-mail
          <input type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="block text-sm">Mot de passe
          <input type="password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "up" ? 8 : 1} autoComplete={mode === "in" ? "current-password" : "new-password"} />
        </label>
        <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl bg-forest px-5 font-medium text-bg disabled:opacity-60">
          {busy ? "Un instant…" : mode === "in" ? "Se connecter" : "Créer mon compte"}
        </button>
        {msg && <p role="status" className="text-sm text-calm">{msg}</p>}
      </form>
      {mode === "in" && <button type="button" disabled={busy} onClick={() => void forgot()} className="min-h-12 w-full text-sm text-calm underline">Mot de passe oublié ?</button>}
      <button type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }} className="min-h-12 w-full text-sm text-calm underline">
        {mode === "in" ? "Pas encore de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
      </button>
    </div>
  );
}
