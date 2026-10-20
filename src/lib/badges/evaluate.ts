import { PROTESTANT_CANON, chapterKey, type ChapterRef } from "@/lib/bible/canon";

export type BadgeId = "first_read" | "streak_7" | "streak_30" | "first_book" | "first_challenge";
export const BADGES: Record<BadgeId, string> = {
  first_read: "Première lecture validée",
  streak_7: "Sept jours de lecture",
  streak_30: "Trente jours de persévérance",
  first_book: "Premier livre terminé",
  first_challenge: "Premier défi terminé",
};

export interface BadgeInput {
  readChapters: Iterable<ChapterRef>;
  bestStreak: number;
  completedChallenges: number;
}

/** Livres dont TOUS les chapitres sont validés. */
export function completedBooks(read: Iterable<ChapterRef>): string[] {
  const keys = new Set<string>();
  for (const r of read) keys.add(chapterKey(r));
  return PROTESTANT_CANON.filter((b) => {
    for (let c = 1; c <= b.chapters; c++) if (!keys.has(chapterKey({ book: b.id, chapter: c }))) return false;
    return true;
  }).map((b) => b.id);
}

/** Un badge n'est attribué que si sa condition est effectivement remplie. */
export function evaluateBadges(i: BadgeInput): BadgeId[] {
  const read = [...i.readChapters];
  const out: BadgeId[] = [];
  if (read.length > 0) out.push("first_read");
  if (i.bestStreak >= 7) out.push("streak_7");
  if (i.bestStreak >= 30) out.push("streak_30");
  if (completedBooks(read).length > 0) out.push("first_book");
  if (i.completedChallenges > 0) out.push("first_challenge");
  return out;
}
