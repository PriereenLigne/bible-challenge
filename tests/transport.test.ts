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
  it("route quiz et notes vers leurs fonctions serveur", async () => {
    const urls: string[] = [];
    const t = createSupabaseTransport(cfg((async (url: string) => { urls.push(url); return json({ [OP1]: "applied", [OP2]: "applied", "cccccccc-cccc-4ccc-8ccc-cccccccccccc": "applied" }); }) as unknown as typeof fetch));
    const quiz: QueuedOp = { opId: OP2, createdAt: 0, attempts: 0, nextAttemptAt: 0, payload: { type: "day_quiz", challengeId: U, dayIndex: 0, score: 3, total: 3, doneOn: "2027-01-01" } };
    const note: QueuedOp = { opId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", createdAt: 0, attempts: 0, nextAttemptAt: 0, payload: { type: "note_upsert", refKey: "chapter:PSA:23", body: "Ma note", baseVersion: 0 } };
    const r = await t.send([mk(OP1, 1), quiz, note]);
    expect(Object.keys(r)).toHaveLength(3);
    expect(urls.map((u) => u.split("/").pop())).toEqual(["apply_reading_events", "apply_day_completions", "apply_notes"]);
  });
  it("route les marques de versets vers apply_verse_marks", async () => {
    let seen = "";
    const t = createSupabaseTransport(cfg((async (url: string, init: RequestInit) => { seen = url + "|" + (init.body as string); return json({ [OP1]: "applied" }); }) as unknown as typeof fetch));
    const mark: QueuedOp = { opId: OP1, createdAt: 0, attempts: 0, nextAttemptAt: 0, payload: { type: "verse_mark", book: "JHN", chapter: 3, verse: 16, favorite: true, color: "bleu", ts: 1700000000000 } };
    expect(await t.send([mark])).toEqual({ [OP1]: "applied" });
    expect(seen.split("|")[0]?.endsWith("apply_verse_marks")).toBe(true);
    expect(JSON.parse(seen.split("|")[1] as string).ops[0]).toMatchObject({ book: "JHN", verse: 16, color: "bleu", ts: 1700000000000 });
  });
  it("un groupe en échec n'empêche pas les autres ; ses opérations restent en file", async () => {
    const t = createSupabaseTransport(cfg((async (url: string) => (url.endsWith("apply_notes") ? json({}, 500) : json({ [OP1]: "applied" }))) as unknown as typeof fetch));
    const note: QueuedOp = { opId: OP2, createdAt: 0, attempts: 0, nextAttemptAt: 0, payload: { type: "note_upsert", refKey: "chapter:PSA:23", body: "x", baseVersion: 0 } };
    const r = await t.send([mk(OP1, 1), note]);
    expect(r).toEqual({ [OP1]: "applied" }); // la note est absente : elle sera retentée
  });
  it("statut inconnu ou absent : l'opération reste en file", async () => {
    const t = createSupabaseTransport(cfg((async () => json({ [OP1]: "bizarre" })) as typeof fetch));
    expect(await t.send([mk(OP1, 1)])).toEqual({});
  });
});
