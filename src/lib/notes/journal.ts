import { BOOK_BY_ID } from "@/lib/bible/canon";
import { readerHref } from "@/lib/bible/params";

export interface JournalNote { refKey: string; body: string; updatedAt: number }

/** Libellé lisible et lien éventuel d'une référence de note. */
export function describeRef(refKey: string, challengeTitle?: string | null): { label: string; href: string | null } {
  const ch = /^chapter:([A-Z0-9]{3}):(\d{1,3})$/.exec(refKey);
  if (ch) { const name = BOOK_BY_ID.get(ch[1] ?? "")?.name ?? ch[1]; return { label: `${name} ${ch[2]}`, href: readerHref(ch[1] ?? "", Number(ch[2])) }; }
  const day = /^day:[0-9a-f-]{36}:(\d{1,4})$/.exec(refKey);
  if (day) return { label: `Jour ${Number(day[1]) + 1}${challengeTitle ? ` · ${challengeTitle}` : ""}`, href: null };
  return { label: refKey, href: null };
}

/** Insensible à la casse et aux accents. */
export const normalize = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Notes non vides, filtrées par recherche (texte ou référence), les plus récentes d'abord. */
export function searchNotes(notes: readonly JournalNote[], query: string, labelOf: (n: JournalNote) => string): JournalNote[] {
  const q = normalize(query.trim());
  return notes
    .filter((n) => n.body.trim() !== "")
    .filter((n) => q === "" || normalize(n.body).includes(q) || normalize(labelOf(n)).includes(q))
    .sort((a, b) => b.updatedAt - a.updatedAt || a.refKey.localeCompare(b.refKey));
}

export function exportNotesText(notes: readonly JournalNote[], labelOf: (n: JournalNote) => string, now: Date): string {
  const head = `BIBLE CHALLENGE — Mon journal\nExporté le ${now.toLocaleDateString("fr-FR")}\n${notes.length} note(s)\n`;
  return head + notes.map((n) => `\n=== ${labelOf(n)} ===\n${n.body.trim()}\n`).join("");
}
