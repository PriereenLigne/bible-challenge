"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";

interface AuthState { configured: boolean; loading: boolean; session: Session | null; profileError: string | null }
const Ctx = createContext<AuthState>({ configured: false, loading: true, session: null, profileError: null });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ configured: false, loading: true, session: null, profileError: null });

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setState({ configured: false, loading: false, session: null, profileError: null }); return; }
    let active = true;
    const apply = (session: Session | null) => { if (active) setState((s) => ({ ...s, configured: true, loading: false, session })); };
    sb.auth.getSession().then(({ data }) => apply(data.session)).catch((e) => { console.error("Lecture de session impossible :", e); apply(null); });
    const { data } = sb.auth.onAuthStateChange((_event, session) => apply(session));
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  // Garantit l'existence de la ligne profil (clé étrangère des défis). N'écrase jamais un nom existant.
  const uid = state.session?.user.id;
  const meta = state.session?.user;
  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !uid || !meta || !navigator.onLine) return;
    const raw = (meta.user_metadata?.display_name as string | undefined) ?? meta.email?.split("@")[0] ?? "Lecteur";
    const display_name = raw.trim().slice(0, 60) || "Lecteur";
    sb.from("profiles").upsert({ id: uid, display_name }, { onConflict: "id", ignoreDuplicates: true }).then(({ error }) => {
      if (error) { console.error("Profil non créé :", error.message); setState((s) => ({ ...s, profileError: error.message })); }
    });
  }, [uid, meta]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}
