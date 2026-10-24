import type { ParsedBook, ParsedChapter } from "./usfm";

/**
 * Analyseur USFX (XML d'eBible.org), sans dépendance.
 * Ne conserve QUE le texte des versets : introductions, titres de section, renvois et notes sont écartés.
 */
const SKIP_TAGS = new Set(["id", "h", "toc", "x", "f", "fe", "ior", "s", "r", "d", "cl", "ref", "fig", "rem", "periph"]);
const TEXT_SFM = new Set(["m", "pi", "pc", "pr", "pm", "pmo", "pmc", "pmr", "nb", "mi", "li", "lim"]);
const BREAK_TAGS = new Set(["p", "q", "b", "tr", "tc", "th", "l"]);
const TOKEN = /<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<(\/?)([A-Za-z][\w:.-]*)([^>]*?)(\/?)>|([^<]+)/g;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
  if (e[0] === "#") return String.fromCodePoint(e[1]?.toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return ENTITIES[e.toLowerCase()] ?? m;
});
const attr = (attrs: string, name: string) => new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`).exec(attrs)?.[1];

export function parseUsfx(xml: string): ParsedBook[] {
  const books: ParsedBook[] = [];
  let book: ParsedBook | null = null;
  let chapter: ParsedChapter | null = null;
  let verse: { n: number; buf: string } | null = null;
  const stack: boolean[] = []; // true = élément écarté
  let skip = 0;

  const flush = () => {
    if (verse && chapter) chapter.v.push([verse.n, verse.buf.replace(/\s+/g, " ").trim().normalize("NFC")]);
    verse = null;
  };
  const isSkipped = (tag: string, attrs: string) => SKIP_TAGS.has(tag) || (tag === "p" && (() => { const s = attr(attrs, "sfm"); return s !== undefined && !TEXT_SFM.has(s); })());

  TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN.exec(xml))) {
    if (m[5] !== undefined) { if (verse && skip === 0) verse.buf += decode(m[5]); continue; }
    if (m[2] === undefined) continue; // déclaration XML ou commentaire
    const closing = m[1] === "/", tag = m[2], attrs = m[3] ?? "", selfClosing = m[4] === "/";

    if (closing) {
      if (tag === "book") { flush(); book = null; chapter = null; }
      const wasSkipped = stack.pop();
      if (wasSkipped) skip--;
      if (verse && skip === 0 && BREAK_TAGS.has(tag)) verse.buf += " ";
      continue;
    }
    if (tag === "book") { book = { id: attr(attrs, "id") ?? "", chapters: [] }; books.push(book); chapter = null; verse = null; }
    else if (tag === "c") { flush(); const n = parseInt(attr(attrs, "id") ?? "", 10); if (book && Number.isFinite(n)) { chapter = { c: n, v: [] }; book.chapters.push(chapter); } }
    else if (tag === "v") { flush(); const n = parseInt(attr(attrs, "id") ?? "", 10); if (chapter && Number.isFinite(n)) verse = { n, buf: "" }; }
    else if (tag === "ve") flush();
    else if (verse && skip === 0 && BREAK_TAGS.has(tag)) verse.buf += " ";

    if (!selfClosing) { const sk = isSkipped(tag, attrs); stack.push(sk); if (sk) skip++; }
  }
  flush();
  return books;
}
