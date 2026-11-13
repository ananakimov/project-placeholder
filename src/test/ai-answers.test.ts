import { describe, expect, it } from "vitest";
import { aiAnswers } from "@/data/aiAnswers";

describe("ai answers", () => {
  it("b-1 why cites the 5 000,00 ₽ difference", () => {
    expect(aiAnswers["b-1"]?.["why"]?.text).toContain("Разница 5 000,00 ₽");
  });
  it("hypotheses start with «Возможно»", () => {
    const all = Object.values(aiAnswers).flatMap((q) => Object.values(q));
    for (const a of all.filter((x) => x.hypothesis)) expect(a.text.startsWith("Возможно")).toBe(true);
  });
  it("unverified rows get no expected sum invented in source answer", () => {
    expect(aiAnswers["c-1"]?.["source"]?.text).toContain("не определено");
  });
});
