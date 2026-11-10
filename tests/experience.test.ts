import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { DAILY_VERSES, verseOfDay, refLabel } from "@/lib/verses/daily";
import { celebrate, encouragement, greeting } from "@/lib/encourage/messages";
import { fitFontSize, wrapText } from "@/lib/share/verse-image";

describe("verset du jour", () => {
  it("toutes les références existent dans la Louis Segond installée", () => {
    for (const r of DAILY_VERSES) {
      const book = JSON.parse(readFileSync(`public/bibles/lsg/${r.book}.json`, "utf8")) as { chapters: { c: number; v: [number, string][] }[] };
      const ch = book.chapters.find((c) => c.c === r.chapter);
      expect(ch, `${r.book} ${r.chapter}`).toBeTruthy();
      for (let v = r.verse; v <= (r.to ?? r.verse); v++) expect(ch!.v.some(([n]) => n === v), `${r.book} ${r.chapter}:${v}`).toBe(true);
    }
  });
  it("pas de doublon", () => {
    const keys = DAILY_VERSES.map((r) => `${r.book}${r.chapter}:${r.verse}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("même verset toute la journée, verset différent le lendemain", () => {
    expect(verseOfDay("2026-11-10")).toEqual(verseOfDay("2026-11-10"));
    expect(verseOfDay("2026-11-10")).not.toEqual(verseOfDay("2026-11-11"));
  });
  it("parcourt toute la liste sans en sauter", () => {
    const seen = new Set<string>();
    const start = Date.UTC(2026, 0, 1);
    for (let i = 0; i < DAILY_VERSES.length; i++) {
      const d = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
      const r = verseOfDay(d); seen.add(`${r.book}${r.chapter}:${r.verse}`);
    }
    expect(seen.size).toBe(DAILY_VERSES.length);
  });
  it("libellé de référence", () => {
    expect(refLabel({ book: "PRO", chapter: 3, verse: 5, to: 6 }, "Proverbes")).toBe("Proverbes 3:5-6");
    expect(refLabel({ book: "JHN", chapter: 3, verse: 16 }, "Jean")).toBe("Jean 3:16");
  });
});

describe("messages d'accompagnement", () => {
  it("salutation selon l'heure", () => {
    expect(greeting(8)).toBe("Bonjour");
    expect(greeting(17)).toBe("Bonjour");
    expect(greeting(19)).toBe("Bonsoir");
    expect(greeting(2)).toBe("Bonsoir");
  });
  it("le retard est présenté avec bienveillance", () => {
    expect(encouragement({ streak: 0, chaptersBehind: 25, todayDone: false, daysDone: 3 })).toMatch(/pas grave/);
    expect(encouragement({ streak: 0, chaptersBehind: 1, todayDone: false, daysDone: 3 })).toMatch(/Encore 1 chapitre pour/);
    expect(encouragement({ streak: 4, chaptersBehind: 0, todayDone: true, daysDone: 4 })).toMatch(/4 jours de suite/);
    expect(encouragement({ streak: 0, chaptersBehind: 0, todayDone: false, daysDone: 0 })).toMatch(/première lecture/);
  });
  it("célébrations : fin du défi, paliers de série, mi-parcours, jour ordinaire", () => {
    expect(celebrate(30, 30, 5).title).toBe("Défi terminé !");
    expect(celebrate(7, 30, 7)).toMatchObject({ title: "7 jours de suite !", big: true });
    expect(celebrate(15, 30, 2)).toMatchObject({ title: "Mi-parcours !", big: true });
    expect(celebrate(4, 30, 2)).toMatchObject({ title: "Jour 4 terminé", big: false });
  });
});

describe("image de partage", () => {
  const measure = (s: string) => s.length * 10; // 10 px par caractère
  it("découpe le texte sans dépasser la largeur", () => {
    const lines = wrapText("Car Dieu a tant aimé le monde qu’il a donné son Fils unique", 200, measure);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(measure(l)).toBeLessThanOrEqual(200);
    expect(lines.join(" ")).toBe("Car Dieu a tant aimé le monde qu’il a donné son Fils unique");
  });
  it("un mot trop long reste seul sur sa ligne au lieu de disparaître", () => {
    expect(wrapText("a anticonstitutionnellement b", 50, measure)).toEqual(["a", "anticonstitutionnellement", "b"]);
  });
  it("réduit la police pour un long verset", () => {
    const short = fitFontSize("Jésus pleura.", 860, 700, (s, px) => s.length * px * 0.5);
    const long = fitFontSize("x ".repeat(400), 860, 700, (s, px) => s.length * px * 0.5);
    expect(short.size).toBe(64);
    expect(long.size).toBeLessThan(64);
    expect(long.size).toBeGreaterThanOrEqual(30);
  });
});
