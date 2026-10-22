import { BOOK_BY_ID } from "@/lib/bible/canon";
import type { OpPayload } from "@/lib/offline/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (s: unknown): s is string => typeof s === "string" && UUID.test(s);

export function isIsoDate(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; // refuse 2027-02-30
}

/** Référence d'une note : un chapitre (chapter:JHN:3) ou un jour de défi (day:<uuid>:12). */
export function isValidRefKey(k: unknown): k is string {
  if (typeof k !== "string") return false;
  const ch = /^chapter:([A-Z0-9]{3}):(\d{1,3})$/.exec(k);
  if (ch) { const b = BOOK_BY_ID.get(ch[1] ?? ""); return !!b && Number(ch[2]) >= 1 && Number(ch[2]) <= b.chapters; }
  const d = /^day:([0-9a-f-]{36}):\d{1,4}$/.exec(k);
  return !!d && isUuid(d[1]);
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
  if (p.type === "day_quiz") {
    if (!isUuid(p.challengeId)) return { ok: false, error: "challengeId invalide" };
    if (!Number.isInteger(p.dayIndex) || p.dayIndex < 0 || p.dayIndex > 4000) return { ok: false, error: "jour invalide" };
    if (!Number.isInteger(p.total) || p.total < 1 || p.total > 20) return { ok: false, error: "total invalide" };
    if (!Number.isInteger(p.score) || p.score < 0 || p.score > p.total) return { ok: false, error: "score invalide" };
    if (!isIsoDate(p.doneOn)) return { ok: false, error: "date invalide" };
    return { ok: true };
  }
  if (p.type === "note_upsert") {
    if (!isValidRefKey(p.refKey)) return { ok: false, error: "référence de note invalide" };
    if (typeof p.body !== "string" || p.body.length > 20_000) return { ok: false, error: "note trop longue" };
    if (!Number.isInteger(p.baseVersion) || p.baseVersion < 0) return { ok: false, error: "version invalide" };
    return { ok: true };
  }
  return { ok: false, error: "type d'opération inconnu" };
}
