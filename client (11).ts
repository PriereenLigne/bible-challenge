import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Lit la configuration publique. Les clés secrètes (service_role) n'ont JAMAIS leur place ici. */
export function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

let client: SupabaseClient | null = null;
/** Retourne null si la configuration est absente : l'interface l'explique au lieu de planter. */
export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  const cfg = supabaseConfig();
  if (!cfg) return null;
  client = createClient(cfg.url, cfg.key, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}
