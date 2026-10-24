import { describe, it, expect } from "vitest";
import { validatePayload, isIsoDate } from "@/lib/validation/ops";
const U = "123e4567-e89b-42d3-a456-426614174000";
const ok = { type: "reading_event" as const, challengeId: U, book: "PSA", chapter: 150, readOn: "2027-01-01" };

describe("validation des opérations", () => {
  it("accepte une lecture valide", () => { expect(validatePayload(ok)).toEqual({ ok: true }); });
  it("refuse un chapitre hors limites", () => { expect(validatePayload({ ...ok, chapter: 151 }).ok).toBe(false); expect(validatePayload({ ...ok, chapter: 0 }).ok).toBe(false); });
  it("refuse un livre inconnu", () => { expect(validatePayload({ ...ok, book: "XXX" }).ok).toBe(false); });
  it("refuse un identifiant de défi invalide", () => { expect(validatePayload({ ...ok, challengeId: "abc" }).ok).toBe(false); });
  it("refuse les dates impossibles", () => { expect(isIsoDate("2027-02-30")).toBe(false); expect(isIsoDate("2028-02-29")).toBe(true); expect(isIsoDate("2027-1-1")).toBe(false); });
  it("valide une note (chapitre ou jour de défi)", () => {
    expect(validatePayload({ type: "note_upsert", refKey: "chapter:JHN:3", body: "ok", baseVersion: 0 }).ok).toBe(true);
    expect(validatePayload({ type: "note_upsert", refKey: `day:${U}:12`, body: "ok", baseVersion: 2 }).ok).toBe(true);
    expect(validatePayload({ type: "note_upsert", refKey: "chapter:JHN:99", body: "ok", baseVersion: 0 }).ok).toBe(false);
    expect(validatePayload({ type: "note_upsert", refKey: "n'importe quoi", body: "ok", baseVersion: 0 }).ok).toBe(false);
    expect(validatePayload({ type: "note_upsert", refKey: "chapter:JHN:3", body: "x".repeat(20001), baseVersion: 0 }).ok).toBe(false);
  });
  it("valide un quiz de fin de jour", () => {
    const q = { type: "day_quiz" as const, challengeId: U, dayIndex: 4, score: 2, total: 3, doneOn: "2027-01-05" };
    expect(validatePayload(q).ok).toBe(true);
    expect(validatePayload({ ...q, score: 4 }).ok).toBe(false);
    expect(validatePayload({ ...q, dayIndex: -1 }).ok).toBe(false);
    expect(validatePayload({ ...q, doneOn: "2027-13-01" }).ok).toBe(false);
  });
});
