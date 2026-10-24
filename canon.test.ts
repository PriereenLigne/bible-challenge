import { describe, it, expect } from "vitest";
import { PROTESTANT_CANON, chaptersOf } from "@/lib/bible/canon";

describe("canon protestant", () => {
  it("contient 66 livres et 1189 chapitres", () => {
    expect(PROTESTANT_CANON).toHaveLength(66);
    expect(PROTESTANT_CANON.reduce((s, b) => s + b.chapters, 0)).toBe(1189);
  });
  it("AT = 39 livres / 929 chapitres, NT = 27 livres / 260 chapitres", () => {
    const at = PROTESTANT_CANON.filter((b) => b.testament === "AT");
    const nt = PROTESTANT_CANON.filter((b) => b.testament === "NT");
    expect([at.length, at.reduce((s, b) => s + b.chapters, 0)]).toEqual([39, 929]);
    expect([nt.length, nt.reduce((s, b) => s + b.chapters, 0)]).toEqual([27, 260]);
  });
  it("rejette un livre inconnu", () => { expect(() => chaptersOf(["XXX"])).toThrow(); });
});
