import { describe, it, expect } from "vitest";
import { generateQuiz, passed, type QuizPassage, type Rng } from "@/lib/quiz/generate";
import { chaptersOfDay, dayStatus } from "@/lib/challenges/day-status";
import { reconcileNote, MERGE_SEPARATOR, type LocalNote } from "@/lib/notes/reconcile";

// TEXTE FICTIF généré pour les tests : ce n'est pas un texte biblique.
const WORDS = ["lumière", "montagne", "rivière", "silence", "chemin", "étoile", "jardin", "maison", "tempête", "sagesse", "colline", "horizon", "village", "cantique", "moisson", "fontaine"];
const sentence = (seed: number) => `Le voyageur ${WORDS[seed % 16]} marchait vers la ${WORDS[(seed * 3 + 1) % 16]} et gardait ${WORDS[(seed * 5 + 2) % 16]} dans son cœur.`;
const passage = (book: string, chapter: number, label: string): QuizPassage => ({ book, chapter, label, verses: Array.from({ length: 12 }, (_, i) => [i + 1, sentence(i + chapter * 7)] as [number, string]) });
const PASSAGES = [passage("TST", 1, "Test 1"), passage("TST", 2, "Test 2")];
const seeded = (seed: number): Rng => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

describe("quiz du jour", () => {
  it("produit 3 questions valides, pour de nombreuses graines", () => {
    for (let s = 1; s <= 200; s++) {
      const qs = generateQuiz(PASSAGES, seeded(s));
      expect(qs).toHaveLength(3);
      for (const q of qs) {
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(new Set(q.options).size).toBe(q.options.length); // pas de doublon
        expect(q.answer).toBeGreaterThanOrEqual(0); expect(q.answer).toBeLessThan(q.options.length);
      }
    }
  });
  it("la bonne réponse est réellement correcte (mot manquant, passage, verset suivant)", () => {
    const all = new Map<string, string>(); PASSAGES.forEach((p) => p.verses.forEach(([n, t]) => all.set(`${p.label}:${n}`, t)));
    for (let s = 1; s <= 200; s++) for (const q of generateQuiz(PASSAGES, seeded(s))) {
      const orig = all.get(q.ref) as string;
      if (q.kind === "missing_word") expect(q.context.replace("_____", q.options[q.answer] as string)).toBe(orig);
      if (q.kind === "which_chapter") expect(q.ref.startsWith(q.options[q.answer] as string)).toBe(true);
      if (q.kind === "next_verse") { const [lab, n] = [q.ref.slice(0, q.ref.lastIndexOf(":")), Number(q.ref.slice(q.ref.lastIndexOf(":") + 1))]; expect(all.get(`${lab}:${n + 1}`)?.startsWith((q.options[q.answer] as string).replace("…", ""))).toBe(true); }
    }
  });
  it("même graine = mêmes questions ; graines différentes = questions différentes", () => {
    expect(generateQuiz(PASSAGES, seeded(7))).toEqual(generateQuiz(PASSAGES, seeded(7)));
    const sigs = new Set(Array.from({ length: 30 }, (_, i) => JSON.stringify(generateQuiz(PASSAGES, seeded(i + 100)))));
    expect(sigs.size).toBeGreaterThan(20);
  });
  it("un seul chapitre : pas de question « quel passage »", () => {
    for (let s = 1; s <= 50; s++) expect(generateQuiz([passage("TST", 1, "Test 1")], seeded(s)).some((q) => q.kind === "which_chapter")).toBe(false);
  });
  it("seuil de réussite : 2 sur 3", () => { expect(passed(1, 3)).toBe(false); expect(passed(2, 3)).toBe(true); expect(passed(3, 3)).toBe(true); expect(passed(0, 0)).toBe(false); });
});

describe("statut des jours", () => {
  const day = { dayIndex: 0, date: "2027-01-01", passages: [{ book: "PSA", from: 1, to: 2 }], chapterCount: 2, rest: false };
  it("liste les chapitres du jour", () => { expect(chaptersOfDay(day)).toEqual([{ book: "PSA", chapter: 1 }, { book: "PSA", chapter: 2 }]); });
  it("à faire / partiel / quiz à passer / terminé / repos", () => {
    expect(dayStatus(day, () => false, false)).toBe("todo");
    expect(dayStatus(day, (_b, c) => c === 1, false)).toBe("partial");
    expect(dayStatus(day, () => true, false)).toBe("quiz");
    expect(dayStatus(day, () => true, true)).toBe("done");
    expect(dayStatus({ ...day, rest: true, passages: [], chapterCount: 0 }, () => false, false)).toBe("rest");
  });
});

describe("notes : réconciliation sans perte", () => {
  const L = (o: Partial<LocalNote>): LocalNote => ({ refKey: "chapter:JHN:3", body: "local", baseVersion: 1, dirty: true, updatedAt: 1, ...o });
  const S = (body: string, version: number) => ({ refKey: "chapter:JHN:3", body, version });
  it("note inconnue localement : adoptée", () => { const r = reconcileNote(undefined, S("serveur", 2), false); expect(r.note).toMatchObject({ body: "serveur", baseVersion: 2, dirty: false }); });
  it("opération en file : la note locale n'est pas écrasée", () => { expect(reconcileNote(L({}), S("autre", 5), true).changed).toBe(false); });
  it("notre envoi a réussi : la note devient propre avec la nouvelle version", () => { const r = reconcileNote(L({}), S("local", 2), false); expect(r.note).toMatchObject({ dirty: false, baseVersion: 2 }); expect(r.enqueue).toBe(false); });
  it("note locale propre : on suit le serveur", () => { expect(reconcileNote(L({ dirty: false }), S("serveur", 3), false).note.body).toBe("serveur"); });
  it("conflit : les DEUX textes sont conservés et renvoyés", () => {
    const r = reconcileNote(L({ body: "ma version" }), S("version d'un autre appareil", 4), false);
    expect(r.enqueue).toBe(true);
    expect(r.note.body).toBe("version d'un autre appareil" + MERGE_SEPARATOR + "ma version");
    expect(r.note.baseVersion).toBe(4);
  });
  it("le serveur contient déjà notre texte : pas de doublon", () => { expect(reconcileNote(L({ body: "abc" }), S("xx abc yy", 4), false).enqueue).toBe(false); });
});

import { describeRef, searchNotes, exportNotesText, normalize } from "@/lib/notes/journal";
describe("journal", () => {
  const U = "123e4567-e89b-42d3-a456-426614174000";
  const notes = [
    { refKey: "chapter:JHN:3", body: "Dieu a tant aimé le monde", updatedAt: 200 },
    { refKey: `day:${U}:4`, body: "Prière pour ma famille", updatedAt: 300 },
    { refKey: "chapter:PSA:23", body: "   ", updatedAt: 999 },
  ];
  const label = (n: { refKey: string }) => describeRef(n.refKey, "Évangiles · 1 mois").label;
  it("décrit les références", () => {
    expect(describeRef("chapter:JHN:3")).toEqual({ label: "Jean 3", href: "/lire?b=JHN&c=3" });
    expect(describeRef(`day:${U}:4`, "Mon défi").label).toBe("Jour 5 · Mon défi");
  });
  it("ignore les notes vides, trie par date décroissante", () => { expect(searchNotes(notes, "", label).map((n) => n.updatedAt)).toEqual([300, 200]); });
  it("recherche sans tenir compte des accents ni de la casse", () => {
    expect(searchNotes(notes, "PRIERE", label)).toHaveLength(1);
    expect(searchNotes(notes, "evangiles", label)).toHaveLength(1); // trouve par le titre du défi
    expect(searchNotes(notes, "jean", label)).toHaveLength(1);
    expect(searchNotes(notes, "introuvable", label)).toHaveLength(0);
  });
  it("normalise", () => { expect(normalize("Éléphant")).toBe("elephant"); });
  it("exporte en texte", () => {
    const t = exportNotesText(searchNotes(notes, "", label), label, new Date(2027, 0, 5));
    expect(t).toContain("2 note(s)"); expect(t).toContain("=== Jean 3 ==="); expect(t).toContain("Prière pour ma famille");
  });
});

import { isChallengeComplete } from "@/lib/challenges/day-status";
describe("défi terminé", () => {
  const plan = { days: [
    { dayIndex: 0, date: "2027-01-01", passages: [{ book: "OBA", from: 1, to: 1 }], chapterCount: 1, rest: false },
    { dayIndex: 1, date: "2027-01-02", passages: [], chapterCount: 0, rest: true },
  ] };
  it("terminé seulement si tous les jours de lecture sont validés par le quiz", () => {
    expect(isChallengeComplete(plan, () => true, new Set([0]))).toBe(true);
    expect(isChallengeComplete(plan, () => true, new Set())).toBe(false);
    expect(isChallengeComplete(plan, () => false, new Set())).toBe(false);
    expect(isChallengeComplete({ days: [] }, () => true, new Set())).toBe(false);
  });
});
