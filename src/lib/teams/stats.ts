import { dayDiff } from "@/lib/challenges/active";

export interface MemberProgress { user_id: string; display_name: string; role: string; shares: boolean; chapters_read: number | null; days_done: number | null; last_read_on: string | null }
export interface MemberStat { userId: string; name: string; role: string; shares: boolean; read: number | null; percent: number | null; activeThisWeek: boolean }
export interface TeamStats {
  members: number; sharing: number;
  /** Somme des chapitres validés par les membres qui partagent. N'est PAS un pourcentage de la Bible lue collectivement. */
  totalRead: number;
  activeThisWeek: number;
  /** Membres actifs (lecture dans les 7 derniers jours) parmi ceux qui partagent. */
  participationPercent: number | null;
  perMember: MemberStat[];
}

export function computeTeamStats(rows: readonly MemberProgress[], chaptersPerMember: number, today: string): TeamStats {
  const perMember: MemberStat[] = rows.map((r) => {
    const read = r.chapters_read; // null = progression masquée par le serveur
    const active = r.last_read_on !== null && dayDiff(r.last_read_on, today) >= 0 && dayDiff(r.last_read_on, today) <= 6;
    const percent = read !== null && chaptersPerMember > 0 ? Math.min(100, Math.round((read / chaptersPerMember) * 1000) / 10) : null;
    return { userId: r.user_id, name: r.display_name, role: r.role, shares: r.shares, read, percent, activeThisWeek: active };
  });
  const sharingRows = perMember.filter((m) => m.shares);
  const activeThisWeek = sharingRows.filter((m) => m.activeThisWeek).length;
  return {
    members: rows.length,
    sharing: sharingRows.length,
    totalRead: sharingRows.reduce((s, m) => s + (m.read ?? 0), 0),
    activeThisWeek,
    participationPercent: sharingRows.length > 0 ? Math.round((activeThisWeek / sharingRows.length) * 100) : null,
    perMember,
  };
}
