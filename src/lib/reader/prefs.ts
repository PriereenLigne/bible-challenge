/** Préférences d'affichage du texte biblique, mémorisées sur l'appareil. */
export type Leading = "compact" | "normal" | "airy";
export type ReadingFont = "serif" | "sans";

export interface ReaderPrefs {
  size: number;
  leading: Leading;
  font: ReadingFont;
  /** Afficher les numéros de versets. */
  numbers: boolean;
}

export const DEFAULT_PREFS: ReaderPrefs = { size: 19, leading: "normal", font: "serif", numbers: true };
export const SIZE_MIN = 15;
export const SIZE_MAX = 30;
export const LINE_HEIGHT: Record<Leading, number> = { compact: 1.55, normal: 1.75, airy: 2 };

/** Relit des préférences enregistrées en écartant toute valeur invalide (version précédente, donnée abîmée). */
export function normalizePrefs(raw: unknown, legacySize?: number): ReaderPrefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof ReaderPrefs, unknown>>;
  const size = typeof r.size === "number" ? r.size : legacySize;
  return {
    size: typeof size === "number" && Number.isFinite(size) ? Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.round(size))) : DEFAULT_PREFS.size,
    leading: r.leading === "compact" || r.leading === "airy" || r.leading === "normal" ? r.leading : DEFAULT_PREFS.leading,
    font: r.font === "sans" || r.font === "serif" ? r.font : DEFAULT_PREFS.font,
    numbers: typeof r.numbers === "boolean" ? r.numbers : DEFAULT_PREFS.numbers,
  };
}

/** Recherche de livre insensible aux accents, à la casse et aux espaces (« genese », « 1 cor »). */
export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, "");

/** Balayage horizontal net : assez long, peu vertical, assez rapide. 1 = suivant, -1 = précédent. */
export function swipeDirection(dx: number, dy: number, ms: number): 1 | -1 | 0 {
  if (Math.abs(dx) < 80 || Math.abs(dy) > 50 || Math.abs(dy) > Math.abs(dx) / 2 || ms > 700) return 0;
  return dx < 0 ? 1 : -1;
}
