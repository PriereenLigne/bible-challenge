import type { ChapterRef } from "@/lib/bible/canon";
import type { PlanDay } from "@/lib/plans/generate";

export type DayStatus = "rest" | "done" | "quiz" | "partial" | "todo";

export const chaptersOfDay = (d: PlanDay): ChapterRef[] =>
  d.passages.flatMap((p) => Array.from({ length: p.to - p.from + 1 }, (_, i) => ({ book: p.book, chapter: p.from + i })));

/** « done » = lecture complète ET quiz réussi. « quiz » = tout est lu, le quiz reste à passer. */
export function dayStatus(day: PlanDay, isRead: (book: string, chapter: number) => boolean, completed: boolean): DayStatus {
  if (day.rest) return "rest";
  if (completed) return "done";
  const chs = chaptersOfDay(day);
  const n = chs.filter((c) => isRead(c.book, c.chapter)).length;
  return n === chs.length ? "quiz" : n > 0 ? "partial" : "todo";
}
