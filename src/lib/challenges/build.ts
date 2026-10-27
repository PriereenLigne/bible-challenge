import { addDays } from "@/lib/plans/generate";
import { DURATIONS, SCOPES, type ScopeId } from "@/lib/plans/scopes";
import { isIsoDate } from "@/lib/validation/ops";

export interface NewChallengeRow {
  owner_id: string; title: string; scope: string; book_ids: string[];
  start_date: string; end_date: string; status: "planned" | "active";
}

/** Construit la ligne à insérer. Pure : aucune dépendance réseau, entièrement testable. */
export function buildChallengeRow(ownerId: string, scope: ScopeId, durationId: string, startDate: string, today: string): NewChallengeRow {
  const s = SCOPES[scope];
  const d = DURATIONS.find((x) => x.id === durationId);
  if (!s) throw new Error("Programme inconnu");
  if (!d) throw new Error("Durée inconnue");
  if (!isIsoDate(startDate)) throw new Error("Date de début invalide");
  return {
    owner_id: ownerId,
    title: `${s.label} · ${d.label}`,
    scope,
    book_ids: [...s.books],
    start_date: startDate,
    end_date: addDays(startDate, d.days - 1),
    status: startDate <= today ? "active" : "planned",
  };
}
