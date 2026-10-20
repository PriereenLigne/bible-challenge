import { generatePlan, type GeneratedPlan, type PlanDay } from "@/lib/plans/generate";

export interface ChallengeLite { id: string; title: string; scope: string; book_ids: string[]; start_date: string; end_date: string; status: string }
export type TodayState =
  | { kind: "not_started"; startsIn: number }
  | { kind: "running"; dayIndex: number; totalDays: number; day: PlanDay }
  | { kind: "ended" };

const ms = (iso: string) => { const [y, m, d] = iso.split("-").map(Number) as [number, number, number]; return Date.UTC(y, m - 1, d); };
export const dayDiff = (a: string, b: string) => Math.round((ms(b) - ms(a)) / 86_400_000);

/** Date locale de l'appareil (pas UTC) : « aujourd'hui » pour l'utilisateur. */
export function localToday(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export const planOf = (c: ChallengeLite): GeneratedPlan => generatePlan(c.book_ids, dayDiff(c.start_date, c.end_date) + 1, c.start_date);

export function todayState(c: ChallengeLite, today: string): TodayState {
  if (today < c.start_date) return { kind: "not_started", startsIn: dayDiff(today, c.start_date) };
  if (today > c.end_date) return { kind: "ended" };
  const plan = planOf(c);
  const dayIndex = dayDiff(c.start_date, today);
  const day = plan.days[dayIndex];
  if (!day) return { kind: "ended" };
  return { kind: "running", dayIndex, totalDays: plan.days.length, day };
}

/** Défi à afficher : celui en cours (le plus récent), sinon le prochain à venir. */
export function pickChallenge(list: ChallengeLite[], today: string): ChallengeLite | null {
  const running = list.filter((c) => c.start_date <= today && today <= c.end_date).sort((a, b) => b.start_date.localeCompare(a.start_date));
  if (running[0]) return running[0];
  return list.filter((c) => c.start_date > today).sort((a, b) => a.start_date.localeCompare(b.start_date))[0] ?? null;
}
