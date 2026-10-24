export interface ReminderSettings { enabled: boolean; time: string; days: number[] } // days : 0 = dimanche … 6 = samedi
export const DEFAULT_REMINDER: ReminderSettings = { enabled: false, time: "07:00", days: [0, 1, 2, 3, 4, 5, 6] };
export const isValidTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
export const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"] as const;

/** Vrai si un rappel discret doit s'afficher dans l'application : activé, bon jour, heure passée, lecture du jour pas terminée. */
export function shouldNudge(s: ReminderSettings, dow: number, minutesNow: number, todayDone: boolean): boolean {
  if (!s.enabled || todayDone || !s.days.includes(dow) || !isValidTime(s.time)) return false;
  const [h, m] = s.time.split(":").map(Number) as [number, number];
  return minutesNow >= h * 60 + m;
}
