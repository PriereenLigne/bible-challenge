import { describe, it, expect } from "vitest";
import { buildTimeline, verseAt, timeForVerse, DEFAULT_FOLLOW } from "@/lib/audio/follow";

const verses: [number, string][] = [[1, "a".repeat(88)], [2, "b".repeat(188)], [3, "c".repeat(88)]];
// poids : 100, 200, 100 → débuts 0, 0.25, 0.75
const tl = buildTimeline(verses);

describe("suivi du texte pendant l'écoute", () => {
  it("répartit la durée selon la longueur des versets", () => {
    expect(tl.starts).toEqual([0, 0.25, 0.75]);
  });
  it("trouve le verset en cours, annonce et fin exclues", () => {
    // durée 44 s : annonce 3 s, fin 1 s → 40 s lues
    expect(verseAt(tl, 0, 44)).toBe(1);   // pendant l'annonce : premier verset
    expect(verseAt(tl, 12, 44)).toBe(1);  // 9/40 = 0.225
    expect(verseAt(tl, 14, 44)).toBe(2);  // 11/40 = 0.275
    expect(verseAt(tl, 34, 44)).toBe(3);
    expect(verseAt(tl, 44, 44)).toBe(3);  // fin du fichier
  });
  it("renvoie null si la durée est inconnue", () => {
    expect(verseAt(tl, 5, NaN)).toBeNull();
    expect(verseAt(tl, 5, 0)).toBeNull();
    expect(verseAt(buildTimeline([]), 5, 44)).toBeNull();
  });
  it("calcule l'instant de départ d'un verset, cohérent avec verseAt", () => {
    const t = timeForVerse(tl, 2, 44) as number;
    expect(t).toBeCloseTo(3 + 0.25 * 40 - 0.4);
    expect(verseAt(tl, t + 0.5, 44)).toBe(2);
    expect(timeForVerse(tl, 99, 44)).toBeNull();
  });
  it("n'enlève pas l'annonce sur un fichier très court", () => {
    expect(verseAt(tl, 1, 10, DEFAULT_FOLLOW)).toBe(1);
    expect(verseAt(tl, 3, 10, DEFAULT_FOLLOW)).toBe(2); // 0.3 sans annonce
  });
});
