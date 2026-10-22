import type { OpResult, QueuedOp, Transport } from "./types";
import { validatePayload } from "@/lib/validation/ops";

export interface SupabaseTransportConfig {
  url: string; anonKey: string; getAccessToken: () => Promise<string | null>;
  fetchFn?: typeof fetch; timeoutMs?: number;
}
const VALID: ReadonlySet<string> = new Set(["applied", "duplicate", "rejected", "conflict"]);
interface Group { rpc: string; ops: QueuedOp[]; items: Record<string, unknown>[] }

/**
 * Transport vers Supabase (API REST, sans SDK). Trois fonctions serveur : lectures, jours terminés, notes.
 * - health : appelle réellement le service d'authentification.
 * - Opération invalide : « rejected » sans envoi. Groupe en échec : ses opérations restent en file.
 * - opId doit être un UUID (crypto.randomUUID()).
 */
export function createSupabaseTransport(cfg: SupabaseTransportConfig): Transport {
  const f = cfg.fetchFn ?? fetch;
  const base = cfg.url.replace(/\/$/, "");
  const withTimeout = (init: RequestInit): RequestInit => ({ ...init, signal: AbortSignal.timeout(cfg.timeoutMs ?? 8000) });

  return {
    async health() {
      try { return (await f(`${base}/auth/v1/health`, withTimeout({ headers: { apikey: cfg.anonKey } }))).ok; }
      catch { return false; }
    },

    async send(ops: QueuedOp[]) {
      const out: Record<string, OpResult> = {};
      const readings: Group = { rpc: "apply_reading_events", ops: [], items: [] };
      const quizzes: Group = { rpc: "apply_day_completions", ops: [], items: [] };
      const notes: Group = { rpc: "apply_notes", ops: [], items: [] };
      for (const o of ops) {
        if (!validatePayload(o.payload).ok) { out[o.opId] = "rejected"; continue; }
        const p = o.payload;
        if (p.type === "reading_event") { readings.ops.push(o); readings.items.push({ op_id: o.opId, challenge_id: p.challengeId, book: p.book, chapter: p.chapter, read_on: p.readOn }); }
        else if (p.type === "day_quiz") { quizzes.ops.push(o); quizzes.items.push({ op_id: o.opId, challenge_id: p.challengeId, day_index: p.dayIndex, score: p.score, total: p.total, done_on: p.doneOn }); }
        else { notes.ops.push(o); notes.items.push({ op_id: o.opId, ref_key: p.refKey, body: p.body, base_version: p.baseVersion }); }
      }
      const groups = [readings, quizzes, notes].filter((g) => g.ops.length > 0);
      if (groups.length === 0) return out;

      const token = await cfg.getAccessToken();
      if (!token) throw new Error("Session expirée : reconnexion nécessaire"); // tout reste en file

      let succeeded = 0; let lastError: Error | null = null;
      for (const g of groups) {
        try {
          const r = await f(`${base}/rest/v1/rpc/${g.rpc}`, withTimeout({
            method: "POST",
            headers: { apikey: cfg.anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ ops: g.items }),
          }));
          if (!r.ok) throw new Error(`Serveur : HTTP ${r.status}`);
          const data = (await r.json()) as Record<string, string>;
          for (const o of g.ops) { const s = data[o.opId]; if (s && VALID.has(s)) out[o.opId] = s as OpResult; }
          succeeded++;
        } catch (e) { lastError = e as Error; } // ce groupe reste en file ; les autres continuent
      }
      if (succeeded === 0 && lastError) throw lastError;
      return out;
    },
  };
}
