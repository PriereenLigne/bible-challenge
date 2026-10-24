import { BOOK_BY_ID } from "@/lib/bible/canon";

/** Intitulés utilisés par l'enregistrement « Trésor Sonore » (Internet Archive, LSG_201807). */
const NAMES: Record<string, string> = {
  GEN: "Genèse", EXO: "Exode", LEV: "Lévitique", NUM: "Nombres", DEU: "Deutéronome", JOS: "Josué", JDG: "Juges", RUT: "Ruth",
  "1SA": "1 Samuel", "2SA": "2 Samuel", "1KI": "1 Rois", "2KI": "2 Rois", "1CH": "1 Chroniques", "2CH": "2 Chroniques", EZR: "Esdras", NEH: "Néhémie",
  EST: "Esther", JOB: "Job", PSA: "Psaumes", PRO: "Proverbes", ECC: "Ecclésiaste", SNG: "Cantique des Cantiques", ISA: "Esaïe", JER: "Jérémie",
  LAM: "Lamentations", EZK: "Ezéchiel", DAN: "Daniel", HOS: "Osée", JOL: "Joël", AMO: "Amos", OBA: "Abdias", JON: "Jonas",
  MIC: "Michée", NAM: "Nahum", HAB: "Habacuc", ZEP: "Sophonie", HAG: "Aggée", ZEC: "Zacharie", MAL: "Malachie",
  MAT: "Matthieu", MRK: "Marc", LUK: "Luc", JHN: "Jean", ACT: "Actes", ROM: "Romains", "1CO": "1 Corinthiens", "2CO": "2 Corinthiens",
  GAL: "Galates", EPH: "Ephésiens", PHP: "Philippiens", COL: "Colossiens", "1TH": "1 Thessaloniciens", "2TH": "2 Thessaloniciens",
  "1TI": "1 Timothée", "2TI": "2 Timothée", TIT: "Tite", PHM: "Philémon", HEB: "Hébreux", JAS: "Jacques", "1PE": "1 Pierre", "2PE": "2 Pierre",
  "1JN": "1 Jean", "2JN": "2 Jean", "3JN": "3 Jean", JUD: "Jude", REV: "Apocalypse",
};

/** Titre de piste d'un chapitre. Les livres d'un seul chapitre (Abdias, Philémon, 2 Jean, 3 Jean, Jude) n'ont pas de numéro. */
export function audioTitle(book: string, chapter: number): string | null {
  const name = NAMES[book]; const def = BOOK_BY_ID.get(book);
  if (!name || !def || !Number.isInteger(chapter) || chapter < 1 || chapter > def.chapters) return null;
  return def.chapters === 1 ? name : `${name} ${chapter}`;
}
