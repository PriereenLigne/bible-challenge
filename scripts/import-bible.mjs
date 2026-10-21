// Usage : node scripts/import-bible.mjs <dossier-usfm | fichier.xml (usfx)> <id-version> [--force]
// Exemple : node scripts/import-bible.mjs ./fraLSG_usfx/fraLSG_usfx.xml lsg
// Nécessite Node 22.18+. Écrit public/bibles/<id>/<LIVRE>.json et affiche un rapport de conformité.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { PROTESTANT_CANON } from "../src/lib/bible/canon.ts";
import { parseUsfm, validateBook } from "../src/lib/bible/usfm.ts";
import { parseUsfx } from "../src/lib/bible/usfx.ts";

const [input, versionId, ...flags] = process.argv.slice(2);
if (!input || !versionId) { console.error("Usage : node scripts/import-bible.mjs <dossier-usfm | fichier.xml> <id-version> [--force]"); process.exit(2); }
const out = join("public", "bibles", versionId);
mkdirSync(out, { recursive: true });

const books = statSync(input).isDirectory()
  ? readdirSync(input).filter((f) => /\.(usfm|sfm)$/i.test(f)).map((f) => parseUsfm(readFileSync(join(input, f), "utf8")))
  : parseUsfx(readFileSync(input, "utf8"));

const seen = new Map(); const issues = []; let bytes = 0;
for (const book of books) {
  const def = PROTESTANT_CANON.find((b) => b.id === book.id);
  if (!def) { console.log(`ignoré (hors canon protestant) : [${book.id}]`); continue; }
  issues.push(...validateBook(book, def));
  const json = JSON.stringify(book);
  writeFileSync(join(out, `${def.id}.json`), json);
  bytes += Buffer.byteLength(json);
  seen.set(def.id, book.chapters.reduce((s, c) => s + c.v.length, 0));
}
const missing = PROTESTANT_CANON.filter((b) => !seen.has(b.id)).map((b) => b.id);
console.log(`${seen.size}/66 livres écrits, ${[...seen.values()].reduce((a, b) => a + b, 0)} versets, ${(bytes / 1e6).toFixed(2)} Mo`);
if (missing.length) console.log("LIVRES MANQUANTS :", missing.join(", "));
if (issues.length) { console.log(`${issues.length} anomalie(s) :`); issues.slice(0, 80).forEach((i) => console.log(" -", i)); }
console.log(`TOTAL_BYTES=${bytes}`);
if ((missing.length || issues.length) && !flags.includes("--force")) { console.error("Import incomplet ou non conforme (--force pour accepter)."); process.exit(1); }
