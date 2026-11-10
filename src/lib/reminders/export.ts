import { buildReminderIcs } from "@/lib/reminders/ics";
import { localToday } from "@/lib/challenges/active";
import type { ReminderSettings } from "@/lib/reminders/settings";

/** Télécharge le fichier calendrier (.ics) du rappel : l'alarme sonne même application fermée. */
export function downloadReminderIcs(s: Pick<ReminderSettings, "time" | "days">): void {
  const ics = buildReminderIcs({ time: s.time, days: s.days, url: window.location.origin, today: localToday(), now: new Date() });
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = "rappel-bible-challenge.ics"; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
