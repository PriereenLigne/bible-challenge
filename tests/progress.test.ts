import { describe, it, expect } from "vitest";
import { computeProgress, currentStreak } from "@/lib/progress/compute";
import { generatePlan, addDays } from "@/lib/plans/generate";

describe("progression", () => {
  const plan = generatePlan(["PSA"], 150, "2027-01-01"); // 1 chapitre / jour
  it("distingue temps écoulé, contenu lu et retard", () => {
    const p = computeProgress(plan, [{ book: "PSA", chapter: 1 }, { book: "PSA", chapter: 2 }], "2027-01-10");
    expect(p.uniqueRead).toBe(2);
    expect(p.contentReadPercent).toBeCloseTo(1.3, 1);
    expect(p.elapsedTimePercent).toBeCloseTo(6.7, 1);
    expect(p.chaptersBehind).toBe(8);
  });
  it("ne compte pas deux fois la même lecture", () => {
    const r = { book: "PSA", chapter: 5 };
    expect(computeProgress(plan, [r, r, r], "2027-01-10").uniqueRead).toBe(1);
  });
  it("ignore les chapitres hors programme", () => {
    expect(computeProgress(plan, [{ book: "GEN", chapter: 1 }], "2027-01-10").uniqueRead).toBe(0);
  });
  it("série : la journée en cours ne casse pas la série", () => {
    expect(currentStreak(["2027-01-08", "2027-01-09"], "2027-01-10", addDays)).toBe(2);
    expect(currentStreak(["2027-01-07", "2027-01-09"], "2027-01-10", addDays)).toBe(1);
    expect(currentStreak([], "2027-01-10", addDays)).toBe(0);
  });
});
