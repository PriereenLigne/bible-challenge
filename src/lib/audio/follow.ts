/**
 * Suivi du texte pendant l'écoute d'un enregistrement.
 *
 * Les fichiers audio ne contiennent pas le minutage des versets : on l'estime en répartissant
 * la durée du chapitre proportionnellement à la longueur de chaque verset, plus une courte pause
 * entre deux versets. Le début du fichier (annonce « Livre, chapitre N ») et la fin sont exclus.
 * L'estimation se recale à chaque fois que l'utilisateur choisit « Écouter à partir d'ici ».
 */
export interface FollowOptions {
  /** Secondes d'annonce au début du fichier, avant le premier verset. */
  intro: number;
  /** Secondes de silence à la fin du fichier. */
  outro: number;
  /** Pause entre deux versets, exprimée en nombre de caractères équivalents. */
  pauseChars: number;
}

export const DEFAULT_FOLLOW: FollowOptions = { intro: 3, outro: 1, pauseChars: 12 };

export interface Timeline {
  verses: number[];
  /** Début de chaque verset, en fraction (0 → 1) de la partie lue du fichier. */
  starts: number[];
}

export function buildTimeline(verses: readonly (readonly [number, string])[], o: FollowOptions = DEFAULT_FOLLOW): Timeline {
  const weights = verses.map(([, t]) => t.length + o.pauseChars);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const starts: number[] = [];
  let acc = 0;
  for (const w of weights) { starts.push(acc / total); acc += w; }
  return { verses: verses.map(([n]) => n), starts };
}

function span(duration: number, o: FollowOptions): { from: number; len: number } {
  // Fichier très court ou durée inconnue : on n'enlève pas l'annonce, pour ne pas fausser l'estimation.
  if (!Number.isFinite(duration) || duration <= 0) return { from: 0, len: 0 };
  const intro = duration > (o.intro + o.outro) * 4 ? o.intro : 0;
  const outro = intro ? o.outro : 0;
  return { from: intro, len: duration - intro - outro };
}

/** Verset estimé à l'instant `time` (secondes), ou null si la durée est inconnue ou le chapitre vide. */
export function verseAt(tl: Timeline, time: number, duration: number, o: FollowOptions = DEFAULT_FOLLOW): number | null {
  const { from, len } = span(duration, o);
  if (len <= 0 || tl.verses.length === 0) return null;
  const f = Math.min(Math.max((time - from) / len, 0), 0.999999);
  let lo = 0, hi = tl.starts.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if ((tl.starts[mid] as number) <= f) lo = mid; else hi = mid - 1; }
  return tl.verses[lo] ?? null;
}

/** Instant estimé (secondes) du début d'un verset. */
export function timeForVerse(tl: Timeline, verse: number, duration: number, o: FollowOptions = DEFAULT_FOLLOW): number | null {
  const i = tl.verses.indexOf(verse);
  const { from, len } = span(duration, o);
  if (i < 0 || len <= 0) return null;
  // Légère avance : mieux vaut entendre la fin du verset précédent que manquer le début de celui-ci.
  return Math.max(0, from + (tl.starts[i] as number) * len - 0.4);
}
