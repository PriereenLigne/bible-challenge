import { describe, it, expect } from "vitest";
import { rankMembers, ordinalFr } from "@/lib/ranking/rank";
import { reconcileMark } from "@/lib/marks/reconcile";
import { bestStreak, summarize, weeklyBilan } from "@/lib/stats/dashboard";
import { buildReminderIcs, foldLine } from "@/lib/reminders/ics";
import { shouldNudge, isValidTime } from "@/lib/reminders/settings";
import { validatePayload } from "@/lib/validation/ops";
import type { MemberProgress } from "@/lib/teams/stats";
import type { LocalMark, ServerMark } from "@/lib/marks/types";

const m = (id: string, shares: boolean, chapters: number | null, days: number | null): MemberProgress => ({ user_id: id, display_name: id, role: "member", shares, chapters_read: chapters, days_done: days, last_read_on: null });

describe("classement", () => {
  const rows = [m("ana", true, 10, 3), m("bob", true, 20, 5), m("cleo", true, 20, 5), m("dan", true, 4, 1), m("eve", false, null, null)];
  const r = rankMembers(rows, "ana");
  it("classe par jours terminés puis chapitres, égalité = même rang", () => { expect(r.ranked.map((x) => [x.name, x.rank])).toEqual([["bob", 1], ["cleo", 1], ["ana", 3], ["dan", 4]]); });
  it("les membres qui ne partagent pas ne sont pas classés", () => { expect(r.notSharing.map((x) => x.name)).toEqual(["eve"]); expect(r.ranked.some((x) => x.name === "eve")).toBe(false); });
  it("repère mon rang et propose un message positif", () => { expect(r.me?.rank).toBe(3); expect(r.hint).toBe("Encore 2 jours pour rejoindre le 1er rang."); });
  it("en tête / égalité en tête", () => {
    expect(rankMembers(rows, "bob").hint).toBe("Vous êtes à égalité en tête, bravo !");
    expect(rankMembers([m("a", true, 9, 4), m("b", true, 1, 1)], "a").hint).toBe("Vous êtes en tête : continuez ainsi !");
  });
  it("écart en chapitres quand les jours sont égaux", () => { expect(rankMembers([m("a", true, 5, 2), m("b", true, 8, 2)], "a").hint).toBe("Encore 3 chapitres pour rejoindre le 1er rang."); });
  it("si je ne partage pas : explication, jamais de classement caché", () => { expect(rankMembers([m("a", false, 5, 2), m("b", true, 1, 1)], "a").hint).toContain("n’est pas partagée"); });
  it("seul membre : pas de message de comparaison", () => { expect(rankMembers([m("a", true, 1, 1)], "a").hint).toBe(null); });
  it("ordinaux français", () => { expect([1, 2, 3].map(ordinalFr)).toEqual(["1er", "2e", "3e"]); });
});

describe("favoris et surlignage : dernier écrit gagne", () => {
  const L = (o: Partial<LocalMark>): LocalMark => ({ key: "JHN:3:16", book: "JHN", chapter: 3, verse: 16, favorite: false, color: null, ts: 100, dirty: true, ...o });
  const S = (o: Partial<ServerMark>): ServerMark => ({ book: "JHN", chapter: 3, verse: 16, favorite: true, color: "jaune", ts: 200, ...o });
  it("marque inconnue : adoptée", () => { expect(reconcileMark(undefined, S({}), false).mark).toMatchObject({ favorite: true, color: "jaune", dirty: false }); });
  it("opération en file : jamais écrasée", () => { expect(reconcileMark(L({}), S({}), true).changed).toBe(false); });
  it("serveur plus récent : adopté", () => { expect(reconcileMark(L({}), S({ ts: 300 }), false).mark.ts).toBe(300); });
  it("même horodatage : devient propre", () => { const r = reconcileMark(L({ ts: 200 }), S({ ts: 200 }), false); expect(r.mark.dirty).toBe(false); expect(r.requeue).toBe(false); });
  it("appareil plus récent et rien en file : renvoi", () => { expect(reconcileMark(L({ ts: 500 }), S({ ts: 200 }), false).requeue).toBe(true); });
});

describe("statistiques et bilan", () => {
  const reads = [
    { challengeId: "a", book: "PSA", chapter: 1, readOn: "2027-01-08" }, { challengeId: "a", book: "PSA", chapter: 2, readOn: "2027-01-09" },
    { challengeId: "b", book: "PSA", chapter: 2, readOn: "2027-01-10" }, // même chapitre dans un autre défi : compté une fois
  ];
  const days = [{ challengeId: "a", dayIndex: 0, doneOn: "2027-01-09", score: 3, total: 3 }, { challengeId: "a", dayIndex: 1, doneOn: "2027-01-10", score: 2, total: 3 }];
  it("série la plus longue", () => { expect(bestStreak(["2027-01-01", "2027-01-02", "2027-01-03", "2027-01-05", "2027-01-06"])).toBe(3); expect(bestStreak([])).toBe(0); });
  it("résumé : chapitres distincts, série en cours, quiz parfaits", () => {
    const s = summarize(reads, days, "2027-01-10");
    expect([s.distinctChapters, s.daysDone, s.activeDays, s.streak, s.best, s.perfectQuizzes]).toEqual([2, 2, 3, 3, 3, 1]);
  });
  it("bilan des 7 derniers jours", () => {
    const b = weeklyBilan(reads, days, ["2027-01-09", "2026-12-01"], "2027-01-10");
    expect(b.days).toHaveLength(7); expect(b.days[6]?.date).toBe("2027-01-10"); expect(b.days[0]?.date).toBe("2027-01-04");
    expect([b.totalChapters, b.daysCompleted, b.notesWritten, b.activeDays]).toEqual([3, 2, 1, 3]);
    expect(b.headline).toContain("3 jours");
  });
  it("semaine vide : message d'encouragement, jamais de reproche", () => { expect(weeklyBilan([], [], [], "2027-01-10").headline).toContain("un seul chapitre suffit"); });
});

describe("rappels", () => {
  const S = { enabled: true, time: "07:30", days: [1, 2, 3] };
  it("n'affiche le rappel qu'au bon jour, après l'heure, si la lecture n'est pas faite", () => {
    expect(shouldNudge(S, 1, 7 * 60 + 29, false)).toBe(false);
    expect(shouldNudge(S, 1, 7 * 60 + 30, false)).toBe(true);
    expect(shouldNudge(S, 1, 600, true)).toBe(false);
    expect(shouldNudge(S, 0, 600, false)).toBe(false);
    expect(shouldNudge({ ...S, enabled: false }, 1, 600, false)).toBe(false);
  });
  it("valide l'heure", () => { expect(isValidTime("07:05")).toBe(true); expect(isValidTime("24:00")).toBe(false); expect(isValidTime("7:5")).toBe(false); });
  it("génère un .ics quotidien avec alarme, fins de ligne CRLF", () => {
    const ics = buildReminderIcs({ time: "06:45", days: [0, 1, 2, 3, 4, 5, 6], url: "https://exemple.test", today: "2027-01-05", now: new Date(Date.UTC(2027, 0, 5, 12)) });
    expect(ics).toContain("RRULE:FREQ=DAILY"); expect(ics).toContain("DTSTART:20270105T064500"); expect(ics).toContain("TRIGGER:PT0M"); expect(ics).toContain("DTSTAMP:20270105T120000Z");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true); expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true); expect(ics.replace(/\r\n/g, "").includes("\n")).toBe(false);
  });
  it("jours choisis : hebdomadaire avec BYDAY", () => { expect(buildReminderIcs({ time: "07:00", days: [1, 3, 5], url: "https://x.test", today: "2027-01-05", now: new Date(0) })).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"); });
  it("refuse une heure invalide ou aucun jour", () => {
    expect(() => buildReminderIcs({ time: "99:99", days: [1], url: "x", today: "2027-01-05", now: new Date(0) })).toThrow();
    expect(() => buildReminderIcs({ time: "07:00", days: [], url: "x", today: "2027-01-05", now: new Date(0) })).toThrow();
  });
  it("replie les lignes longues à 75 octets au plus", () => {
    const folded = foldLine("DESCRIPTION:" + "é".repeat(120));
    for (const l of folded.split("\r\n")) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, "")).toBe("DESCRIPTION:" + "é".repeat(120));
  });
});

describe("validation : marques de versets", () => {
  const ok = { type: "verse_mark" as const, book: "JHN", chapter: 3, verse: 16, favorite: true, color: "jaune", ts: 1700000000000 };
  it("accepte une marque valide, avec ou sans couleur", () => { expect(validatePayload(ok).ok).toBe(true); expect(validatePayload({ ...ok, color: null }).ok).toBe(true); });
  it("refuse couleur inconnue, chapitre hors limites, horodatage nul", () => {
    expect(validatePayload({ ...ok, color: "fuchsia" }).ok).toBe(false);
    expect(validatePayload({ ...ok, chapter: 22 }).ok).toBe(false);
    expect(validatePayload({ ...ok, ts: 0 }).ok).toBe(false);
    expect(validatePayload({ ...ok, verse: 0 }).ok).toBe(false);
  });
});
