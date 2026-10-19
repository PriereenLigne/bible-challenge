import { PROTESTANT_CANON } from "@/lib/bible/canon";

export type ScopeId = "full" | "ot" | "nt" | "gospels" | "psalms" | "proverbs";
export const SCOPES: Record<ScopeId, { label: string; books: string[] }> = {
  full: { label: "Bible entière", books: PROTESTANT_CANON.map((b) => b.id) },
  ot: { label: "Ancien Testament", books: PROTESTANT_CANON.filter((b) => b.testament === "AT").map((b) => b.id) },
  nt: { label: "Nouveau Testament", books: PROTESTANT_CANON.filter((b) => b.testament === "NT").map((b) => b.id) },
  gospels: { label: "Les quatre Évangiles", books: ["MAT", "MRK", "LUK", "JHN"] },
  psalms: { label: "Psaumes", books: ["PSA"] },
  proverbs: { label: "Proverbes", books: ["PRO"] },
};

/** Durées prédéfinies. Les mois valent 30,4375 jours arrondis (365,25 / 12), documenté dans docs/ARCHITECTURE.md. */
export const DURATIONS = [
  { id: "12m", label: "1 an", days: 365 },
  { id: "10m", label: "10 mois", days: 304 },
  { id: "9m", label: "9 mois", days: 274 },
  { id: "8m", label: "8 mois", days: 243 },
  { id: "7m", label: "7 mois", days: 213 },
  { id: "6m", label: "6 mois", days: 183 },
  { id: "5m", label: "5 mois", days: 152 },
  { id: "4m", label: "4 mois", days: 122 },
  { id: "3m", label: "3 mois", days: 91 },
  { id: "2m", label: "2 mois", days: 61 },
  { id: "1m", label: "1 mois", days: 30 },
  { id: "3w", label: "3 semaines", days: 21 },
  { id: "2w", label: "2 semaines", days: 14 },
] as const;
