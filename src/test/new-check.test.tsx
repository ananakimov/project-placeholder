import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemoHistory } from "@/components/check/DemoHistory";
import { NewCheck } from "@/pages/NewCheck";
import { ChecksProvider, useChecks } from "@/context/ChecksContext";
import { checks } from "@/data/mock";
import { SAMPLE_FILES, SAMPLE_REPORT, SAMPLE_DOCS } from "@/data/sample-files";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ params, search, children, "aria-labelledby": label }: { params: { id: string }; search: Record<string, string>; children: ReactNode; "aria-labelledby": string }) =>
    <a href={`/checks/${params.id}?${new URLSearchParams(search)}`} aria-labelledby={label}>{children}</a>,
}));
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
});

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
  it("advances each sample through every stage and restores completed links after remount", () => {
    vi.useFakeTimers();
    setup();
    for (let i = 0; i < 2; i++) fireEvent.click(screen.getByRole("button", { name: "Загрузить пример" }));
    const recent = screen.getByRole("region", { name: "Очередь проверок" });
    const [second, first] = within(recent).getAllByRole("heading", { name: "КФЗ №3/7" })
      .map((heading) => within(heading.closest("li")!));
    const stage = (job: typeof first, name: string) => expect(job!.getByRole("status")).toHaveTextContent(name);
    const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));
    stage(first, "Загрузка файлов"); stage(second, "Загрузка файлов");
    tick(1_000);
    stage(first, "В очереди"); stage(second, "В очереди");
    tick(1_100);
    stage(first, "Чтение документов"); stage(second, "В очереди");
    expect(Number(first!.getByRole("progressbar").getAttribute("aria-valuenow"))).toBeGreaterThan(12);
    tick(1_500);
    stage(first, "Извлечение данных");
    expect(first!.queryByText("Чтение документов")).not.toBeInTheDocument();
    tick(2_300);
    stage(first, "Сопоставление с КФЗ");
    tick(1_500);
    stage(first, "Подготовка заключения");
    tick(1_400);
    stage(first, "Готово"); stage(second, "Чтение документов");
    expect(first!.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(first!.queryByText(/^Обработано/)).not.toBeInTheDocument();
    expect(first!.queryByText("Демонстрация", { exact: true })).not.toBeInTheDocument();
    const firstLink = first!.getByRole("link", { name: "КФЗ №3/7" }).getAttribute("href");
    expect(firstLink).toMatch(/^\/checks\/g\?run=demo-/);
    expect(second!.queryByRole("link")).not.toBeInTheDocument();
    expectExampleUnchanged();
    cleanup();
    tick(7_500);
    render(<ChecksProvider><DemoHistory /></ChecksProvider>);
    const links = screen.getAllByRole("link", { name: "КФЗ №3/7" }).map((link) => link.getAttribute("href"));
    expect(links).toHaveLength(2);
    expect(new Set(links).size).toBe(2);
    expect(links).toContain(firstLink);
  });

  it("keeps only safe metadata for manual uploads and never offers synthetic financial results for them", () => {
    vi.useFakeTimers();
    setup();
    for (const number of [1, 2]) {
      upload("report", `Приватное название отчёта ${number}.pdf`);
      upload("docs", `Акт ${number}.pdf`);
      const submit = screen.getByRole("button", { name: "Запустить проверку" });
      fireEvent.click(submit);
      expect(submit).toBeDisabled();
      expect(screen.queryByText(`Акт ${number}.pdf`)).not.toBeInTheDocument();
    }
    const recent = within(screen.getByRole("region", { name: "Очередь проверок" }));
    expect(recent.getAllByRole("progressbar")).toHaveLength(2);
    expect(recent.getAllByText("Файлов: 2")).toHaveLength(2);
    expect(recent.getAllByText("Добавление файлов")).toHaveLength(2);
    expect(localStorage.getItem("doccheck.demo-queue.v1")).not.toMatch(/Приватное|Акт/);
    expectExampleUnchanged();
    cleanup();
    act(() => vi.advanceTimersByTime(1_000));
    render(<ChecksProvider><DemoHistory /></ChecksProvider>);
    expect(screen.getByText("В очереди пока нет проверок.")).toBeInTheDocument();
    expect(screen.queryByText("Требуется серверная сверка", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "КФЗ №3/7" })).not.toBeInTheDocument();
    expect(screen.queryByText("Обработано 2 из 2 файлов")).not.toBeInTheDocument();
  });

  it("reports truly empty files as an item error separate from an unsupported OCR result", () => {
    vi.useFakeTimers();
    setup();
    upload("report", "КФЗ.pdf");
    fireEvent.change(screen.getByLabelText("Выбрать первичные документы"), {
      target: { files: [new File([], "Акт.pdf")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Запустить проверку" }));
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByText("Ошибка добавления")).toBeInTheDocument();
    expect(screen.getByText(/пустой файл/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "КФЗ №3/7" })).not.toBeInTheDocument();
  });
  it.each(["КФЗ.pdf", "Акт.pdf"])("disables launch again when %s is removed", (name) => {
    setup(); upload("report", "КФЗ.pdf"); upload("docs", "Акт.pdf");
    expect(screen.getByRole("button", { name: "Запустить проверку" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: `Убрать ${name}` }));
    expect(screen.getByRole("button", { name: "Запустить проверку" })).toBeDisabled();
  });
  it("keeps queued jobs in memory when the storage quota is exceeded", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage quota exceeded", "QuotaExceededError");
    });
    vi.useFakeTimers();
    setup();
    for (let i = 0; i < 2; i++) fireEvent.click(screen.getByRole("button", { name: "Загрузить пример" }));
    act(() => vi.advanceTimersByTime(1_900));
    const recent = within(screen.getByRole("region", { name: "Очередь проверок" }));
    expect(recent.getAllByRole("progressbar")).toHaveLength(2);
    const states = recent.getAllByRole("status").map((status) => status.textContent);
    expect(states).toEqual(expect.arrayContaining(["В очереди", "Чтение документов"]));
    expect(recent.getByText(/Сохранить её в браузере не удалось/)).toBeInTheDocument();
  });
  it("retains format filtering, one report and append behavior for primary documents", () => {
    setup(); upload("report", "КФЗ.pdf", "Второй.pdf", "Неподходящий.xlsx");
    expect(screen.getByRole("button", { name: "Убрать КФЗ.pdf" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Убрать Второй.pdf" })).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Поддерживаются: PDF");
    upload("docs", "Первый.docx", "Плохой.txt", "Комплект.ZIP"); upload("docs", "Второй.xlsx");
    expect(screen.getByRole("button", { name: "Убрать Первый.docx" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Убрать Второй.xlsx" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Убрать Комплект.ZIP" })).toBeInTheDocument();
    expect(screen.getByLabelText("Выбрать первичные документы").getAttribute("accept")?.split(","))
      .toEqual(expect.arrayContaining([".zip", ".rar", ".7z"]));
    expect(screen.queryByRole("button", { name: "Убрать Плохой.txt" })).not.toBeInTheDocument();
    upload("report", "Заменённый.pdf");
    expect(screen.queryByRole("button", { name: "Убрать КФЗ.pdf" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Убрать Заменённый.pdf" })).toBeInTheDocument();
  });
  it("does not infer that a file is damaged from its name", () => {
    setup(); upload("report", "КФЗ.pdf"); upload("docs", "Документ (повреждён).xlsx");
    expect(screen.queryByText(/Файл не открыт/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Запустить проверку" })).toBeEnabled();
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
