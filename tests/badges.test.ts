import { describe, it, expect } from "vitest";
import { evaluateBadges, completedBooks, BADGES, type BadgeInput } from "@/lib/badges/evaluate";

const none: BadgeInput = { distinctChapters: 0, bestStreak: 0, booksCompleted: 0, completedChallenges: 0, notesCount: 0, favoritesCount: 0, teamsCount: 0, perfectQuizzes: 0 };
const earned = (i: Partial<BadgeInput>) => evaluateBadges({ ...none, ...i }).filter((b) => b.earned).map((b) => b.id);

describe("badges", () => {
  it("aucun badge sans activité", () => { expect(earned({})).toEqual([]); });
  it("chaque badge exige sa condition réelle", () => {
    expect(earned({ distinctChapters: 1 })).toEqual(["first_read"]);
    expect(earned({ bestStreak: 6 })).toEqual([]);
    expect(earned({ bestStreak: 7 })).toEqual(["streak_7"]);
    expect(earned({ bestStreak: 30 })).toEqual(["streak_7", "streak_30"]);
    expect(earned({ notesCount: 1 })).toEqual(["first_note"]);
    expect(earned({ favoritesCount: 1 })).toEqual(["first_favorite"]);
    expect(earned({ teamsCount: 1 })).toEqual(["first_team"]);
    expect(earned({ perfectQuizzes: 1 })).toEqual(["first_perfect_quiz"]);
    expect(earned({ completedChallenges: 1 })).toEqual(["first_challenge"]);
  });
  it("expose la progression restante (plafonnée à la cible)", () => {
    const s = evaluateBadges({ ...none, bestStreak: 5 }).find((b) => b.id === "streak_7")!;
    expect([s.value, s.target, s.earned]).toEqual([5, 7, false]);
    expect(evaluateBadges({ ...none, bestStreak: 99 }).find((b) => b.id === "streak_30")?.value).toBe(30);
  });
  it("le catalogue est complet et sans doublon", () => { expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length); });
  it("livre terminé seulement si tous les chapitres sont lus", () => {
    expect(completedBooks([{ book: "OBA", chapter: 1 }])).toEqual(["OBA"]);
    expect(completedBooks([1, 2, 3].map((c) => ({ book: "JON", chapter: c })))).toEqual([]);
    expect(completedBooks([1, 2, 3, 4].map((c) => ({ book: "JON", chapter: c })))).toEqual(["JON"]);
  });
});
