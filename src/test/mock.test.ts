import { describe, expect, it } from "vitest";
import { checks } from "@/data/mock";
import { countByStatus } from "@/pages/Checks";

describe("mock checks", () => {
  it("keeps the check dates independently of the removed journal", () => {
    expect(checks.map(({ id, date }) => [id, date])).toEqual([
      ["a", "12.11.2026"], ["b", "12.11.2026"], ["c", "13.11.2026"], ["g", "13.11.2026"],
    ]);
    for (const check of checks) expect(check).not.toHaveProperty("log");
  });
  it("counts only indicator rows: a=9, b=11, c=9, g=6", () => {
    const totals = checks.map((c) => { const n = countByStatus(c); return n.verified + n.discrepancy + n.unverified; });
    expect(totals).toEqual([9, 11, 9, 6]);
  });
  it("unverified rows keep null expected/delta", () => {
    const u = checks.find((c) => c.id === "c")!.rows.filter((r) => r.status === "unverified");
    expect(u.every((r) => r.expected === null && r.delta === null)).toBe(true);
  });
  it("check g: 3 verified / 1 discrepancy / 2 unverified, 23 docs, 3 excluded", () => {
    const g = checks.find((c) => c.id === "g")!;
    expect(countByStatus(g)).toEqual({ verified: 3, discrepancy: 1, unverified: 2 });
    expect(g.docs.length).toBe(23);
    expect(g.excluded.map((e) => e.reason)).toEqual(["дубль", "вне периода", "другой договор"]);
    expect(g.rows.find((r) => r.id === "g-4")).toMatchObject({ status: "verified", delta: "0.00" });
    expect(g.rows.filter((r) => r.status === "unverified").every((r) => r.expected === null && r.delta === null)).toBe(true);
    expect(g.coverage).toMatchObject({ verifiedSum: "2300300.00", discrepancySum: "415600.00", totalSum: "2715900.00" });
  });
});
