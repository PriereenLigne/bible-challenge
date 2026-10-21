import { BOOK_BY_ID } from "@/lib/bible/canon";
import { isUuid } from "@/lib/validation/ops";

export interface ReaderParams { book: string; chapter: number; challengeId: string | null }

/** Lit ?b=MAT&c=1&d=<uuid>. Retourne null si le livre ou le chapitre est invalide (aucune valeur non vérifiée n'est utilisée). */
export function parseReaderParams(search: string): ReaderParams | null {
  const q = new URLSearchParams(search);
  const book = q.get("b") ?? "";
  const def = BOOK_BY_ID.get(book);
  const chapter = Number(q.get("c"));
  if (!def || !Number.isInteger(chapter) || chapter < 1 || chapter > def.chapters) return null;
  const d = q.get("d");
  return { book, chapter, challengeId: isUuid(d) ? d : null };
}
export const readerHref = (book: string, chapter: number, challengeId?: string) =>
  `/lire?b=${book}&c=${chapter}${challengeId ? `&d=${challengeId}` : ""}`;
