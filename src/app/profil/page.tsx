"use client";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Notice } from "@/components/Notice";

export default function Page() {
  const { configured, loading, session, profileError } = useAuth();
  return (
    <div className="space-y-5">
      <h1 className="font-reading text-3xl font-semibold text-forest">Profil</h1>
      {loading ? <p className="text-sm text-muted">Chargement…</p>
        : !configured ? <Notice title="Serveur non configuré"><p>Les clés Supabase manquent sur ce site.</p></Notice>
        : !session ? (
          <Notice title="Vous n’êtes pas connecté">
            <p>Connectez-vous pour enregistrer vos défis et retrouver votre progression sur tous vos appareils.</p>
            <Link href="/connexion" className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-forest px-5 font-medium text-bg">Se connecter</Link>
          </Notice>
        ) : (
          <Notice title={String(session.user.user_metadata?.display_name ?? "Mon compte")}>
            <p>{session.user.email}</p>
            {profileError && <p className="mt-2 text-calm">Profil non synchronisé : {profileError}</p>}
            <button type="button" onClick={() => { void getSupabase()?.auth.signOut(); }} className="mt-4 min-h-12 rounded-xl border border-line px-5 font-medium">Se déconnecter</button>
          </Notice>
        )}
    </div>
  );
}
