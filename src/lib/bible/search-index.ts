import { PROTESTANT_CANON } from "@/lib/bible/canon";
import { BibleIndex } from "@/lib/bible/search";
import { loadBook, loadVersions } from "@/lib/bible/store";

let pending: Promise<BibleIndex> | null = null;
const listeners = new Set<(done: number, total: number) => void>();
let progress = 0;

/**
 * Index de recherche de toute la Bible, construit une seule fois par session.
 * Les livres passent par le Service Worker : déjà téléchargés, ils se lisent aussi hors connexion.
 */
export function loadSearchIndex(onProgress?: (done: number, total: number) => void): Promise<BibleIndex> {
  const total = PROTESTANT_CANON.length;
  if (onProgress) { listeners.add(onProgress); onProgress(progress, total); }
  if (!pending) {
    pending = (async () => {
      const v = (await loadVersions())[0];
      if (!v) throw new Error("Aucun texte biblique installé.");
      const idx = new BibleIndex();
      const ids = PROTESTANT_CANON.map((b) => b.id);
      const books = new Map<string, Awaited<ReturnType<typeof loadBook>>>();
      let next = 0;
      async function worker() {
        while (next < ids.length) {
          const id = ids[next++]!;
          books.set(id, await loadBook(v!, id));
          progress++; for (const l of listeners) l(progress, total);
        }
      }
      await Promise.all(Array.from({ length: 6 }, worker));
      // indexation dans l'ordre du canon, en rendant la main entre les livres pour ne pas figer l'écran
      for (const id of ids) {
        for (const ch of books.get(id)!.chapters) for (const [n, text] of ch.v) idx.add({ book: id, chapter: ch.c, verse: n, text });
        await new Promise((r) => setTimeout(r, 0));
      }
      return idx;
    })().catch((e) => { pending = null; progress = 0; throw e; });
  }
  return pending.finally(() => { if (onProgress) listeners.delete(onProgress); });
}
