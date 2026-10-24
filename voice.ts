export interface VoiceLike { lang: string; localService: boolean; name: string }

/** Meilleure voix française : fr-FR avant les autres variantes ; voix locale (fonctionne hors connexion) d'abord si on est hors connexion. */
export function pickVoice<T extends VoiceLike>(voices: readonly T[], online: boolean): T | null {
  const fr = voices.filter((v) => /^fr([-_]|$)/i.test(v.lang));
  if (fr.length === 0) return null;
  const score = (v: T) => (/^fr[-_]fr$/i.test(v.lang) ? 2 : 0) + (v.localService ? (online ? 1 : 4) : 0);
  return [...fr].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))[0] ?? null;
}
