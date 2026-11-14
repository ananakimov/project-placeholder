import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemoHistory } from "@/components/check/DemoHistory";
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
function expectExampleUnchanged() {
  expect(JSON.parse(screen.getByTestId("check").textContent ?? "null"))
    .toEqual(JSON.parse(JSON.stringify(checks.find((check) => check.id === "g"))));
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  vi.useRealTimers();
  navigate.mockReset();
});

describe("Single-screen new check", () => {
  it("shows both upload blocks and keeps launch disabled without files", () => {
    setup();
    expect(screen.getByRole("region", { name: "КФЗ" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Первичные документы" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Шаги" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Добавить в демо-очередь" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Открыть готовый пример" })).toBeEnabled();
  });
  it("requires a report even when primary documents have been added", () => {
    setup(); upload("docs", "Акт.pdf");
    expect(screen.getByRole("button", { name: "Добавить в демо-очередь" })).toBeDisabled();
  });
  it("requires at least one primary document even when a report has been added", () => {
    setup(); upload("report", "КФЗ.pdf");
    expect(screen.getByRole("button", { name: "Добавить в демо-очередь" })).toBeDisabled();
  });
  it("opens the fixed example without staging files or adding a job", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Открыть готовый пример" }));
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ to: "/checks/$id", params: { id: "g" } });
    expect(screen.getByText("Демо-заданий пока нет.")).toBeInTheDocument();
    expectExampleUnchanged();
  });
  it("queues two independent sets, keeps only metadata and restores history after remount", () => {
    vi.useFakeTimers();
    setup();
    for (const number of [1, 2]) {
      upload("report", `Приватное название отчёта ${number}.pdf`);
      upload("docs", `Акт ${number}.pdf`);
      const submit = screen.getByRole("button", { name: "Добавить в демо-очередь" });
      fireEvent.click(submit);
      expect(submit).toBeDisabled();
      expect(screen.queryByText(`Акт ${number}.pdf`)).not.toBeInTheDocument();
    }
    expect(navigate).not.toHaveBeenCalled();
    const recent = screen.getByRole("region", { name: "Последние демо-задания" });
    expect(within(recent).getAllByRole("listitem")).toHaveLength(2);
    expect(within(recent).getByText("В очереди")).toBeInTheDocument();
    expect(within(recent).getByText("Имитация обработки")).toBeInTheDocument();
    expect(localStorage.getItem("doccheck.demo-queue.v1")).not.toMatch(/Приватное|Акт/);
    expectExampleUnchanged();
    cleanup();
    act(() => vi.advanceTimersByTime(5100));
    render(<ChecksProvider><DemoHistory /></ChecksProvider>);
    expect(screen.getByText("Демо завершено")).toBeInTheDocument();
    expect(screen.getByText("Имитация обработки")).toBeInTheDocument();
  });
  it.each(["КФЗ.pdf", "Акт.pdf"])("disables launch again when %s is removed", (name) => {
    setup(); upload("report", "КФЗ.pdf"); upload("docs", "Акт.pdf");
    expect(screen.getByRole("button", { name: "Добавить в демо-очередь" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: `Убрать ${name}` }));
    expect(screen.getByRole("button", { name: "Добавить в демо-очередь" })).toBeDisabled();
  });
  it("keeps sequential demo jobs in memory when the storage quota is exceeded", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage quota exceeded", "QuotaExceededError");
    });
    vi.useFakeTimers();
    setup();
    for (const number of [1, 2]) {
      upload("report", `КФЗ ${number}.pdf`);
      upload("docs", `Акт ${number}.pdf`);
      fireEvent.click(screen.getByRole("button", { name: "Добавить в демо-очередь" }));
    }
    const recent = within(screen.getByRole("region", { name: "Последние демо-задания" }));
    expect(recent.getAllByRole("listitem")).toHaveLength(2);
    expect(recent.getByText("В очереди")).toBeInTheDocument();
    expect(recent.getByText("Имитация обработки")).toBeInTheDocument();
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
  it("does not infer that a file is damaged from its name", () => {
    setup(); upload("report", "КФЗ.pdf"); upload("docs", "Документ (повреждён).xlsx");
    expect(screen.queryByText(/Файл не открыт/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Добавить в демо-очередь" })).toBeEnabled();
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
