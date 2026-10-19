import { chaptersOf, chapterKey, type ChapterRef } from "@/lib/bible/canon";

export interface Passage { book: string; from: number; to: number }
export interface PlanDay { dayIndex: number; date: string; passages: Passage[]; chapterCount: number; rest: boolean }
export interface GeneratedPlan { days: PlanDay[]; totalChapters: number }

/** Ajoute des jours UTC à une date ISO (AAAA-MM-JJ), sans dépendre du fuseau local. */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

function toPassages(chs: ChapterRef[]): Passage[] {
  const out: Passage[] = [];
  for (const c of chs) {
    const last = out[out.length - 1];
    if (last && last.book === c.book && last.to === c.chapter - 1) last.to = c.chapter;
    else out.push({ book: c.book, from: c.chapter, to: c.chapter });
  }
  return out;
}

/**
 * Répartit des chapitres, dans l'ordre, sur `dayCount` jours.
 * Déterministe. Chaque chapitre apparaît exactement une fois.
 * Si dayCount > nombre de chapitres, certains jours sont des jours de repos (rest = true).
 */
export function distribute(chapters: ChapterRef[], dayCount: number, startDate: string): GeneratedPlan {
  if (!Number.isInteger(dayCount) || dayCount < 1) throw new Error("dayCount doit être un entier ≥ 1");
  const n = chapters.length;
  const days: PlanDay[] = [];
  for (let i = 0; i < dayCount; i++) {
    const a = Math.floor((i * n) / dayCount);
    const b = Math.floor(((i + 1) * n) / dayCount);
    const slice = chapters.slice(a, b);
    days.push({ dayIndex: i, date: addDays(startDate, i), passages: toPassages(slice), chapterCount: slice.length, rest: slice.length === 0 });
  }
  return { days, totalChapters: n };
}

export function generatePlan(bookIds: readonly string[], dayCount: number, startDate: string): GeneratedPlan {
  return distribute(chaptersOf(bookIds), dayCount, startDate);
}

/**
 * Rattrapage : redistribue UNIQUEMENT les chapitres non lus sur les jours restants.
 * N'altère jamais l'historique : l'appelant conserve les lectures déjà validées.
 */
export function redistributeRemaining(
  bookIds: readonly string[], readKeys: ReadonlySet<string>, remainingDays: number, fromDate: string,
): GeneratedPlan {
  const unread = chaptersOf(bookIds).filter((c) => !readKeys.has(chapterKey(c)));
  return distribute(unread, remainingDays, fromDate);
}
