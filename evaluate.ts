import { PROTESTANT_CANON, chapterKey, type ChapterRef } from "@/lib/bible/canon";

export type BadgeId = "first_read" | "streak_7" | "streak_30" | "first_book" | "first_challenge" | "first_note" | "first_favorite" | "first_team" | "first_perfect_quiz";
export type IconName = "book" | "flame" | "trophy" | "pencil" | "heart" | "users" | "star" | "check";
export interface BadgeDef { id: BadgeId; title: string; description: string; icon: IconName; target: number }

export const BADGES: readonly BadgeDef[] = [
  { id: "first_read", title: "Première lecture", description: "Validez votre premier chapitre.", icon: "book", target: 1 },
  { id: "streak_7", title: "Sept jours de suite", description: "Lisez 7 jours consécutifs.", icon: "flame", target: 7 },
  { id: "streak_30", title: "Trente jours de persévérance", description: "Lisez 30 jours consécutifs.", icon: "flame", target: 30 },
  { id: "first_book", title: "Premier livre terminé", description: "Lisez tous les chapitres d'un livre.", icon: "check", target: 1 },
  { id: "first_perfect_quiz", title: "Quiz parfait", description: "Répondez juste à toutes les questions d'un quiz.", icon: "star", target: 1 },
  { id: "first_note", title: "Première méditation", description: "Écrivez votre première note.", icon: "pencil", target: 1 },
  { id: "first_favorite", title: "Verset précieux", description: "Ajoutez un verset à vos favoris.", icon: "heart", target: 1 },
  { id: "first_team", title: "Lire ensemble", description: "Rejoignez ou créez une équipe.", icon: "users", target: 1 },
  { id: "first_challenge", title: "Premier défi terminé", description: "Terminez tous les jours d'un défi.", icon: "trophy", target: 1 },
];

/** Livres dont TOUS les chapitres sont validés. */
export function completedBooks(read: Iterable<ChapterRef>): string[] {
  const keys = new Set<string>();
  for (const r of read) keys.add(chapterKey(r));
  return PROTESTANT_CANON.filter((b) => { for (let c = 1; c <= b.chapters; c++) if (!keys.has(chapterKey({ book: b.id, chapter: c }))) return false; return true; }).map((b) => b.id);
}

export interface BadgeInput { distinctChapters: number; bestStreak: number; booksCompleted: number; completedChallenges: number; notesCount: number; favoritesCount: number; teamsCount: number; perfectQuizzes: number }
export interface BadgeState extends BadgeDef { earned: boolean; value: number }

/** Un badge n'est attribué que si sa condition est effectivement remplie ; la progression restante est exposée. */
export function evaluateBadges(i: BadgeInput): BadgeState[] {
  const value: Record<BadgeId, number> = {
    first_read: i.distinctChapters, streak_7: i.bestStreak, streak_30: i.bestStreak, first_book: i.booksCompleted,
    first_challenge: i.completedChallenges, first_note: i.notesCount, first_favorite: i.favoritesCount, first_team: i.teamsCount, first_perfect_quiz: i.perfectQuizzes,
  };
  return BADGES.map((b) => ({ ...b, value: Math.min(value[b.id], b.target), earned: value[b.id] >= b.target }));
}
