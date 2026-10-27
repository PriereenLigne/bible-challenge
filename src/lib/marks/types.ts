export const MARK_COLORS = ["jaune", "vert", "bleu", "rose", "orange"] as const;
export type MarkColor = (typeof MARK_COLORS)[number];
export const COLOR_LABEL: Record<MarkColor, string> = { jaune: "Jaune", vert: "Vert", bleu: "Bleu", rose: "Rose", orange: "Orange" };
export const markKey = (book: string, chapter: number, verse: number) => `${book}:${chapter}:${verse}`;

export interface LocalMark { key: string; book: string; chapter: number; verse: number; favorite: boolean; color: MarkColor | null; ts: number; dirty: boolean }
export interface ServerMark { book: string; chapter: number; verse: number; favorite: boolean; color: MarkColor | null; ts: number }
/** Une marque « vide » (ni favori ni couleur) est une suppression conservée pour la synchronisation. */
export const isActive = (m: { favorite: boolean; color: MarkColor | null }) => m.favorite || m.color !== null;
