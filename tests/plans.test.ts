import { describe, it, expect } from "vitest";
import { generatePlan, redistributeRemaining, addDays } from "@/lib/plans/generate";
import { SCOPES, DURATIONS } from "@/lib/plans/scopes";
import { chapterKey } from "@/lib/bible/canon";

const flat = (p: ReturnType<typeof generatePlan>) =>
  p.days.flatMap((d) => d.passages.flatMap((x) => Array.from({ length: x.to - x.from + 1 }, (_, i) => `${x.book}:${x.from + i}`)));

describe("génération de calendrier", () => {
  it.each(DURATIONS.map((d) => [d.label, d.days] as const))("Bible entière en %s : chaque chapitre exactement une fois", (_l, days) => {
    const plan = generatePlan(SCOPES.full.books, days, "2027-01-01");
    const keys = flat(plan);
    expect(plan.days).toHaveLength(days);
    expect(keys).toHaveLength(1189);
    expect(new Set(keys).size).toBe(1189);
  });
  it("respecte l'ordre canonique", () => {
    const keys = flat(generatePlan(SCOPES.nt.books, 90, "2027-01-01"));
    expect(keys[0]).toBe("MAT:1");
    expect(keys[keys.length - 1]).toBe("REV:22");
  });
  it("est déterministe", () => {
    expect(generatePlan(SCOPES.gospels.books, 30, "2027-03-01")).toEqual(generatePlan(SCOPES.gospels.books, 30, "2027-03-01"));
  });
  it("Évangiles en 30 jours : 89 chapitres couverts", () => {
    expect(flat(generatePlan(SCOPES.gospels.books, 30, "2027-03-01"))).toHaveLength(89);
  });
  it("jours de repos quand il y a plus de jours que de chapitres", () => {
    const plan = generatePlan(SCOPES.psalms.books, 365, "2027-01-01");
    expect(plan.days.filter((d) => d.rest).length).toBe(365 - 150);
    expect(flat(plan)).toHaveLength(150);
  });
  it("gère les dates (année bissextile, changement d'année)", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-12-31", 1)).toBe("2028-01-01");
    expect(generatePlan(["PSA"], 3, "2028-02-28").days.map((d) => d.date)).toEqual(["2028-02-28", "2028-02-29", "2028-03-01"]);
  });
});

describe("rattrapage", () => {
  it("redistribue uniquement les chapitres non lus, sans doublon", () => {
    const read = new Set(["MAT:1", "MAT:2", "MRK:1"].map((k) => k));
    const plan = redistributeRemaining(SCOPES.gospels.books, read, 10, "2027-04-01");
    const keys = flat(plan);
    expect(keys).toHaveLength(89 - 3);
    for (const r of read) expect(keys).not.toContain(r);
    expect(new Set(keys).size).toBe(keys.length);
    expect(chapterKey({ book: "MAT", chapter: 3 })).toBe(keys[0]);
  });
});
