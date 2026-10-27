// Usage : node scripts/import-usfm.mjs <dossier-usfm> <id-version> [--force]
// Exemple : node scripts/import-usfm.mjs ./fraLSG_usfm lsg
// Nécessite Node 22.18+ (lecture directe des fichiers .ts). Écrit public/bibles/<id>/<LIVRE>.json
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { PROTESTANT_CANON } from "../src/lib/bible/canon.ts";
import { parseUsfm, validateBook } from "../src/lib/bible/usfm.ts";

const [dir, versionId, ...flags] = process.argv.slice(2);
if (!dir || !versionId) { console.error("Usage : node scripts/import-usfm.mjs <dossier-usfm> <id-version> [--force]"); process.exit(2); }
const out = join("public", "bibles", versionId);
mkdirSync(out, { recursive: true });

const files = readdirSync(dir).filter((f) => /\.(usfm|sfm|usx)$/i.test(f) && !f.startsWith("."));
const seen = new Map(); const issues = []; let bytes = 0;
for (const f of files) {
  const book = parseUsfm(readFileSync(join(dir, f), "utf8"));
  const def = PROTESTANT_CANON.find((b) => b.id === book.id);
  if (!def) { console.log(`ignoré (hors canon protestant) : ${f} [${book.id}]`); continue; }
  issues.push(...validateBook(book, def));
  const json = JSON.stringify(book);
  writeFileSync(join(out, `${def.id}.json`), json);
  bytes += Buffer.byteLength(json);
  seen.set(def.id, book.chapters.reduce((s, c) => s + c.v.length, 0));
}
const missing = PROTESTANT_CANON.filter((b) => !seen.has(b.id)).map((b) => b.id);
console.log(`${seen.size}/66 livres écrits, ${[...seen.values()].reduce((a, b) => a + b, 0)} versets, ${(bytes / 1e6).toFixed(2)} Mo`);
if (missing.length) console.log("LIVRES MANQUANTS :", missing.join(", "));
if (issues.length) { console.log(`${issues.length} anomalie(s) :`); issues.slice(0, 60).forEach((i) => console.log(" -", i)); }
console.log(`TOTAL_BYTES=${bytes}`);
if ((missing.length || issues.length) && !flags.includes("--force")) { console.error("Import incomplet ou non conforme (relancez avec --force pour accepter)."); process.exit(1); }
