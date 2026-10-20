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
  it("valide une note", () => {
    expect(validatePayload({ type: "note_upsert", noteId: U, body: "ok", baseVersion: 0 }).ok).toBe(true);
    expect(validatePayload({ type: "note_upsert", noteId: U, body: "x".repeat(20001), baseVersion: 0 }).ok).toBe(false);
  });
});
