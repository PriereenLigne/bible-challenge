import type { OpResult, QueuedOp, Transport } from "./types";
import { validatePayload } from "@/lib/validation/ops";

export interface SupabaseTransportConfig {
  url: string;
  anonKey: string;
  getAccessToken: () => Promise<string | null>;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

const VALID: ReadonlySet<string> = new Set(["applied", "duplicate", "rejected", "conflict"]);

/**
 * Transport vers Supabase via l'API REST (aucun SDK requis).
 * - health : appelle réellement le service d'authentification de Supabase.
 * - send : les lectures passent par la fonction SQL apply_reading_events (RLS + idempotence).
 * - Les opérations invalides sont déclarées « rejected » sans être envoyées.
 * - Les notes ne sont pas encore prises en charge : elles sont omises de la réponse,
 *   donc elles restent en file (rien n'est perdu).
 * Contrainte : opId doit être un UUID (utiliser crypto.randomUUID()).
 */
export function createSupabaseTransport(cfg: SupabaseTransportConfig): Transport {
  const f = cfg.fetchFn ?? fetch;
  const base = cfg.url.replace(/\/$/, "");
  const withTimeout = (init: RequestInit): RequestInit => ({ ...init, signal: AbortSignal.timeout(cfg.timeoutMs ?? 8000) });

  return {
    async health() {
      try {
        const r = await f(`${base}/auth/v1/health`, withTimeout({ headers: { apikey: cfg.anonKey } }));
        return r.ok;
      } catch { return false; }
    },

    async send(ops: QueuedOp[]) {
      const out: Record<string, OpResult> = {};
      const toSend: QueuedOp[] = [];
      for (const o of ops) {
        const v = validatePayload(o.payload);
        if (!v.ok) { out[o.opId] = "rejected"; continue; }
        if (o.payload.type === "reading_event") toSend.push(o);
      }
      if (toSend.length === 0) return out;

      const token = await cfg.getAccessToken();
      if (!token) throw new Error("Session expirée : reconnexion nécessaire"); // les ops restent en file

      const body = toSend.map((o) => {
        const p = o.payload as Extract<QueuedOp["payload"], { type: "reading_event" }>;
        return { op_id: o.opId, challenge_id: p.challengeId, book: p.book, chapter: p.chapter, read_on: p.readOn };
      });
      const r = await f(`${base}/rest/v1/rpc/apply_reading_events`, withTimeout({
        method: "POST",
        headers: { apikey: cfg.anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ops: body }),
      }));
      if (!r.ok) throw new Error(`Serveur : HTTP ${r.status}`);
      const data = (await r.json()) as Record<string, string>;
      for (const o of toSend) { const s = data[o.opId]; if (s && VALID.has(s)) out[o.opId] = s as OpResult; }
      return out;
    },
  };
}
