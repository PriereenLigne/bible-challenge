import { addDays } from "@/lib/plans/generate";
import { dayDiff } from "@/lib/challenges/active";
import { currentStreak } from "@/lib/progress/compute";
import { completedBooks } from "@/lib/badges/evaluate";

export interface ReadInput { challengeId: string; book: string; chapter: number; readOn: string }
export interface DayInput { challengeId: string; dayIndex: number; doneOn: string; score: number; total: number }

/** Plus longue série de jours consécutifs. */
export function bestStreak(dates: Iterable<string>): number {
  const d = [...new Set(dates)].sort();
  let best = 0, run = 0;
  for (let i = 0; i < d.length; i++) { run = i > 0 && dayDiff(d[i - 1] as string, d[i] as string) === 1 ? run + 1 : 1; best = Math.max(best, run); }
  return best;
}

export interface Summary {
  distinctChapters: number; daysDone: number; activeDays: number; streak: number; best: number;
  booksCompleted: string[]; perfectQuizzes: number;
}
/** Un chapitre lu dans deux défis n'est compté qu'une fois. */
export function summarize(reads: readonly ReadInput[], days: readonly DayInput[], today: string): Summary {
  const chapters = new Map<string, { book: string; chapter: number }>();
  for (const r of reads) chapters.set(`${r.book}:${r.chapter}`, { book: r.book, chapter: r.chapter });
  const dates = new Set<string>([...reads.map((r) => r.readOn), ...days.map((d) => d.doneOn)]);
  return {
    distinctChapters: chapters.size,
    daysDone: days.length,
    activeDays: dates.size,
    streak: currentStreak(dates, today, addDays),
    best: bestStreak(dates),
    booksCompleted: completedBooks(chapters.values()),
    perfectQuizzes: days.filter((d) => d.total > 0 && d.score === d.total).length,
  };
}

export interface Bilan {
  days: { date: string; label: string; chapters: number; done: boolean }[];
  totalChapters: number; daysCompleted: number; notesWritten: number; activeDays: number; headline: string;
}
const LETTER = ["D", "L", "M", "M", "J", "V", "S"];

/** Bilan des 7 derniers jours (aujourd'hui inclus). Le ton reste encourageant, quelle que soit la semaine. */
export function weeklyBilan(reads: readonly ReadInput[], days: readonly DayInput[], noteDates: readonly string[], today: string): Bilan {
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const perDay = dates.map((date) => {
    const uniq = new Set(reads.filter((r) => r.readOn === date).map((r) => `${r.book}:${r.chapter}`));
    return { date, label: LETTER[new Date(`${date}T00:00:00Z`).getUTCDay()] as string, chapters: uniq.size, done: days.some((d) => d.doneOn === date) };
  });
  const activeDays = perDay.filter((d) => d.chapters > 0 || d.done).length;
  const headline =
    activeDays === 0 ? "Une nouvelle semaine, un nouveau départ : un seul chapitre suffit pour reprendre."
    : activeDays >= 6 ? "Semaine remarquable : vous avez lu presque chaque jour. Merci pour votre fidélité."
    : activeDays >= 3 ? `${activeDays} jours de lecture cette semaine. Beau rythme, continuez ainsi.`
    : `Vous avez lu ${activeDays} jour${activeDays > 1 ? "s" : ""} cette semaine. Chaque chapitre compte.`;
  return {
    days: perDay, activeDays, headline,
    totalChapters: perDay.reduce((s, d) => s + d.chapters, 0),
    daysCompleted: perDay.filter((d) => d.done).length,
    notesWritten: noteDates.filter((d) => dates.includes(d)).length,
  };
}
