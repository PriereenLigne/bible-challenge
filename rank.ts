import type { MemberProgress } from "@/lib/teams/stats";

export interface RankedMember { userId: string; name: string; isMe: boolean; rank: number; daysDone: number; chaptersRead: number }
export interface RankingResult { ranked: RankedMember[]; notSharing: { userId: string; name: string; isMe: boolean }[]; me: RankedMember | null; hint: string | null }

export const ordinalFr = (n: number) => (n === 1 ? "1er" : `${n}e`);
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/**
 * Classement par jours terminés (lecture + quiz), puis par chapitres lus. Égalité = même rang (1, 2, 2, 4).
 * Seuls les membres qui partagent leur progression sont classés. Le message d'accompagnement est toujours positif.
 */
export function rankMembers(rows: readonly MemberProgress[], myId: string): RankingResult {
  const sharing = rows.filter((r) => r.shares && r.chapters_read !== null);
  const sorted = sharing
    .map((r) => ({ userId: r.user_id, name: r.display_name, isMe: r.user_id === myId, daysDone: r.days_done ?? 0, chaptersRead: r.chapters_read ?? 0 }))
    .sort((a, b) => b.daysDone - a.daysDone || b.chaptersRead - a.chaptersRead || a.name.localeCompare(b.name, "fr"));
  const ranked: RankedMember[] = [];
  sorted.forEach((m, i) => {
    const prev = ranked[i - 1];
    const tie = prev !== undefined && prev.daysDone === m.daysDone && prev.chaptersRead === m.chaptersRead;
    ranked.push({ ...m, rank: tie ? prev.rank : i + 1 });
  });

  const notSharing = rows.filter((r) => !(r.shares && r.chapters_read !== null)).map((r) => ({ userId: r.user_id, name: r.display_name, isMe: r.user_id === myId }));
  const me = ranked.find((m) => m.isMe) ?? null;

  let hint: string | null = null;
  const meRow = rows.find((r) => r.user_id === myId);
  if (meRow && !meRow.shares) hint = "Votre progression n’est pas partagée : vous n’apparaissez pas au classement.";
  else if (me && ranked.length > 1) {
    if (me.rank === 1) hint = ranked.filter((m) => m.rank === 1).length > 1 ? "Vous êtes à égalité en tête, bravo !" : "Vous êtes en tête : continuez ainsi !";
    else {
      const higher = ranked.filter((m) => m.rank < me.rank);
      const next = higher.reduce((a, b) => (b.rank > a.rank ? b : a));
      const dd = next.daysDone - me.daysDone;
      const cd = next.chaptersRead - me.chaptersRead;
      hint = dd > 0 ? `Encore ${plural(dd, "jour", "jours")} pour rejoindre le ${ordinalFr(next.rank)} rang.` : cd > 0 ? `Encore ${plural(cd, "chapitre", "chapitres")} pour rejoindre le ${ordinalFr(next.rank)} rang.` : null;
    }
  }
  return { ranked, notSharing, me, hint };
}
