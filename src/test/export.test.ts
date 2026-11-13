import { describe, expect, it } from "vitest";
import { checks } from "@/data/mock";
import { checkToCsv, checkToJson } from "@/lib/export";

const c = checks.find((x) => x.id === "c")!;
describe("export", () => {
  it("CSV starts with BOM and synthetic note, uses ; and keeps null empty", () => {
    const csv = checkToCsv(c);
    expect(csv.startsWith("\uFEFFСинтетические данные. Прототип DocCheck\r\n")).toBe(true);
    expect(csv).toContain("Командировки;22300.00;;;Не проверено;;;;;система");
  });
  it("JSON carries the note", () => {
    expect(JSON.parse(checkToJson(c)).note).toBe("Синтетические данные. Прототип DocCheck");
  });
});
