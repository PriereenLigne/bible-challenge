import { describe, it, expect } from "vitest";
import { buildTeamParams, normalizeInviteCode, formatInviteCode, countChapters } from "@/lib/teams/build";
import { computeTeamStats, type MemberProgress } from "@/lib/teams/stats";

const base = { name: "  Jeunes de l'église ", description: "", withChallenge: false, scope: "gospels" as const, durationId: "1m", start: "2027-01-01" };
const row = (id: string, shares: boolean, read: number | null, last: string | null): MemberProgress => ({ user_id: id, display_name: id, role: "member", shares, chapters_read: read, days_done: null, last_read_on: last });

describe("création d'équipe", () => {
  it("équipe sans défi commun", () => { expect(buildTeamParams(base)).toEqual({ p_name: "Jeunes de l'église", p_description: null, p_scope: null, p_book_ids: null, p_start: null, p_end: null }); });
  it("équipe avec défi commun : fin = début + durée - 1", () => {
    const p = buildTeamParams({ ...base, withChallenge: true });
    expect(p.p_end).toBe("2027-01-30"); expect(p.p_book_ids).toEqual(["MAT", "MRK", "LUK", "JHN"]);
  });
  it("refuse les entrées invalides", () => {
    expect(() => buildTeamParams({ ...base, name: "A" })).toThrow();
    expect(() => buildTeamParams({ ...base, description: "x".repeat(501) })).toThrow();
    expect(() => buildTeamParams({ ...base, withChallenge: true, start: "2027-02-30" })).toThrow();
    expect(() => buildTeamParams({ ...base, withChallenge: true, durationId: "zz" })).toThrow();
  });
});
describe("codes d'invitation", () => {
  it("normalise espaces, tirets, minuscules", () => { expect(normalizeInviteCode(" ab12-cd34 ef56 ")).toBe("AB12CD34EF56"); });
  it("refuse les formats invalides", () => { expect(normalizeInviteCode("trop court")).toBe(null); expect(normalizeInviteCode("GGGGGGGGGGGG")).toBe(null); });
  it("formate par blocs de 4", () => { expect(formatInviteCode("AB12CD34EF56")).toBe("AB12-CD34-EF56"); });
});
describe("statistiques d'équipe", () => {
  const total = countChapters(["MAT", "MRK", "LUK", "JHN"]);
  it("compte les chapitres du programme", () => { expect(total).toBe(89); });
  const stats = computeTeamStats([row("a", true, 10, "2027-01-10"), row("b", true, 0, null), row("c", false, null, null)], total, "2027-01-12");
  it("additionne les lectures des membres qui partagent seulement", () => { expect(stats.totalRead).toBe(10); expect(stats.sharing).toBe(2); expect(stats.members).toBe(3); });
  it("participation = actifs sur 7 jours / membres qui partagent", () => { expect(stats.activeThisWeek).toBe(1); expect(stats.participationPercent).toBe(50); });
  it("la progression d'un membre qui ne partage pas reste masquée", () => { const c = stats.perMember[2]; expect(c?.read).toBe(null); expect(c?.percent).toBe(null); });
  it("pourcentage individuel par rapport au programme, plafonné à 100", () => { expect(stats.perMember[0]?.percent).toBeCloseTo(11.2, 1); expect(computeTeamStats([row("z", true, 500, null)], 89, "2027-01-12").perMember[0]?.percent).toBe(100); });
  it("jamais de pourcentage collectif inventé quand personne ne partage", () => { expect(computeTeamStats([row("c", false, null, null)], 89, "2027-01-12").participationPercent).toBe(null); });
});
