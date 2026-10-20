import { describe, it, expect } from "vitest";
import { createSupabaseTransport } from "@/lib/offline/supabase-transport";
import type { QueuedOp } from "@/lib/offline/types";

const U = "123e4567-e89b-42d3-a456-426614174000";
const OP1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OP2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const mk = (opId: string, chapter: number, book = "PSA"): QueuedOp => ({ opId, createdAt: 0, attempts: 0, nextAttemptAt: 0, payload: { type: "reading_event", challengeId: U, book, chapter, readOn: "2027-01-01" } });
const cfg = (fetchFn: typeof fetch, token: string | null = "jwt") => ({ url: "https://x.supabase.co/", anonKey: "anon", getAccessToken: async () => token, fetchFn });
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });

describe("transport Supabase", () => {
  it("health = false si le serveur est injoignable", async () => {
    const t = createSupabaseTransport(cfg((async () => { throw new Error("réseau"); }) as typeof fetch));
    expect(await t.health()).toBe(false);
  });
  it("health = false sur HTTP 500, true sur 200", async () => {
    expect(await createSupabaseTransport(cfg((async () => json({}, 500)) as typeof fetch)).health()).toBe(false);
    expect(await createSupabaseTransport(cfg((async () => json({}, 200)) as typeof fetch)).health()).toBe(true);
  });
  it("envoie les lectures au RPC avec le jeton, sans clé service", async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    const t = createSupabaseTransport(cfg((async (url: string, init: RequestInit) => { seen = { url, init }; return json({ [OP1]: "applied", [OP2]: "duplicate" }); }) as unknown as typeof fetch));
    const r = await t.send([mk(OP1, 1), mk(OP2, 2)]);
    expect(r).toEqual({ [OP1]: "applied", [OP2]: "duplicate" });
    expect(seen!.url).toBe("https://x.supabase.co/rest/v1/rpc/apply_reading_events");
    expect((seen!.init.headers as Record<string, string>).Authorization).toBe("Bearer jwt");
    expect(JSON.parse(seen!.init.body as string).ops[0].op_id).toBe(OP1);
  });
  it("opération invalide : rejetée localement, jamais envoyée", async () => {
    let called = false;
    const t = createSupabaseTransport(cfg((async () => { called = true; return json({}); }) as typeof fetch));
    const r = await t.send([mk(OP1, 999)]);
    expect(r).toEqual({ [OP1]: "rejected" });
    expect(called).toBe(false);
  });
  it("erreur HTTP ou session expirée : lève une erreur (les ops restent en file)", async () => {
    await expect(createSupabaseTransport(cfg((async () => json({}, 500)) as typeof fetch)).send([mk(OP1, 1)])).rejects.toThrow();
    await expect(createSupabaseTransport(cfg((async () => json({})) as typeof fetch, null)).send([mk(OP1, 1)])).rejects.toThrow();
  });
  it("statut inconnu ou absent : l'opération reste en file", async () => {
    const t = createSupabaseTransport(cfg((async () => json({ [OP1]: "bizarre" })) as typeof fetch));
    expect(await t.send([mk(OP1, 1)])).toEqual({});
  });
});
