import { kv } from "@/lib/offline/local-db";
import { audioTitle } from "./titles";
import { buildTrackIndex, norm, trackUrl, type ArchiveFile } from "./archive";

export const AUDIO_CACHE = "bc-audio-v1"; // distinct de bc-shell-* et bc-bible-* : jamais effacé par la mise à jour de l'application
const MAX_AGE = 30 * 86_400_000;

/** Liste des pistes (titre → fichier), mémorisée 30 jours pour fonctionner hors connexion. */
export async function getTrackIndex(item: string): Promise<Record<string, string>> {
  const key = `audio:index:${item}`;
  const cached = await kv.get<{ map: Record<string, string>; at: number }>(key).catch(() => undefined);
  if (cached && (!navigator.onLine || Date.now() - cached.at < MAX_AGE)) return cached.map;
  try {
    const r = await fetch(`https://archive.org/metadata/${item}`);
    if (!r.ok) throw new Error(`Liste des enregistrements indisponible (${r.status}).`);
    const json = (await r.json()) as { files?: ArchiveFile[] };
    const map = buildTrackIndex(json.files ?? []);
    if (Object.keys(map).length === 0) throw new Error("Aucun enregistrement trouvé dans la liste.");
    await kv.set(key, { map, at: Date.now() });
    return map;
  } catch (e) {
    if (cached) return cached.map; // liste périmée mais utilisable
    throw new Error(`${(e as Error).message || "Réseau indisponible"} Utilisez la voix du téléphone en attendant.`);
  }
}

export async function chapterAudioUrl(item: string, book: string, chapter: number): Promise<string | null> {
  const title = audioTitle(book, chapter); if (!title) return null;
  const file = (await getTrackIndex(item))[norm(title)];
  return file ? trackUrl(item, file) : null;
}

export const audioCacheSupported = () => typeof caches !== "undefined";
export async function isAudioCached(url: string): Promise<boolean> { return audioCacheSupported() && !!(await (await caches.open(AUDIO_CACHE)).match(url)); }

/** Copie le chapitre sur l'appareil (fichier inchangé). Peut échouer si le serveur n'autorise pas la copie depuis une application web. */
export async function downloadAudio(url: string): Promise<void> {
  if (!audioCacheSupported()) throw new Error("Le stockage hors connexion n'est pas disponible sur ce navigateur.");
  const c = await caches.open(AUDIO_CACHE);
  if (await c.match(url)) return;
  let r: Response;
  try { r = await fetch(url); } catch { throw new Error("Téléchargement impossible : l'écoute en ligne reste disponible."); }
  if (!r.ok) throw new Error(`Téléchargement impossible (${r.status}).`);
  await c.put(url, r);
}

/** Adresse lisible : copie locale si elle existe, sinon l'adresse en ligne. */
export async function playableSrc(url: string): Promise<{ src: string; revoke: () => void }> {
  if (audioCacheSupported()) {
    const hit = await (await caches.open(AUDIO_CACHE)).match(url);
    if (hit) { const obj = URL.createObjectURL(await hit.blob()); return { src: obj, revoke: () => URL.revokeObjectURL(obj) }; }
  }
  return { src: url, revoke: () => {} };
}
