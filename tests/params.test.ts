import { describe, it, expect } from "vitest";
import { parseReaderParams, readerHref } from "@/lib/bible/params";
const U = "123e4567-e89b-42d3-a456-426614174000";

describe("paramètres du lecteur", () => {
  it("lit livre, chapitre et défi", () => { expect(parseReaderParams(`?b=MAT&c=5&d=${U}`)).toEqual({ book: "MAT", chapter: 5, challengeId: U }); });
  it("défi absent ou invalide : ignoré", () => {
    expect(parseReaderParams("?b=PSA&c=150")?.challengeId).toBe(null);
    expect(parseReaderParams("?b=PSA&c=1&d=pirate")?.challengeId).toBe(null);
  });
  it("refuse livre inconnu, chapitre hors limites ou non numérique", () => {
    expect(parseReaderParams("?b=XXX&c=1")).toBe(null);
    expect(parseReaderParams("?b=PSA&c=151")).toBe(null);
    expect(parseReaderParams("?b=PSA&c=abc")).toBe(null);
    expect(parseReaderParams("")).toBe(null);
  });
  it("construit le lien", () => { expect(readerHref("MAT", 1, U)).toBe(`/lire?b=MAT&c=1&d=${U}`); expect(readerHref("MAT", 1)).toBe("/lire?b=MAT&c=1"); });
});
