export interface ArchiveFile { name: string; title?: string; format?: string }
export const norm = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();

// Ordre de préférence : le plus léger d'abord. Les autres formats (images, archives, métadonnées) sont ignorés.
const FORMAT_RANK: Record<string, number> = { "vbr mp3": 0, "128kbps mp3": 1, "64kbps mp3": 2, mp3: 3 };

/** Associe « titre normalisé » → nom de fichier, à partir de la liste fournie par l'API de métadonnées d'Internet Archive. */
export function buildTrackIndex(files: readonly ArchiveFile[]): Record<string, string> {
  const best = new Map<string, { name: string; rank: number }>();
  for (const f of files) {
    const rank = FORMAT_RANK[(f.format ?? "").toLowerCase()];
    if (rank === undefined || !/\.mp3$/i.test(f.name)) continue;
    const key = norm(f.title ?? f.name.replace(/\.mp3$/i, ""));
    const cur = best.get(key);
    if (!cur || rank < cur.rank || (rank === cur.rank && f.name < cur.name)) best.set(key, { name: f.name, rank }); // déterministe
  }
  return Object.fromEntries([...best].map(([k, v]) => [k, v.name]));
}

export const trackUrl = (item: string, fileName: string) => `https://archive.org/download/${item}/${fileName.split("/").map(encodeURIComponent).join("/")}`;
