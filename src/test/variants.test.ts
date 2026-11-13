import { describe, expect, it } from "vitest";
import { checks } from "@/data/mock";
import { applyVariants } from "@/context/ChecksContext";

const b = checks.find((c) => c.id === "b")!;
const c = checks.find((x) => x.id === "c")!;

describe("variants", () => {
  it("fix on Б1 makes it verified and sets Б13 Δ to 386180.00", () => {
    const r = applyVariants(b, { "b-1": "fix" });
    expect(r.rows.find((x) => x.id === "b-1")).toMatchObject({ status: "verified", manual: true, delta: "0.00" });
    expect(r.rows.find((x) => x.id === "b-13")?.delta).toBe("386180.00");
    expect(r.coverage.verifiedPct).toBe("80.4");
  });
  it("pick АР-09/1 makes conclusion Недостоверен; switching back to АР-09 restores it", () => {
    expect(applyVariants(c, { "c-7": "pick-ar09-1" }).conclusion).toBe("Недостоверен");
    const back = applyVariants(c, { "c-7": "pick-ar09" });
    expect(back.conclusion).toBe("Подтвердить полностью нельзя");
    expect(back.rows.find((x) => x.id === "c-7")?.category).toBeNull();
  });
});
