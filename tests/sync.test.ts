import { describe, it, expect } from "vitest";
import { enqueue, syncOnce, backoff } from "@/lib/offline/sync";
import type { OpStore, QueuedOp, Transport, OpResult } from "@/lib/offline/types";

const memStore = (): OpStore & { m: Map<string, QueuedOp> } => {
  const m = new Map<string, QueuedOp>();
  return { m, put: async (o) => { m.set(o.opId, o); }, getAll: async () => [...m.values()], remove: async (id) => { m.delete(id); } };
};
let n = 0; const id = () => `op-${++n}`;
const reading = (chapter: number) => ({ type: "reading_event" as const, challengeId: "c1", book: "PSA", chapter, readOn: "2027-01-01" });

function server() {
  const seen = new Set<string>(); const readKeys = new Set<string>();
  let up = true, healthy = true, failSend = false;
  const t: Transport = {
    health: async () => { if (!up) throw new Error("réseau"); return healthy; },
    send: async (ops) => {
      if (failSend) throw new Error("500");
      const out: Record<string, OpResult> = {};
      for (const o of ops) {
        if (seen.has(o.opId)) { out[o.opId] = "duplicate"; continue; }
        seen.add(o.opId);
        if (o.payload.type === "reading_event") {
          const k = `${o.payload.book}:${o.payload.chapter}`;
          out[o.opId] = readKeys.has(k) ? "duplicate" : (readKeys.add(k), "applied");
        } else out[o.opId] = "applied";
      }
      return out;
    },
  };
  return { t, readKeys, set: (s: { up?: boolean; healthy?: boolean; failSend?: boolean }) => { up = s.up ?? up; healthy = s.healthy ?? healthy; failSend = s.failSend ?? failSend; } };
}

describe("synchronisation", () => {
  it("plusieurs jours validés hors connexion, puis retour du réseau", async () => {
    const st = memStore(), sv = server();
    sv.set({ up: false });
    for (let c = 1; c <= 3; c++) await enqueue(st, reading(c), 1000 + c, id);
    expect((await syncOnce(st, sv.t, 2000)).status).toBe("server_unreachable");
    expect(st.m.size).toBe(3); // rien perdu
    sv.set({ up: true });
    const r = await syncOnce(st, sv.t, 3000);
    expect(r).toMatchObject({ status: "done", applied: 3, pending: 0 });
  });
  it("réseau présent mais serveur indisponible : conserve tout", async () => {
    const st = memStore(), sv = server();
    sv.set({ healthy: false });
    await enqueue(st, reading(1), 0, id);
    expect((await syncOnce(st, sv.t, 10)).status).toBe("server_unreachable");
    expect(st.m.size).toBe(1);
  });
  it("échec d'envoi : replanifie avec attente croissante, ne supprime rien", async () => {
    const st = memStore(), sv = server();
    sv.set({ failSend: true });
    const op = await enqueue(st, reading(1), 0, id);
    await syncOnce(st, sv.t, 10);
    const after = st.m.get(op.opId)!;
    expect(after.attempts).toBe(1);
    expect(after.nextAttemptAt).toBe(10 + backoff(1));
    expect((await syncOnce(st, sv.t, 11)).pending).toBe(1); // pas encore dû
  });
  it("même opération envoyée deux fois : comptée une seule fois", async () => {
    const st = memStore(), sv = server();
    const op = await enqueue(st, reading(7), 0, id);
    await syncOnce(st, sv.t, 1);
    await st.put(op); // simule une réponse perdue : l'appareil renvoie
    const r = await syncOnce(st, sv.t, 2);
    expect(r.duplicates).toBe(1);
    expect(sv.readKeys.size).toBe(1);
  });
  it("deux appareils lisant le même chapitre : une seule lecture comptée", async () => {
    const a = memStore(), b = memStore(), sv = server();
    await enqueue(a, reading(9), 0, id); await enqueue(b, reading(9), 0, id);
    await syncOnce(a, sv.t, 1); const rb = await syncOnce(b, sv.t, 1);
    expect(rb.duplicates).toBe(1);
    expect(sv.readKeys.size).toBe(1);
  });
  it("réponse partielle : l'opération sans réponse reste en file", async () => {
    const st = memStore();
    const t: Transport = { health: async () => true, send: async () => ({}) };
    await enqueue(st, reading(1), 0, id);
    expect((await syncOnce(st, t, 1)).pending).toBe(1);
  });
});
