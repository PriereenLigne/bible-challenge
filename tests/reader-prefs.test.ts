import { describe, it, expect } from "vitest";
import { DEFAULT_PREFS, fold, normalizePrefs, swipeDirection } from "@/lib/reader/prefs";

describe("préférences de lecture", () => {
  it("valeurs par défaut si rien n'est enregistré", () => {
    expect(normalizePrefs(undefined)).toEqual(DEFAULT_PREFS);
  });
  it("reprend la taille de l'ancienne version de l'application", () => {
    expect(normalizePrefs(undefined, 23).size).toBe(23);
  });
  it("écarte les valeurs invalides et borne la taille", () => {
    expect(normalizePrefs({ size: 99, leading: "énorme", font: 3, numbers: "oui" })).toEqual({ ...DEFAULT_PREFS, size: 30 });
    expect(normalizePrefs({ size: 2 }).size).toBe(15);
  });
  it("garde des réglages valides", () => {
    const p = { size: 22, leading: "airy", font: "sans", numbers: false } as const;
    expect(normalizePrefs(p)).toEqual(p);
  });
});

describe("recherche de livre", () => {
  it("ignore accents, majuscules et espaces", () => {
    expect(fold("Genèse")).toBe(fold("genese"));
    expect(fold("1 Corinthiens").includes(fold("1cor"))).toBe(true);
    expect(fold("Ésaïe")).toBe("esaie");
  });
});

describe("balayage pour changer de chapitre", () => {
  it("gauche = suivant, droite = précédent", () => {
    expect(swipeDirection(-120, 10, 300)).toBe(1);
    expect(swipeDirection(120, -10, 300)).toBe(-1);
  });
  it("ignore les gestes courts, verticaux ou lents", () => {
    expect(swipeDirection(-40, 0, 200)).toBe(0);
    expect(swipeDirection(-120, 80, 300)).toBe(0);
    expect(swipeDirection(-120, 10, 1500)).toBe(0);
  });
});
