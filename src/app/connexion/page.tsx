"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/Notice";
import { authErrorMessage, googleEnabled } from "@/lib/auth/messages";

const field = "mt-1 block min-h-12 w-full rounded-xl border border-line bg-surface px-3";

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

export default function Page() {
  const router = useRouter();
  const { configured, loading, session } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const google = googleEnabled();

  useEffect(() => { if (session) router.replace("/"); }, [session, router]);
  // « Créer mon compte » depuis l'accueil ouvre directement l'inscription
  useEffect(() => { if (new URLSearchParams(window.location.search).get("mode") === "inscription") setMode("up"); }, []);

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    if (!navigator.onLine) { setMsg("Une connexion Internet est nécessaire pour se connecter ou créer un compte."); return; }
    if (mode === "up" && password.length < 8) { setMsg("Le mot de passe doit contenir au moins 8 caractères."); return; }
    setBusy(true); setMsg(null);
    try {
      if (mode === "in") {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setMsg(authErrorMessage(error.message, error.code));
      } else {
        const { data, error } = await sb.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim() } } });
        if (error) setMsg(authErrorMessage(error.message, error.code));
        else if (!data.session) setMsg("Compte créé. Ouvrez l’e-mail de confirmation que nous venons d’envoyer, puis revenez vous connecter.");
        // avec une session, l'utilisateur est connecté tout de suite : l'effet ci-dessus l'emmène à l'accueil
      }
    } catch (err) {
      setMsg(authErrorMessage((err as Error).message));
    } finally { setBusy(false); }
  }

  async function withGoogle() {
    const sb = getSupabase(); if (!sb) return;
    if (!navigator.onLine) { setMsg("Une connexion Internet est nécessaire."); return; }
    setBusy(true); setMsg(null);
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/` } });
    if (error) { setMsg(authErrorMessage(error.message, error.code)); setBusy(false); }
    // sinon, le navigateur part vers Google puis revient connecté
  }

  async function forgot() {
    const sb = getSupabase(); if (!sb) return;
    if (!email.trim()) { setMsg("Saisissez d’abord votre adresse e-mail ci-dessus."); return; }
    if (!navigator.onLine) { setMsg("Une connexion Internet est nécessaire."); return; }
    setBusy(true); setMsg(null);
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/connexion/nouveau` });
      // même message qu'un compte existe ou non : on ne révèle pas quelles adresses sont inscrites
      setMsg(error ? `Envoi impossible : ${authErrorMessage(error.message, error.code)}` : "Si un compte existe avec cette adresse, un e-mail de réinitialisation vient d’être envoyé.");
    } catch (err) { setMsg(authErrorMessage((err as Error).message)); }
    finally { setBusy(false); }
  }

  if (!loading && !configured) {
    return <Notice title="Connexion indisponible"><p>Les clés Supabase ne sont pas configurées sur ce site (variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY).</p></Notice>;
  }
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-reading text-3xl font-semibold text-forest">{mode === "in" ? "Se connecter" : "Créer un compte"}</h1>
        <p className="mt-1 text-sm text-muted">{mode === "in" ? "Retrouvez votre progression sur tous vos appareils." : "Gratuit, sans publicité. Votre progression vous suit partout."}</p>
      </div>

      {google && (
        <>
          <button type="button" onClick={() => void withGoogle()} disabled={busy}
            className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface px-5 font-medium shadow-card transition active:scale-[.99] disabled:opacity-60">
            <GoogleLogo />Continuer avec Google
          </button>
          <div className="flex items-center gap-3 text-xs text-muted" aria-hidden="true"><span className="h-px flex-1 bg-line" />ou avec votre e-mail<span className="h-px flex-1 bg-line" /></div>
        </>
      )}

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        {mode === "up" && (
          <label className="block text-sm">Prénom ou pseudo
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} autoComplete="given-name" />
          </label>
        )}
        <label className="block text-sm">Adresse e-mail
          <input type="email" inputMode="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="block text-sm">Mot de passe{mode === "up" && <span className="text-muted"> (8 caractères minimum)</span>}
          <span className="relative mt-1 block">
            <input type={show ? "text" : "password"} className={`${field} mt-0 pr-12`} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "up" ? 8 : 1} autoComplete={mode === "in" ? "current-password" : "new-password"} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={show}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted"><Icon name={show ? "eye-off" : "eye"} size={19} /></button>
          </span>
        </label>
        <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl bg-forest px-5 font-medium text-bg disabled:opacity-60">
          {busy ? "Un instant…" : mode === "in" ? "Se connecter" : "Créer mon compte"}
        </button>
        {mode === "up" && <p className="text-xs leading-relaxed text-muted">En créant un compte, vous acceptez les <Link href="/conditions" className="text-calm underline">conditions d’utilisation</Link> et la <Link href="/confidentialite" className="text-calm underline">politique de confidentialité</Link>.</p>}
        {msg && <p role="status" className="text-sm text-calm">{msg}</p>}
      </form>
      {mode === "in" && <button type="button" disabled={busy} onClick={() => void forgot()} className="min-h-12 w-full text-sm text-calm underline">Mot de passe oublié ?</button>}
      <button type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }} className="min-h-12 w-full text-sm text-calm underline">
        {mode === "in" ? "Pas encore de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
      </button>
      <Link href="/lire" className="flex min-h-11 items-center justify-center text-sm text-muted">Continuer sans compte</Link>
    </div>
  );
}
