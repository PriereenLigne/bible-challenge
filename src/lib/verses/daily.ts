/**
 * Verset du jour : une liste de passages choisis, parcourue dans un ordre fixe.
 * Tout le monde voit le même verset le même jour, sans serveur et même hors connexion.
 */
export interface VerseRef { book: string; chapter: number; verse: number; to?: number }

const R = (book: string, chapter: number, verse: number, to?: number): VerseRef => (to ? { book, chapter, verse, to } : { book, chapter, verse });

export const DAILY_VERSES: readonly VerseRef[] = [
  R("JHN", 3, 16), R("PSA", 23, 1), R("PHP", 4, 13), R("JER", 29, 11), R("ROM", 8, 28), R("PRO", 3, 5, 6), R("ISA", 41, 10),
  R("MAT", 11, 28), R("JOS", 1, 9), R("PSA", 46, 2), R("ROM", 12, 2), R("2TI", 1, 7), R("PHP", 4, 6, 7), R("ISA", 40, 31),
  R("MAT", 6, 33), R("PSA", 119, 105), R("1PE", 5, 7), R("LAM", 3, 22, 23), R("HEB", 11, 1), R("GAL", 5, 22, 23), R("PSA", 37, 5),
  R("JHN", 14, 6), R("ROM", 15, 13), R("PSA", 27, 1), R("EPH", 2, 8, 9), R("MAT", 5, 14), R("1CO", 13, 4), R("PSA", 121, 1, 2),
  R("ISA", 26, 3), R("JHN", 16, 33), R("2CO", 5, 17), R("PSA", 34, 9), R("COL", 3, 23), R("JAS", 1, 5), R("PSA", 91, 1, 2),
  R("ROM", 5, 8), R("PRO", 16, 3), R("JHN", 15, 5), R("PSA", 103, 2), R("1JN", 4, 18), R("DEU", 31, 6), R("MAT", 5, 9),
  R("PSA", 139, 14), R("ISA", 43, 2), R("HEB", 13, 5), R("JHN", 8, 12), R("ROM", 10, 9), R("PSA", 16, 11), R("2CO", 12, 9),
  R("MIC", 6, 8), R("JHN", 10, 10), R("PSA", 55, 23), R("1TH", 5, 16, 18), R("ISA", 55, 8, 9), R("MAT", 7, 7), R("PSA", 30, 6),
  R("EPH", 4, 32), R("ROM", 8, 38, 39), R("PSA", 118, 24), R("JHN", 14, 27), R("PRO", 18, 10), R("NUM", 6, 24, 26), R("PSA", 62, 2),
  R("1CO", 10, 13), R("ISA", 53, 5), R("COL", 3, 14), R("PSA", 145, 18), R("HEB", 12, 1, 2), R("MAT", 28, 20), R("ZEP", 3, 17),
  R("PSA", 19, 15), R("JHN", 1, 12), R("ROM", 12, 12), R("EPH", 3, 20), R("PSA", 42, 2), R("PRO", 4, 23), R("JAS", 1, 17),
  R("1JN", 1, 9), R("PSA", 4, 9), R("ISA", 9, 5), R("LUK", 1, 37), R("PHP", 1, 6), R("PSA", 100, 4, 5), R("JHN", 11, 25),
  R("ROM", 6, 23), R("NEH", 8, 10), R("PSA", 32, 8), R("MAT", 22, 37, 39), R("2CO", 4, 16, 18), R("PSA", 1, 1, 2), R("HEB", 4, 16),
  R("GAL", 6, 9), R("ISA", 30, 15), R("PSA", 86, 5), R("JHN", 13, 34), R("1PE", 2, 9), R("EXO", 14, 14), R("PSA", 40, 2, 3),
  R("ROM", 8, 31), R("EPH", 6, 10), R("PSA", 73, 26), R("MAT", 5, 6), R("PRO", 3, 24), R("REV", 21, 4), R("PSA", 116, 1, 2),
];

/** Nombre de jours entre le 1er janvier 1970 et la date ISO (AAAA-MM-JJ), en temps local du calendrier. */
function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function verseOfDay(isoDate: string, list: readonly VerseRef[] = DAILY_VERSES): VerseRef {
  const n = list.length;
  return list[((dayNumber(isoDate) % n) + n) % n] as VerseRef;
}

/** « Jean 3:16 », « Proverbes 3:5-6 ». */
export function refLabel(r: VerseRef, bookName: string): string {
  return `${bookName} ${r.chapter}:${r.verse}${r.to ? `-${r.to}` : ""}`;
}
