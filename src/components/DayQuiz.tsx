"use client";
import { useState } from "react";
import { BOOK_BY_ID, type ChapterRef } from "@/lib/bible/canon";
import { loadBook, loadVersions, type BookText } from "@/lib/bible/store";
import { generateQuiz, passed, QUIZ_COUNT, type Question, type QuizPassage } from "@/lib/quiz/generate";
import { completeDay, runSync } from "@/lib/offline/mark-read";
import { localToday } from "@/lib/challenges/active";
import type { DayDone } from "@/lib/offline/local-db";

type Phase =
  | { k: "idle" } | { k: "loading" } | { k: "error"; msg: string }
  | { k: "asking"; qs: Question[]; ans: (number | null)[] }
  | { k: "result"; qs: Question[]; ans: (number | null)[]; score: number; ok: boolean };

const secureRandom = () => crypto.getRandomValues(new Uint32Array(1))[0]! / 4294967296;
const btn = "min-h-12 rounded-xl px-5 font-medium";

export function DayQuiz({ challengeId, dayIndex, chapters, onCompleted }: { challengeId: string; dayIndex: number; chapters: ChapterRef[]; onCompleted: (d: DayDone) => void }) {
  const [phase, setPhase] = useState<Phase>({ k: "idle" });

  async function start() {
    setPhase({ k: "loading" });
    try {
      const v = (await loadVersions())[0];
      if (!v) throw new Error("Aucun texte biblique n’est installé : le quiz ne peut pas être préparé.");
      const texts = new Map<string, BookText>();
      for (const b of new Set(chapters.map((c) => c.book))) texts.set(b, await loadBook(v, b));
      const passages: QuizPassage[] = chapters.flatMap((c) => {
        const ch = texts.get(c.book)?.chapters.find((x) => x.c === c.chapter);
        return ch ? [{ label: `${BOOK_BY_ID.get(c.book)?.name ?? c.book} ${c.chapter}`, book: c.book, chapter: c.chapter, verses: ch.v }] : [];
      });
      const qs = generateQuiz(passages, secureRandom, QUIZ_COUNT);
      if (qs.length === 0) throw new Error("Impossible de préparer des questions pour ce passage.");
      setPhase({ k: "asking", qs, ans: qs.map(() => null) });
    } catch (e) {
      setPhase({ k: "error", msg: `${(e as Error).message} Hors connexion ? Téléchargez d’abord la traduction : onglet Lire, « Mes téléchargements ».` });
    }
  }

  async function submit(qs: Question[], ans: (number | null)[]) {
    const score = qs.filter((q, i) => ans[i] === q.answer).length;
    const ok = passed(score, qs.length);
    try {
      if (ok) { onCompleted(await completeDay(challengeId, dayIndex, score, qs.length, localToday())); void runSync(); }
      setPhase({ k: "result", qs, ans, score, ok });
    } catch (e) { setPhase({ k: "error", msg: `Résultat non enregistré : ${(e as Error).message}` }); }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5" aria-live="polite">
      <h2 className="text-lg font-semibold">Quiz du jour</h2>
      {phase.k === "idle" && (<>
        <p className="mt-1 text-sm text-muted">{QUIZ_COUNT} questions tirées au hasard dans les passages que vous venez de lire. Réussissez-en au moins 2 pour terminer la journée.</p>
        <button type="button" onClick={() => void start()} className={`${btn} mt-3 bg-forest text-bg`}>Commencer le quiz</button>
      </>)}
      {phase.k === "loading" && <p className="mt-2 text-sm text-muted">Préparation des questions…</p>}
      {phase.k === "error" && (<><p role="alert" className="mt-2 text-sm text-calm">{phase.msg}</p><button type="button" onClick={() => void start()} className={`${btn} mt-3 border border-line`}>Réessayer</button></>)}
      {phase.k === "asking" && (
        <div className="mt-3 space-y-6">
          {phase.qs.map((q, i) => (
            <fieldset key={q.id} className="space-y-2">
              <legend className="font-medium">{i + 1}. {q.prompt}</legend>
              <blockquote className="border-l-2 border-sand pl-3 font-reading italic text-muted">{q.context}</blockquote>
              {q.options.map((o, j) => (
                <label key={j} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 ${phase.ans[i] === j ? "border-progress bg-progress/10" : "border-line"}`}>
                  <input type="radio" name={q.id} checked={phase.ans[i] === j} onChange={() => setPhase({ ...phase, ans: phase.ans.map((a, k) => (k === i ? j : a)) })} />
                  <span>{o}</span>
                </label>))}
            </fieldset>))}
          <button type="button" disabled={phase.ans.some((a) => a === null)} onClick={() => void submit(phase.qs, phase.ans)} className={`${btn} bg-forest text-bg disabled:opacity-50`}>Valider mes réponses</button>
        </div>
      )}
      {phase.k === "result" && (
        <div className="mt-3 space-y-4">
          <p className={`font-reading text-xl ${phase.ok ? "text-progress" : "text-calm"}`}>{phase.score} / {phase.qs.length} — {phase.ok ? "Journée terminée, bravo !" : "Pas tout à fait. Relisez le passage, puis réessayez avec de nouvelles questions."}</p>
          <ul className="space-y-2 text-sm">
            {phase.qs.map((q, i) => (
              <li key={q.id} className="rounded-xl border border-line p-3">
                <span className={phase.ans[i] === q.answer ? "text-progress" : "text-calm"}>{phase.ans[i] === q.answer ? "✓ Bonne réponse" : "✗ Réponse attendue"}</span>
                {" : "}{q.options[q.answer]} <span className="text-muted">({q.ref})</span>
              </li>))}
          </ul>
          {!phase.ok && <button type="button" onClick={() => void start()} className={`${btn} bg-forest text-bg`}>Nouveau quiz</button>}
        </div>
      )}
    </section>
  );
}
