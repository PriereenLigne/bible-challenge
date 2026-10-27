/**
 * Référentiel unique du canon protestant (66 livres).
 * Source des nombres de chapitres : structure standard universelle des 66 livres.
 * Les versets ne sont pas listés ici : ils dépendent de la traduction/versification
 * et viendront de la table bible_verses (contenu sous licence).
 */
export type Testament = "AT" | "NT";
export interface BookDef { id: string; name: string; testament: Testament; chapters: number }

const raw: [string, string, Testament, number][] = [
  ["GEN","Genèse","AT",50],["EXO","Exode","AT",40],["LEV","Lévitique","AT",27],["NUM","Nombres","AT",36],
  ["DEU","Deutéronome","AT",34],["JOS","Josué","AT",24],["JDG","Juges","AT",21],["RUT","Ruth","AT",4],
  ["1SA","1 Samuel","AT",31],["2SA","2 Samuel","AT",24],["1KI","1 Rois","AT",22],["2KI","2 Rois","AT",25],
  ["1CH","1 Chroniques","AT",29],["2CH","2 Chroniques","AT",36],["EZR","Esdras","AT",10],["NEH","Néhémie","AT",13],
  ["EST","Esther","AT",10],["JOB","Job","AT",42],["PSA","Psaumes","AT",150],["PRO","Proverbes","AT",31],
  ["ECC","Ecclésiaste","AT",12],["SNG","Cantique des cantiques","AT",8],["ISA","Ésaïe","AT",66],["JER","Jérémie","AT",52],
  ["LAM","Lamentations","AT",5],["EZK","Ézéchiel","AT",48],["DAN","Daniel","AT",12],["HOS","Osée","AT",14],
  ["JOL","Joël","AT",3],["AMO","Amos","AT",9],["OBA","Abdias","AT",1],["JON","Jonas","AT",4],
  ["MIC","Michée","AT",7],["NAM","Nahum","AT",3],["HAB","Habacuc","AT",3],["ZEP","Sophonie","AT",3],
  ["HAG","Aggée","AT",2],["ZEC","Zacharie","AT",14],["MAL","Malachie","AT",4],
  ["MAT","Matthieu","NT",28],["MRK","Marc","NT",16],["LUK","Luc","NT",24],["JHN","Jean","NT",21],
  ["ACT","Actes","NT",28],["ROM","Romains","NT",16],["1CO","1 Corinthiens","NT",16],["2CO","2 Corinthiens","NT",13],
  ["GAL","Galates","NT",6],["EPH","Éphésiens","NT",6],["PHP","Philippiens","NT",4],["COL","Colossiens","NT",4],
  ["1TH","1 Thessaloniciens","NT",5],["2TH","2 Thessaloniciens","NT",3],["1TI","1 Timothée","NT",6],["2TI","2 Timothée","NT",4],
  ["TIT","Tite","NT",3],["PHM","Philémon","NT",1],["HEB","Hébreux","NT",13],["JAS","Jacques","NT",5],
  ["1PE","1 Pierre","NT",5],["2PE","2 Pierre","NT",3],["1JN","1 Jean","NT",5],["2JN","2 Jean","NT",1],
  ["3JN","3 Jean","NT",1],["JUD","Jude","NT",1],["REV","Apocalypse","NT",22],
];

export const PROTESTANT_CANON: readonly BookDef[] = raw.map(([id, name, testament, chapters]) => ({ id, name, testament, chapters }));
export const BOOK_BY_ID: ReadonlyMap<string, BookDef> = new Map(PROTESTANT_CANON.map((b) => [b.id, b]));

export interface ChapterRef { book: string; chapter: number }
export const chapterKey = (c: ChapterRef) => `${c.book}:${c.chapter}`;

export function chaptersOf(bookIds: readonly string[]): ChapterRef[] {
  const out: ChapterRef[] = [];
  for (const id of bookIds) {
    const b = BOOK_BY_ID.get(id);
    if (!b) throw new Error(`Livre inconnu : ${id}`);
    for (let c = 1; c <= b.chapters; c++) out.push({ book: id, chapter: c });
  }
  return out;
}
