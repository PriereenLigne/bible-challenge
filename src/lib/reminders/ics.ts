import { isValidTime } from "./settings";

const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Replie les lignes à 75 octets (RFC 5545), sans couper un caractère multi-octets. */
export function foldLine(line: string): string {
  const enc = new TextEncoder(); const out: string[] = []; let cur = ""; let bytes = 0; let limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > limit) { out.push(cur); cur = " "; bytes = 1; limit = 75; }
    cur += ch; bytes += n;
  }
  out.push(cur);
  return out.join("\r\n");
}

/**
 * Rappel quotidien au format calendrier (.ics) : l'heure est « flottante » (heure locale de l'appareil)
 * et l'alarme se déclenche même application fermée, sur iPhone comme sur Android.
 */
export function buildReminderIcs(o: { time: string; days: number[]; url: string; today: string; now: Date }): string {
  if (!isValidTime(o.time)) throw new Error("Heure invalide");
  const days = [...new Set(o.days)].filter((d) => d >= 0 && d <= 6).sort();
  if (days.length === 0) throw new Error("Choisissez au moins un jour");
  const rule = days.length === 7 ? "FREQ=DAILY" : `FREQ=WEEKLY;BYDAY=${days.map((d) => BYDAY[d]).join(",")}`;
  const stamp = o.now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const start = `${o.today.replace(/-/g, "")}T${o.time.replace(":", "")}00`;
  const text = `C'est l'heure de votre lecture. Ouvrez Bible Challenge : ${o.url}`;
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Bible Challenge//Rappel//FR", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT", "UID:rappel-lecture@bible-challenge", `DTSTAMP:${stamp}`, `DTSTART:${start}`, "DURATION:PT15M", `RRULE:${rule}`,
    "SUMMARY:Lecture biblique · Bible Challenge", `DESCRIPTION:${esc(text)}`, `URL:${o.url}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc("C'est l'heure de votre lecture 🌿")}`, "TRIGGER:PT0M", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
