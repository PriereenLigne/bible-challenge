import { BOOK_BY_ID, PROTESTANT_CANON } from "@/lib/bible/canon";

/**
 * Lecture d'une référence biblique tapée librement :
 * « Jean 3:16 », « Jean 3 16 », « Jean3 16 », « Jn3:16 », « jn 3.16 », « Jean 3,16 »,
 * « 1 Co 13 », « 1Jn 4:8 », « Ps 23 », « Jude 3 », « Apocalypse 21:1-4 »…
 * Accents, majuscules et espaces sont ignorés.
 */
export interface VerseRef { book: string; chapter: number; verse: number | null; verseEnd: number | null }

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const key = (s: string) => norm(s).replace(/[^a-z0-9]/g, "");

/** Abréviations usuelles en français (Louis Segond, TOB, Bible de Jérusalem) et codes USFM. */
const ALIASES: Record<string, string[]> = {
  GEN: ["gn", "ge", "gen"], EXO: ["ex", "exo", "exod"], LEV: ["lv", "le", "lev"], NUM: ["nb", "nomb", "no", "num"],
  DEU: ["dt", "de", "deut"], JOS: ["js", "jos", "josue"], JDG: ["jg", "jug", "juges"], RUT: ["rt", "ru", "rut"],
  "1SA": ["1s", "1sa", "1sam"], "2SA": ["2s", "2sa", "2sam"], "1KI": ["1r", "1ro", "1rois"], "2KI": ["2r", "2ro", "2rois"],
  "1CH": ["1ch", "1chr", "1chron"], "2CH": ["2ch", "2chr", "2chron"], EZR: ["esd", "esdr", "ezr"], NEH: ["ne", "neh"],
  EST: ["est", "esth"], JOB: ["jb", "job"], PSA: ["ps", "psa", "psaume", "psaumes", "psm"], PRO: ["pr", "pro", "prov"],
  ECC: ["ec", "ecc", "eccl", "qo", "qoh", "qohelet"], SNG: ["ct", "cant", "cantique", "sng"], ISA: ["es", "esa", "is", "isa", "isaie"],
  JER: ["jr", "jer"], LAM: ["lm", "la", "lam"], EZK: ["ez", "eze", "ezk", "ezech"], DAN: ["dn", "da", "dan"],
  HOS: ["os", "hos"], JOL: ["jl", "joe", "jol"], AMO: ["am", "amo"], OBA: ["ab", "abd", "oba"], JON: ["jon"],
  MIC: ["mi", "mic"], NAM: ["na", "nah", "nam"], HAB: ["ha", "hab"], ZEP: ["so", "soph", "zep"], HAG: ["ag", "agg", "hag"],
  ZEC: ["za", "zac", "zach", "zec"], MAL: ["ml", "mal"],
  MAT: ["mt", "mat", "matt", "math"], MRK: ["mc", "mr", "mrk", "marc"], LUK: ["lc", "lu", "luk", "luc"], JHN: ["jn", "jhn", "jea"],
  ACT: ["ac", "act", "actes"], ROM: ["rm", "ro", "rom"], "1CO": ["1co", "1cor"], "2CO": ["2co", "2cor"],
  GAL: ["ga", "gal"], EPH: ["ep", "eph"], PHP: ["ph", "php", "phil", "phi"], COL: ["col", "co"],
  "1TH": ["1th", "1thes", "1thess"], "2TH": ["2th", "2thes", "2thess"], "1TI": ["1tm", "1ti", "1tim"], "2TI": ["2tm", "2ti", "2tim"],
  TIT: ["tt", "ti", "tit"], PHM: ["phm", "phlm", "philem"], HEB: ["he", "heb", "hb"], JAS: ["jc", "jac", "jas", "ja"],
  "1PE": ["1p", "1pi", "1pe", "1pier"], "2PE": ["2p", "2pi", "2pe", "2pier"], "1JN": ["1jn", "1j", "1jean"], "2JN": ["2jn", "2j", "2jean"],
  "3JN": ["3jn", "3j", "3jean"], JUD: ["jd", "jud", "jude"], REV: ["ap", "apo", "apoc", "rev", "apocalypse"],
};

const EXACT = new Map<string, string>();
for (const b of PROTESTANT_CANON) { EXACT.set(key(b.name), b.id); EXACT.set(key(b.id), b.id); }
for (const [id, list] of Object.entries(ALIASES)) for (const a of list) if (!EXACT.has(a)) EXACT.set(a, id);
const NAMES = PROTESTANT_CANON.map((b) => ({ id: b.id, k: key(b.name) }));

/** Trouve le livre à partir d'un nom ou d'une abréviation déjà réduite (« 1jn », « jean », « phil »). */
export function findBook(raw: string): string | null {
  const k = key(raw);
  if (!k) return null;
  const hit = EXACT.get(k);
  if (hit) return hit;
  if (k.length < 2) return null;
  // début de nom sans ambiguïté (« genes » → Genèse, « corinth » refusé sans chiffre)
  const starts = NAMES.filter((n) => n.k.startsWith(k));
  return starts.length === 1 ? starts[0]?.id ?? null : null;
}

// les formes en lettres (« I », « premier », « 1er ») doivent être suivies d'un espace, pour ne pas couper « Isaïe »
const ORDINAL = /^(?:(i{1,3}|premier|premiere|1er|1ere|deuxieme|second|seconde|2e|2eme|troisieme|3e|3eme)\s+|(1|2|3)\s*)/;
const ORD_VALUE: Record<string, string> = { i: "1", ii: "2", iii: "3", premier: "1", premiere: "1", "1er": "1", "1ere": "1", deuxieme: "2", second: "2", seconde: "2", "2e": "2", "2eme": "2", troisieme: "3", "3e": "3", "3eme": "3" };

/** Lit « Livre chapitre[:verset[-verset]] ». Retourne null si ce n'est pas une référence valide. */
export function parseReference(input: string): VerseRef | null {
  let s = norm(input).trim().replace(/[–—]/g, "-");
  if (!s) return null;

  // chiffre de tête pour 1 Jean, 2 Rois… (« 1 », « I », « 1er », « premier »)
  let prefix = "";
  const ord = s.match(ORDINAL);
  if (ord && /[a-z]/.test(s.slice(ord[0].length, ord[0].length + 1))) {
    prefix = (ord[1] ? ORD_VALUE[ord[1]] : ord[2]) ?? "";
    s = s.slice(ord[0].length);
  }

  // le nom du livre = lettres (et espaces/points) jusqu'au premier chiffre
  const m = s.match(/^([a-z][a-z.' ]*?)\s*(?:\.\s*)?(\d+)?\s*(?:[:.,;\s]\s*(\d+)\s*(?:-\s*(\d+))?)?\s*$/);
  if (!m) return null;
  const book = findBook(prefix + m[1]);
  if (!book) return null;
  const def = BOOK_BY_ID.get(book)!;

  let chapter = m[2] ? Number(m[2]) : 1;
  let verse = m[3] ? Number(m[3]) : null;
  let verseEnd = m[4] ? Number(m[4]) : null;
  // livre d'un seul chapitre : « Jude 3 » = verset 3
  if (def.chapters === 1 && m[2] && !m[3] && chapter > 1) { verse = chapter; chapter = 1; }
  if (chapter < 1 || chapter > def.chapters) return null;
  if (verse !== null && (verse < 1 || verse > 200)) return null;
  if (verseEnd !== null && (verse === null || verseEnd < verse || verseEnd > 200)) verseEnd = null;
  return { book, chapter, verse, verseEnd };
}

/** « Jean 3:16 », « Psaumes 23 », « 1 Jean 4:7-8 » */
export function formatReference(r: VerseRef): string {
  const name = BOOK_BY_ID.get(r.book)?.name ?? r.book;
  return `${name} ${r.chapter}${r.verse ? `:${r.verse}${r.verseEnd ? `-${r.verseEnd}` : ""}` : ""}`;
}
