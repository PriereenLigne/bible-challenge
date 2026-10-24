/** Analyseur USFM minimal, sans dépendance. Produit un format compact : chapitres -> versets. */
export type Verse = [number, string];
export interface ParsedChapter { c: number; t?: string; v: Verse[] }
export interface ParsedBook { id: string; chapters: ParsedChapter[] }

const HEADING = /^\\(s\d?|r|sp|ms\d?|mr|mt\d?|h\d?|toc\d|ip\w*|is\d?|imt\d?|cl|cd|rem|sts|periph|mte\d?|imte\d?|ide|usfm|cp|b)\b/;
const MARK = /\\(c|v)\s+(\d+)(?:[-–](\d+))?/g;

/** Retire notes, renvois, figures, numérotations alternatives ; garde le texte des mots balisés. */
function preClean(s: string): string {
  return s
    .replace(/\\(f|fe|x|fig)\s[\s\S]*?\\\1\*/g, "")
    .replace(/\\(va|vp|ca)\s[\s\S]*?\\\1\*/g, "")
    .replace(/\\\+?(w|wg|wh)\s+([^|\\]*)(?:\|[^\\]*)?\\\+?\1\*/g, "$2");
}
/** Retire tous les marqueurs restants (\p, \q1, \add, \nd…) mais garde le texte. */
const stripMarkers = (s: string) => s.replace(/\\\+?[a-z][a-z0-9]*\*?/gi, "").replace(/\s+/g, " ");

export function parseUsfm(source: string): ParsedBook {
  const text = preClean(source.replace(/\r\n?/g, "\n"));
  let id = "";
  const chapters: ParsedChapter[] = [];
  let cur: ParsedChapter | null = null;
  let verse: { n: number; buf: string } | null = null;

  const flush = () => {
    if (verse && cur) cur.v.push([verse.n, verse.buf.replace(/\s+/g, " ").trim().normalize("NFC")]);
    verse = null;
  };
  const append = (raw: string) => { if (verse) verse.buf += " " + stripMarkers(raw); };

  for (const line of text.split("\n")) {
    const idm = /^\\id\s+([A-Z0-9]{3})/.exec(line);
    if (idm) { id = idm[1] ?? ""; continue; }
    const dm = /^\\d\b\s*(.*)$/.exec(line);
    if (dm) { if (cur) cur.t = ((cur.t ? cur.t + " " : "") + stripMarkers(dm[1] ?? "")).trim().normalize("NFC"); continue; }
    if (HEADING.test(line)) continue;

    MARK.lastIndex = 0;
    let last = 0; let m: RegExpExecArray | null;
    while ((m = MARK.exec(line))) {
      append(line.slice(last, m.index));
      flush();
      if (m[1] === "c") { cur = { c: Number(m[2]), v: [] }; chapters.push(cur); }
      else if (cur) verse = { n: Number(m[2]), buf: "" };
      last = MARK.lastIndex;
    }
    append(line.slice(last));
  }
  flush();
  return { id, chapters };
}

export interface BookDef { id: string; chapters: number }
/** Contrôle d'intégrité par rapport au référentiel. Liste vide = livre conforme. */
export function validateBook(b: ParsedBook, def: BookDef): string[] {
  const issues: string[] = [];
  if (b.chapters.length !== def.chapters) issues.push(`${def.id}: ${b.chapters.length} chapitres trouvés, ${def.chapters} attendus`);
  b.chapters.forEach((ch, i) => {
    if (ch.c !== i + 1) issues.push(`${def.id}: numérotation de chapitre inattendue (${ch.c} à la position ${i + 1})`);
    if (ch.v.length === 0) issues.push(`${def.id} ${ch.c}: chapitre sans verset`);
    let prev = 0;
    for (const [n, t] of ch.v) {
      if (n <= prev) issues.push(`${def.id} ${ch.c}:${n}: numéro de verset non croissant`);
      if (t === "") issues.push(`${def.id} ${ch.c}:${n}: verset vide`);
      prev = n;
    }
  });
  return issues;
}
