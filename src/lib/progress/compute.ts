import { chapterKey, type ChapterRef } from "@/lib/bible/canon";
import type { GeneratedPlan } from "@/lib/plans/generate";

/** Trois mesures distinctes, jamais confondues. */
export interface ProgressSummary {
  /** Chapitres uniques validés / chapitres du programme. */
  contentReadPercent: number;
  /** Jours écoulés / durée du programme (temps, pas lecture). */
  elapsedTimePercent: number;
  /** Chapitres qui auraient dû être lus à cette date moins ceux validés (≥ 0). */
  chaptersBehind: number;
  uniqueRead: number;
}

export function computeProgress(plan: GeneratedPlan, read: Iterable<ChapterRef>, today: string): ProgressSummary {
  const inPlan = new Set<string>();
  for (const d of plan.days) for (const p of d.passages) for (let c = p.from; c <= p.to; c++) inPlan.add(chapterKey({ book: p.book, chapter: c }));
  const uniq = new Set<string>();
  for (const r of read) { const k = chapterKey(r); if (inPlan.has(k)) uniq.add(k); } // déduplique, ignore hors-programme
  const total = plan.totalChapters;
  const dueDays = plan.days.filter((d) => d.date <= today);
  const due = dueDays.reduce((s, d) => s + d.chapterCount, 0);
  const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 1000) / 10);
  return {
    contentReadPercent: pct(uniq.size, total),
    elapsedTimePercent: pct(dueDays.length, plan.days.length),
    chaptersBehind: Math.max(0, due - uniq.size),
    uniqueRead: uniq.size,
  };
}

/** Série de jours consécutifs finissant à `today` (ou hier : la journée en cours ne casse pas la série). */
export function currentStreak(readDates: Iterable<string>, today: string, add: (d: string, n: number) => string): number {
  const set = new Set(readDates);
  let cursor = set.has(today) ? today : add(today, -1);
  let n = 0;
  while (set.has(cursor)) { n++; cursor = add(cursor, -1); }
  return n;
}
