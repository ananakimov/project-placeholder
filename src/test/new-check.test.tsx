import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewCheck } from "@/pages/NewCheck";
import { ChecksProvider, useChecks } from "@/context/ChecksContext";
import { checks } from "@/data/mock";
import { SAMPLE_FILES, SAMPLE_REPORT, SAMPLE_DOCS } from "@/data/sample-files";

const navigate = vi.hoisted(() => vi.fn());
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));
function CheckProbe() {
  return <output data-testid="check">{JSON.stringify(useChecks().getCheck("g"))}</output>;
}
function setup() {
  return render(<ChecksProvider><NewCheck /><CheckProbe /></ChecksProvider>);
}
function upload(group: "report" | "docs", ...names: string[]) {
  fireEvent.change(screen.getByLabelText(group === "report" ? "Выбрать отчёт" : "Выбрать первичные документы"), {
    target: { files: names.map((name) => new File(["synthetic"], name)) },
  });
}
function finish() {
  act(() => vi.advanceTimersByTime(2800));
  expect(navigate).toHaveBeenCalledExactlyOnceWith({ to: "/checks/$id", params: { id: "g" } });
  expect(JSON.parse(screen.getByTestId("check").textContent ?? "null")).toEqual(JSON.parse(JSON.stringify(checks.find((check) => check.id === "g"))));
}
afterEach(() => { cleanup(); vi.useRealTimers(); navigate.mockReset(); });

describe("Single-screen new check", () => {
  it("shows both upload blocks and keeps launch disabled without files", () => {
    setup();
    expect(screen.getByRole("region", { name: "КФЗ" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Первичные документы" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Шаги" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Запустить проверку" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Загрузить пример" })).toBeEnabled();
  });
  it("requires a report even when primary documents have been added", () => {
    setup(); upload("docs", "Акт.pdf");
    expect(screen.getByRole("button", { name: "Запустить проверку" })).toBeDisabled();
  });
  it("requires at least one primary document even when a report has been added", () => {
    setup(); upload("report", "КФЗ.pdf");
    expect(screen.getByRole("button", { name: "Запустить проверку" })).toBeDisabled();
  });
  it("fills both groups with the attached example and opens g without modifying its data", () => {
    vi.useFakeTimers(); setup();
    fireEvent.click(screen.getByRole("button", { name: "Загрузить пример" }));
    expect(screen.getByRole("heading", { name: "Проверка выполняется" })).toBeInTheDocument();
    expect(screen.getByText(`КФЗ: ${SAMPLE_REPORT.name} · Первичных документов: 22`)).toBeInTheDocument();
    finish();
  });
  it("launches uploaded files to the same fixed example without parsing or changing it", () => {
    vi.useFakeTimers(); setup(); upload("report", "Мой отчёт.pdf"); upload("docs", "Мой акт.pdf");
    expect(screen.getByRole("button", { name: "Запустить проверку" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Запустить проверку" })); finish();
  });
  it.each(["КФЗ.pdf", "Акт.pdf"])("disables launch again when %s is removed", (name) => {
    setup(); upload("report", "КФЗ.pdf"); upload("docs", "Акт.pdf");
    expect(screen.getByRole("button", { name: "Запустить проверку" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: `Убрать ${name}` }));
    expect(screen.getByRole("button", { name: "Запустить проверку" })).toBeDisabled();
  });
  it("retains format filtering, one report and append behavior for primary documents", () => {
    setup(); upload("report", "КФЗ.pdf", "Второй.pdf", "Неподходящий.xlsx");
    expect(screen.getByRole("button", { name: "Убрать КФЗ.pdf" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Убрать Второй.pdf" })).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Поддерживаются: PDF");
    upload("docs", "Первый.docx", "Плохой.txt"); upload("docs", "Второй.xlsx");
    expect(screen.getByRole("button", { name: "Убрать Первый.docx" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Убрать Второй.xlsx" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Убрать Плохой.txt" })).not.toBeInTheDocument();
    upload("report", "Заменённый.pdf");
    expect(screen.queryByRole("button", { name: "Убрать КФЗ.pdf" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Убрать Заменённый.pdf" })).toBeInTheDocument();
  });
  it("still launches when a file has the existing damaged-example marker", () => {
    vi.useFakeTimers(); setup(); upload("report", "КФЗ.pdf"); upload("docs", "Ведомость (повреждён).xlsx");
    fireEvent.click(screen.getByRole("button", { name: "Запустить проверку" }));
    expect(screen.getByText(/Файл не открыт: Ведомость/)).toBeInTheDocument(); finish();
  });
  it("uses the 23 original input files with exact sizes and hashes, excluding reference answers", () => {
    expect(SAMPLE_REPORT.name).toBe("01_Карточка_учета_фактических_затрат_этап_3.pdf");
    expect(SAMPLE_DOCS).toHaveLength(22);
    for (const file of SAMPLE_FILES) {
      expect(file.name).toMatch(/^(0[1-9]|1[0-5])_/);
      const bytes = readFileSync(`fixtures/synthetic-2027/input/${file.name}`);
      expect(bytes.length).toBe(file.size);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(file.sha256);
    }
  });
  it("keeps the stage metadata and identifies the attached synthetic KFZ", () => {
    expect(checks.find((check) => check.id === "g")).toMatchObject({
      reportRow: "3 этап, 2027 г.", kfzNumber: "3/7", synthetic: true,
      contract: "SYN-27/04-018", period: "01.01.2027–31.05.2027",
    });
    for (const id of ["a", "b", "c"]) expect(checks.find((check) => check.id === id)).toMatchObject({ reportRow: "2 этап, 2026 г.", kfzNumber: "б/н", synthetic: true });
  });
});
