import { BOOK_BY_ID } from "@/lib/bible/canon";
import type { OpPayload } from "@/lib/offline/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (s: unknown): s is string => typeof s === "string" && UUID.test(s);

export function isIsoDate(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; // refuse 2027-02-30
}

export type Validation = { ok: true } | { ok: false; error: string };

export function validatePayload(p: OpPayload): Validation {
  if (p.type === "reading_event") {
    if (!isUuid(p.challengeId)) return { ok: false, error: "challengeId invalide" };
    const book = BOOK_BY_ID.get(p.book);
    if (!book) return { ok: false, error: `livre inconnu : ${p.book}` };
    if (!Number.isInteger(p.chapter) || p.chapter < 1 || p.chapter > book.chapters)
      return { ok: false, error: `chapitre hors limites pour ${book.name}` };
    if (!isIsoDate(p.readOn)) return { ok: false, error: "date de lecture invalide" };
    return { ok: true };
  }
  if (p.type === "note_upsert") {
    if (!isUuid(p.noteId)) return { ok: false, error: "noteId invalide" };
    if (typeof p.body !== "string" || p.body.length > 20_000) return { ok: false, error: "note trop longue" };
    if (!Number.isInteger(p.baseVersion) || p.baseVersion < 0) return { ok: false, error: "version invalide" };
    return { ok: true };
  }
  return { ok: false, error: "type d'opération inconnu" };
}
