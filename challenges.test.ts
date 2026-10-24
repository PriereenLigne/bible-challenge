import { describe, it, expect } from "vitest";
import { buildChallengeRow } from "@/lib/challenges/build";

describe("construction d'un défi", () => {
  it("défi futur : planifié, fin = début + durée - 1 jour", () => {
    const r = buildChallengeRow("u1", "nt", "3m", "2027-01-01", "2026-10-20");
    expect(r.status).toBe("planned");
    expect(r.end_date).toBe("2027-04-01");
    expect(r.title).toBe("Nouveau Testament · 3 mois");
    expect(r.book_ids).toHaveLength(27);
  });
  it("défi qui commence aujourd'hui : en cours", () => {
    expect(buildChallengeRow("u1", "psalms", "1m", "2026-10-20", "2026-10-20").status).toBe("active");
  });
  it("refuse les entrées invalides", () => {
    expect(() => buildChallengeRow("u1", "nt", "99x", "2027-01-01", "2026-10-20")).toThrow();
    expect(() => buildChallengeRow("u1", "nt", "3m", "2027-02-30", "2026-10-20")).toThrow();
    expect(() => buildChallengeRow("u1", "xxx" as never, "3m", "2027-01-01", "2026-10-20")).toThrow();
  });
});
