import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { checks } from "@/data/mock";
import { SAMPLE_FILES } from "@/data/sample-files";
import { CheckDetail } from "@/pages/CheckDetail";
import { CheckHeader } from "@/components/check/CheckHeader";
import { ChecksProvider } from "@/context/ChecksContext";
import { sumMoney } from "@/components/money-format";
import { countByStatus } from "@/pages/Checks";

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn(), Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
beforeAll(() => { HTMLElement.prototype.scrollTo = vi.fn(); });
afterEach(cleanup);
const g = checks.find((check) => check.id === "g")!;
// Independent control supplied with the archive, never imported by application code.
const reference = JSON.parse(readFileSync("fixtures/synthetic-2027/reference/expected.json", "utf8")) as {
  contract: string; target_row: string; reported_total: string; reported_stage_total: string; total_status: string;
  rows: { category: string; reported_amount: string; supported_amount: string | null; delta: string | null; status: string; source_prefixes: string[] }[];
  excluded_documents: { prefix: string; amount: string }[];
};
const rowByCategory: Record<string, string> = { payroll: "g-1", insurance: "g-2", production_overhead: "g-3", general_admin: "g-4", materials: "g-8" };

describe("Attached synthetic 2027 sample", () => {
  it("matches every control amount, status, delta sign and source document from the archive", () => {
    expect(g.contract).toBe(reference.contract);
    expect(g.reportRow).toBe(reference.target_row);
    for (const expected of reference.rows) {
      const row = g.rows.find((item) => item.id === rowByCategory[expected.category])!;
      expect(row, expected.category).toMatchObject({ reported: expected.reported_amount, expected: expected.supported_amount, delta: expected.delta, status: expected.status });
      const files = row.sources.map((source) => g.docs.find((document) => document.id === source.docId)!.fileName!);
      expect(files).toHaveLength(expected.source_prefixes.length);
      for (const prefix of expected.source_prefixes) expect(files.filter((name) => name.startsWith(`${prefix}_`))).toHaveLength(1);
      if (row.expected !== null) expect(sumMoney(row.sources.map((source) => source.amount!))).toBe(row.expected);
    }
    const total = g.rows.find((row) => row.service)!;
    expect(total).toMatchObject({ name: "Итого", reported: reference.reported_total, expected: null, delta: null, status: reference.total_status });
    expect(total.reported).not.toBe(reference.reported_stage_total);
    expect(g.rows.find((row) => row.id === "g-5")).toMatchObject({ reported: "32.50", unit: "человеко-месяц", expected: null, delta: null });
  });
  it("keeps the exact KFZ column order and nests the 'including' values inside their groups", () => {
    expect(g.rows.map((row) => row.name)).toEqual([
      "Трудоемкость (человеко-месяц)", "Материальные затраты",
      "Затраты на оплату труда - всего (Статья калькуляции 0200)",
      "Страховые взносы на обязательное социальное страхование (Статья калькуляции 0300)",
      "Общепроизводственные затраты (Статья калькуляции 0800)",
      "Общехозяйственные затраты (Статья калькуляции 0900)", "Итого",
    ]);
    const payroll = g.rows.find((row) => row.id === "g-1")!;
    const insurance = g.rows.find((row) => row.id === "g-2")!;
    expect(payroll.breakdown!.map((group) => [group.reported, group.children!.map((child) => child.reported)])).toEqual([
      ["5000000.00", ["4300000.00", "700000.00"]], ["0.00", ["0.00"]],
    ]);
    expect(insurance.breakdown!.map((group) => [group.reported, group.children!.map((child) => child.reported)])).toEqual([
      ["1514800.00", ["1290000.00", "224800.00"]], ["0.00", ["0.00"]],
    ]);
    expect(insurance.breakdown![0]!.note).toContain("отдельно документами не подтверждена");
  });
  it("does not double-count breakdowns, labour units, excluded documents or the total in coverage", () => {
    expect(countByStatus(g)).toEqual({ verified: 2, discrepancy: 2, unverified: 2 });
    const moneyRows = g.rows.filter((row) => !row.unit && !row.service);
    for (const status of ["verified", "discrepancy", "unverified"] as const) {
      expect(sumMoney(moneyRows.filter((row) => row.status === status).map((row) => row.reported))).toBe(g.coverage[`${status}Sum`]);
    }
    expect(sumMoney(moneyRows.map((row) => row.reported))).toBe(reference.reported_total);
    expect(g.coverage).toMatchObject({ totalSum: reference.reported_total, verifiedPct: "71.63", discrepancyPct: "26.73", unverifiedPct: "1.64" });
    const sources = g.rows.flatMap((row) => row.sources.map((source) => source.docId));
    for (const item of reference.excluded_documents) {
      const excluded = g.excluded.find((entry) => entry.file.startsWith(`${item.prefix}_`))!;
      expect(excluded.amount).toBe(item.amount);
      expect(sources).not.toContain(excluded.docId);
    }
  });
  it("links all 23 original input files and keeps source amounts at the highlighted fields", () => {
    expect(g.docs.map((document) => document.fileName).sort()).toEqual(SAMPLE_FILES.map((file) => file.name).sort());
    for (const source of g.rows.flatMap((row) => row.sources)) {
      const document = g.docs.find((item) => item.id === source.docId)!;
      expect(document.fields.find((field) => field.label === "Сумма")).toMatchObject({ bbox: source.bbox, page: source.page });
      expect(document.fields.find((field) => field.label === "Номер")?.value).toBe(document.number);
      if (document.id === "g-kfz") {
        expect(document.date).toBe("не указана");
        expect(document.fields.find((field) => field.label === "Дата")).toBeUndefined();
      } else {
        expect(document.fields.find((field) => field.label === "Дата")?.value).toBe(document.date);
      }
      expect(document.fields.find((field) => field.label === "Договор")?.value).toBe(document.contract);
    }
    expect(g.docs.find((document) => document.fileName!.startsWith("12_"))).toMatchObject({ number: "СВ-0427", date: "29.04.2027" });
    expect(g.docs.find((document) => document.fileName!.startsWith("15_"))).toMatchObject({ contract: "SYN-27/04-019" });
  });
  it("renders the 2027 heading and opens nested values without adding independent indicators", () => {
    render(<ChecksProvider><CheckHeader check={g} /><CheckDetail check={g} /></ChecksProvider>);
    expect(screen.getByRole("heading", { name: "КФЗ №3/7" })).toBeInTheDocument();
    expect(screen.getByText("3 этап, 2027 г.")).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Показатели КФЗ" });
    expect(within(table).getAllByRole("row")).toHaveLength(8);
    const payroll = g.rows.find((row) => row.id === "g-1")!;
    expect(screen.queryByRole("region", { name: `В том числе: ${payroll.name}` })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: payroll.name }));
    fireEvent.click(screen.getByText("В том числе — по КФЗ", { exact: true }));
    const nested = screen.getByRole("region", { name: `В том числе: ${payroll.name}` });
    expect(within(nested).getByText("основная заработная плата")).toBeInTheDocument();
    expect(nested).toHaveTextContent(/4\s300\s000,00/);
    expect(within(table).getAllByRole("row")).toHaveLength(9);
    expect(screen.getByRole("button", { name: "Все 6" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("Субподряд")).not.toBeInTheDocument();
  });
});
