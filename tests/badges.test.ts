import { describe, it, expect } from "vitest";
import { evaluateBadges, completedBooks } from "@/lib/badges/evaluate";

describe("badges", () => {
  it("aucun badge sans lecture", () => { expect(evaluateBadges({ readChapters: [], bestStreak: 0, completedChallenges: 0 })).toEqual([]); });
  it("première lecture", () => { expect(evaluateBadges({ readChapters: [{ book: "GEN", chapter: 1 }], bestStreak: 1, completedChallenges: 0 })).toEqual(["first_read"]); });
  it("séries de 7 et 30 jours", () => {
    const r = [{ book: "GEN", chapter: 1 }];
    expect(evaluateBadges({ readChapters: r, bestStreak: 6, completedChallenges: 0 })).not.toContain("streak_7");
    expect(evaluateBadges({ readChapters: r, bestStreak: 7, completedChallenges: 0 })).toContain("streak_7");
    expect(evaluateBadges({ readChapters: r, bestStreak: 30, completedChallenges: 0 })).toContain("streak_30");
  });
  it("livre terminé seulement si tous les chapitres sont lus", () => {
    expect(completedBooks([{ book: "OBA", chapter: 1 }])).toEqual(["OBA"]); // 1 chapitre
    expect(completedBooks([{ book: "JON", chapter: 1 }, { book: "JON", chapter: 2 }, { book: "JON", chapter: 3 }])).toEqual([]); // 4 chapitres
    expect(completedBooks([1, 2, 3, 4].map((c) => ({ book: "JON", chapter: c })))).toEqual(["JON"]);
  });
  it("défi terminé", () => { expect(evaluateBadges({ readChapters: [], bestStreak: 0, completedChallenges: 1 })).toEqual(["first_challenge"]); });
});
