import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { PROTESTANT_CANON } from "@/lib/bible/canon";
import { BibleIndex, editDistance, highlight, normalize } from "@/lib/bible/search";

const idx = new BibleIndex();
beforeAll(() => {
  for (const b of PROTESTANT_CANON) {
    const book = JSON.parse(readFileSync(`public/bibles/lsg/${b.id}.json`, "utf8")) as { chapters: { c: number; v: [number, string][] }[] };
    for (const ch of book.chapters) for (const [v, text] of ch.v) idx.add({ book: b.id, chapter: ch.c, verse: v, text });
  }
});
const top = (q: string, n = 3) => idx.search(q, n).map((h) => `${h.book} ${h.chapter}:${h.verse}`);

describe("recherche de versets par les mots", () => {
  it("indexe toute la Bible", () => expect(idx.size).toBe(31170));
  it("normalise accents, majuscules, apostrophes", () => {
    expect(normalize("L’Éternel est mon BERGER !")).toBe("l eternel est mon berger");
    expect(normalize("cœur")).toBe("coeur");
  });
  it("distance d'édition avec inversion", () => {
    expect(editDistance("berger", "bregere", 2)).toBe(2);
    expect(editDistance("monde", "mnode", 1)).toBe(1);
  });
  it("phrases exactes ou presque", () => {
    expect(top("Car Dieu a tant aimé le monde")[0]).toBe("JHN 3:16");
    expect(top("dieu a tellement aime le monde qu il a donné son fils")[0]).toBe("JHN 3:16");
    expect(top("l'eternel est mon berger")[0]).toBe("PSA 23:1");
    expect(top("tous ont peche et sont prives de la gloire de dieu")[0]).toBe("ROM 3:23");
    expect(top("je puis tout par celui qui me fortifie")[0]).toBe("PHP 4:13");
  });
  it("fautes de frappe et mots approximatifs", () => {
    expect(top("leternel et mon bergé je ne manquerai de rien")[0]).toBe("PSA 23:1");
    expect(top("je suis le chemin la verite et la vie")[0]).toBe("JHN 14:6");
    expect(top("je suis le chemain la veriter la vi")).toContain("JHN 14:6");
    expect(top("au commencemant dieu crea les cieux et la terre")[0]).toBe("GEN 1:1");
    expect(top("toute chose concourt au bien de ceux qui aiment dieu")[0]).toBe("ROM 8:28");
    expect(top("je connais les projet que j ai formé sur vous")[0]).toBe("JER 29:11");
  });
  it("quelques mots seulement", () => {
    expect(idx.search("berger", 50).length).toBeGreaterThan(5);
    expect(idx.search("zzzzqqq").length).toBe(0);
  });
  it("surligne les mots trouvés", () => {
    expect(highlight("L’Éternel est mon berger", ["eternel", "berger"]).filter((p) => p.hit).map((p) => p.t)).toEqual(["Éternel", "berger"]);
  });
});
