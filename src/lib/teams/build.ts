import { addDays } from "@/lib/plans/generate";
import { DURATIONS, SCOPES, type ScopeId } from "@/lib/plans/scopes";
import { isIsoDate } from "@/lib/validation/ops";
import { BOOK_BY_ID } from "@/lib/bible/canon";

export interface TeamInput { name: string; description: string; withChallenge: boolean; scope: ScopeId; durationId: string; start: string }
export interface CreateTeamParams { p_name: string; p_description: string | null; p_scope: string | null; p_book_ids: string[] | null; p_start: string | null; p_end: string | null }

/** Paramètres de la fonction SQL create_team. Le serveur revalide tout : ces contrôles servent à guider l'utilisateur. */
export function buildTeamParams(i: TeamInput): CreateTeamParams {
  const name = i.name.trim();
  if (name.length < 2 || name.length > 60) throw new Error("Le nom doit contenir entre 2 et 60 caractères.");
  const description = i.description.trim();
  if (description.length > 500) throw new Error("La description est limitée à 500 caractères.");
  if (!i.withChallenge) return { p_name: name, p_description: description || null, p_scope: null, p_book_ids: null, p_start: null, p_end: null };
  const s = SCOPES[i.scope]; const d = DURATIONS.find((x) => x.id === i.durationId);
  if (!s) throw new Error("Programme inconnu.");
  if (!d) throw new Error("Durée inconnue.");
  if (!isIsoDate(i.start)) throw new Error("Date de début invalide.");
  return { p_name: name, p_description: description || null, p_scope: i.scope, p_book_ids: [...s.books], p_start: i.start, p_end: addDays(i.start, d.days - 1) };
}

/** Code d'invitation : 12 caractères hexadécimaux. Tolère espaces, tirets et minuscules. */
export function normalizeInviteCode(raw: string): string | null {
  const c = raw.replace(/[\s-]/g, "").toUpperCase();
  return /^[A-F0-9]{12}$/.test(c) ? c : null;
}
export const formatInviteCode = (c: string) => c.match(/.{1,4}/g)?.join("-") ?? c;

export const countChapters = (bookIds: readonly string[]) => bookIds.reduce((s, id) => s + (BOOK_BY_ID.get(id)?.chapters ?? 0), 0);
