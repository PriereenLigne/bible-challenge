export interface BibleVersion {
  id: string; name: string; language: string; publisher: string; license: string;
  allowReproduction: boolean; allowOffline: boolean; allowAudio: boolean;
  attribution: string; isTestData: boolean; revision: number; sizeBytes: number;
  /** Enregistrement audio autorisé (facultatif). */
  audio?: { item: string; provider: string; license: string; licenseUrl: string; sourceUrl: string; attribution: string };
}
export interface BookText { id: string; chapters: { c: number; t?: string; v: [number, string][] }[] }

export const BIBLE_CACHE = "bc-bible-v1"; // distinct de bc-shell-* : jamais supprimé par le nettoyage de la coquille
const bookUrl = (v: BibleVersion, book: string) => `/bibles/${v.id}/${book}.json?r=${v.revision}`;

/** Registre des traductions installées. Vide si aucun texte n'a été installé. */
export async function loadVersions(): Promise<BibleVersion[]> {
  try {
    const r = await fetch("/bibles/versions.json", { cache: "no-cache" });
    if (!r.ok) return [];
    const list = (await r.json()) as BibleVersion[];
    return list.filter((v) => v.allowReproduction); // jamais d'affichage sans autorisation enregistrée
  } catch { return []; }
}

export async function loadBook(v: BibleVersion, book: string): Promise<BookText> {
  const r = await fetch(bookUrl(v, book));
  if (!r.ok) throw new Error(`Texte indisponible (${r.status}). Connectez-vous à Internet ou téléchargez la traduction.`);
  return (await r.json()) as BookText;
}

export const cacheSupported = () => typeof caches !== "undefined";

export async function downloadedBooks(v: BibleVersion, ids: readonly string[]): Promise<number> {
  if (!cacheSupported()) return 0;
  const c = await caches.open(BIBLE_CACHE);
  let n = 0;
  for (const id of ids) if (await c.match(bookUrl(v, id))) n++;
  return n;
}

/** Télécharge livre par livre ; reprend là où il s'est arrêté (les livres déjà en cache sont ignorés). */
export async function downloadVersion(v: BibleVersion, ids: readonly string[], onProgress: (done: number) => void): Promise<void> {
  if (!v.allowOffline) throw new Error("Le téléchargement hors connexion n'est pas autorisé pour cette traduction.");
  if (!cacheSupported()) throw new Error("Le stockage hors connexion n'est pas disponible sur ce navigateur.");
  const c = await caches.open(BIBLE_CACHE);
  let done = 0;
  for (const id of ids) {
    const url = bookUrl(v, id);
    if (!(await c.match(url))) {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Échec du téléchargement de ${id} (${r.status})`);
      await c.put(url, r);
    }
    onProgress(++done);
  }
}

export async function removeDownload(v: BibleVersion): Promise<void> {
  if (!cacheSupported()) return;
  const c = await caches.open(BIBLE_CACHE);
  for (const req of await c.keys()) if (new URL(req.url).pathname.startsWith(`/bibles/${v.id}/`)) await c.delete(req);
}
