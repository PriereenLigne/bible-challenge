import { describe, it, expect } from "vitest";
import { todayState, pickChallenge, localToday, dayDiff, type ChallengeLite } from "@/lib/challenges/active";

const nt: ChallengeLite = { id: "c1", title: "NT", scope: "nt", book_ids: ["MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "REV"], start_date: "2027-01-01", end_date: "2027-04-01", status: "active" };

describe("lecture du jour", () => {
  it("avant le début", () => { expect(todayState(nt, "2026-12-30")).toEqual({ kind: "not_started", startsIn: 2 }); });
  it("premier jour : commence par Matthieu 1", () => {
    const s = todayState(nt, "2027-01-01");
    expect(s.kind).toBe("running");
    if (s.kind === "running") { expect(s.dayIndex).toBe(0); expect(s.totalDays).toBe(91); expect(s.day.passages[0]).toMatchObject({ book: "MAT", from: 1 }); }
  });
  it("dernier jour : toujours en cours, puis terminé le lendemain", () => {
    expect(todayState(nt, "2027-04-01").kind).toBe("running");
    expect(todayState(nt, "2027-04-02").kind).toBe("ended");
  });
  it("choix du défi : en cours d'abord, sinon prochain", () => {
    const later = { ...nt, id: "c2", start_date: "2027-06-01", end_date: "2027-07-01" };
    expect(pickChallenge([later, nt], "2027-02-01")?.id).toBe("c1");
    expect(pickChallenge([later], "2027-02-01")?.id).toBe("c2");
    expect(pickChallenge([nt], "2028-01-01")).toBe(null);
  });
  it("dates locales et écarts", () => {
    expect(localToday(new Date(2027, 0, 5))).toBe("2027-01-05");
    expect(dayDiff("2028-02-28", "2028-03-01")).toBe(2);
  });
});
