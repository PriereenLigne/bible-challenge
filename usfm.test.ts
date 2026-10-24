import { describe, it, expect } from "vitest";
import { parseUsfm, validateBook } from "@/lib/bible/usfm";

// TEXTE DE TEST FICTIF : sert uniquement à vérifier l'analyseur. Ce n'est pas une traduction biblique.
const SAMPLE = String.raw`\id OBA Test
\h Livre de test
\mt1 Livre de test
\c 1
\s1 Titre de section
\p
\v 1 Premier verset de test\f + \fr 1.1 \ft Note à retirer.\f* suite.
\q1
\v 2 Deuxième \add verset\add* de \w test|strong="H1"\w*
\q2 sur deux lignes.
\v 3-4 Versets groupés.
\c 2
\d Titre de psaume fictif
\p
\v 1 Autre chapitre. \x - \xo 2.1 \xt Réf\x*
`;

describe("analyseur USFM", () => {
  const b = parseUsfm(SAMPLE);
  it("lit l'identifiant et les chapitres", () => { expect(b.id).toBe("OBA"); expect(b.chapters.map((c) => c.c)).toEqual([1, 2]); });
  it("retire les notes et renvois", () => { expect(b.chapters[0]?.v[0]).toEqual([1, "Premier verset de test suite."]); expect(b.chapters[1]?.v[0]?.[1]).toBe("Autre chapitre."); });
  it("garde le texte des marqueurs de caractère et les lignes de poésie", () => { expect(b.chapters[0]?.v[1]).toEqual([2, "Deuxième verset de test sur deux lignes."]); });
  it("ignore les titres de section, conserve le titre de psaume", () => { expect(b.chapters[1]?.t).toBe("Titre de psaume fictif"); expect(JSON.stringify(b)).not.toContain("Titre de section"); });
  it("verset groupé : numéroté par le premier", () => { expect(b.chapters[0]?.v[2]).toEqual([3, "Versets groupés."]); });
  it("validation : conforme / non conforme", () => {
    expect(validateBook(b, { id: "OBA", chapters: 2 })).toEqual([]);
    expect(validateBook(b, { id: "OBA", chapters: 1 }).length).toBe(1);
  });
});
