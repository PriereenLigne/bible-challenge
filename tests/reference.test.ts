import { describe, it, expect } from "vitest";
import { findBook, formatReference, parseReference } from "@/lib/bible/reference";

const ref = (book: string, chapter: number, verse: number | null = null, verseEnd: number | null = null) => ({ book, chapter, verse, verseEnd });

describe("recherche d'un verset par sa référence", () => {
  it("toutes les façons d'écrire Jean 3:16", () => {
    for (const s of ["Jean 3:16", "Jean 3 16", "Jean3 16", "Jean3:16", "Jn3:16", "jn 3.16", "Jean 3,16", "JEAN 3 : 16", "  jean  3  16 ", "Jn. 3:16", "JHN 3:16", "jea 3:16"]) {
      expect(parseReference(s), s).toEqual(ref("JHN", 3, 16));
    }
  });
  it("livres avec un chiffre", () => {
    expect(parseReference("1 Jean 4:8")).toEqual(ref("1JN", 4, 8));
    expect(parseReference("1Jn4:8")).toEqual(ref("1JN", 4, 8));
    expect(parseReference("1jn 4 8")).toEqual(ref("1JN", 4, 8));
    expect(parseReference("1 Co 13")).toEqual(ref("1CO", 13));
    expect(parseReference("1Cor13:4")).toEqual(ref("1CO", 13, 4));
    expect(parseReference("2 Rois 5")).toEqual(ref("2KI", 5));
    expect(parseReference("II Timothée 3:16")).toEqual(ref("2TI", 3, 16));
    expect(parseReference("1er Pierre 5:7")).toEqual(ref("1PE", 5, 7));
    expect(parseReference("premier samuel 17")).toEqual(ref("1SA", 17));
  });
  it("accents, abréviations et noms en plusieurs mots", () => {
    expect(parseReference("genese 1:1")).toEqual(ref("GEN", 1, 1));
    expect(parseReference("Gn 1 1")).toEqual(ref("GEN", 1, 1));
    expect(parseReference("Ps 23")).toEqual(ref("PSA", 23));
    expect(parseReference("psaume 119:105")).toEqual(ref("PSA", 119, 105));
    expect(parseReference("Esaïe 53:5")).toEqual(ref("ISA", 53, 5));
    expect(parseReference("Isaie 40 31")).toEqual(ref("ISA", 40, 31));
    expect(parseReference("Mt 5:3")).toEqual(ref("MAT", 5, 3));
    expect(parseReference("Rm 8 28")).toEqual(ref("ROM", 8, 28));
    expect(parseReference("Ph 4:13")).toEqual(ref("PHP", 4, 13));
    expect(parseReference("Cantique des cantiques 2:4")).toEqual(ref("SNG", 2, 4));
    expect(parseReference("Apoc 21")).toEqual(ref("REV", 21));
    expect(parseReference("Proverbes 3:5-6")).toEqual(ref("PRO", 3, 5, 6));
    expect(parseReference("Jérémie 29.11")).toEqual(ref("JER", 29, 11));
  });
  it("livre seul = chapitre 1 ; livre d'un seul chapitre = verset", () => {
    expect(parseReference("Jean")).toEqual(ref("JHN", 1));
    expect(parseReference("Jude 3")).toEqual(ref("JUD", 1, 3));
    expect(parseReference("Philémon 1:6")).toEqual(ref("PHM", 1, 6));
  });
  it("refuse ce qui n'est pas une référence valide", () => {
    for (const s of ["", "3:16", "Jean 22", "Jean 0", "xyz 3:16", "Psaumes 151", "j 3:16"]) expect(parseReference(s), s).toBeNull();
  });
  it("début de nom sans ambiguïté seulement", () => {
    expect(findBook("lamen")).toBe("LAM");
    expect(findBook("thessal")).toBeNull();
  });
  it("affichage", () => {
    expect(formatReference(ref("JHN", 3, 16))).toBe("Jean 3:16");
    expect(formatReference(ref("PSA", 23))).toBe("Psaumes 23");
    expect(formatReference(ref("1JN", 4, 7, 8))).toBe("1 Jean 4:7-8");
  });
});
