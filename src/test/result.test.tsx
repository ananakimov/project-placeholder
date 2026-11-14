import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { CheckConclusion } from "@/pages/CheckConclusion";
import { CheckDetail } from "@/pages/CheckDetail";
import { CheckHeader } from "@/components/check/CheckHeader";
import { ChecksProvider, applyVariants, useChecks } from "@/context/ChecksContext";
import { checks } from "@/data/mock";
import { PROBLEMS } from "@/data/problems";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));
const scrollIntoView = vi.fn();
beforeAll(() => { HTMLElement.prototype.scrollTo = vi.fn(); HTMLElement.prototype.scrollIntoView = scrollIntoView; });
afterEach(() => { cleanup(); vi.useRealTimers(); scrollIntoView.mockClear(); });
const b = checks.find((check) => check.id === "b")!;
function Result() {
  const check = useChecks().getCheck("b")!;
  return <><CheckHeader check={check} /><CheckDetail check={check} /></>;
}
function setup() { render(<ChecksProvider><Result /></ChecksProvider>); }

describe("Combined result", () => {
  it("shows one summary before the table and the conclusion below diagnostics", () => {
    setup();
    const summary = screen.getByRole("region", { name: "Результаты проверки" });
    const table = screen.getByRole("table", { name: "Показатели КФЗ" });
    const diagnostics = screen.getByRole("region", { name: "Дополнительные проверки" });
    const conclusion = screen.getByRole("region", { name: "Заключение по проверке" });
    expect(within(summary).getByText(/6 стр.*38,6%/)).toBeInTheDocument();
    expect(within(conclusion).getByRole("heading", { name: "Недостоверен" })).toBeInTheDocument();
    expect(screen.queryByText("Найденные проблемы")).not.toBeInTheDocument();
    expect(summary.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(table.compareDocumentPosition(diagnostics) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(diagnostics.compareDocumentPosition(conclusion) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(table).getByRole("columnheader", { name: "Пояснение" })).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "Разделы проверки" });
    expect(within(navigation).getAllByRole("link").map((link) => link.textContent)).toEqual(["Результат", "Документы"]);
  });
  it("opens and scrolls to a problem row even if search and filters had hidden it", () => {
    const c = checks.find((check) => check.id === "c")!;
    render(<ChecksProvider><CheckDetail check={c} /></ChecksProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Подтверждено 4" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Поиск показателя или документа" }), { target: { value: "нет такого" } });
    fireEvent.click(screen.getByRole("button", { name: "Перейти к строке: Командировки" }));
    const trigger = screen.getByRole("button", { name: "Командировки" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "Подробности: Командировки" })).toBeInTheDocument();
    expect(trigger.closest("tr")).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
    expect(screen.getByRole("textbox", { name: "Поиск показателя или документа" })).toHaveValue("");
    expect(screen.getByRole("button", { name: "Все 9" })).toHaveAttribute("aria-pressed", "true");
  });
  it("keeps every problem linked to an existing indicator", () => {
    for (const check of checks) for (const block of PROBLEMS[check.id] ?? []) for (const problem of block.items) {
      expect(problem.rowIds.length).toBeGreaterThan(0);
      for (const id of problem.rowIds) expect(check.rows.some((row) => row.id === id)).toBe(true);
    }
  });
  it("keeps possible causes in an expanded row without a source document", () => {
    render(<ChecksProvider><CheckDetail check={checks.find((check) => check.id === "g")!} /></ChecksProvider>);
    const name = "Трудоемкость (человеко-месяц)";
    fireEvent.click(screen.getByRole("button", { name }));
    const details = within(screen.getByRole("region", { name: `Подробности: ${name}` }));
    expect(details.getByText("Возможные причины")).toBeInTheDocument();
    expect(details.getByText("Ведомости подтверждают суммы, но не трудоёмкость в человеко-месяцах.")).toBeInTheDocument();
    expect(details.getByText("Рекомендация")).toBeInTheDocument();
  });
  it("hides obsolete causes and recommendations after an indicator is corrected", () => {
    const check = applyVariants(b, { "b-1": "fix" });
    render(<ChecksProvider><CheckDetail check={check} /></ChecksProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Оплата труда" }));
    const details = within(screen.getByRole("region", { name: "Подробности: Оплата труда" }));
    expect(details.getByText("Подтверждено.")).toBeInTheDocument();
    expect(details.queryByText("Возможные причины")).not.toBeInTheDocument();
    expect(details.queryByText("Рекомендация")).not.toBeInTheDocument();
  });
  it("shows insufficient evidence with rule reasons and partial sums, without an unsupported document checklist", () => {
    const c = checks.find((check) => check.id === "c")!;
    const original = structuredClone(c);
    render(<ChecksProvider><CheckConclusion check={c} /></ChecksProvider>);
    const section = screen.getByRole("heading", { name: "Недостаточно подтверждений" }).closest("section")!;
    expect(within(section).getByText("Недостаточно данных для проверки")).toBeInTheDocument();
    expect(within(section).getAllByRole("listitem")).toHaveLength(5);
    expect(within(section).getByText("Пропущен документ: ведомость за сентябрь")).toBeInTheDocument();
    expect(within(section).getByText("найдено 720000.00 за 3 из 4 мес.")).toBeInTheDocument();
    expect(within(section).getByText("найдено 60000.00 за 2 мес.")).toBeInTheDocument();
    expect(within(section).getByText("Нет документа")).toBeInTheDocument();
    expect(within(section).queryByText(/авансовый отчёт/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Недостающие документы")).not.toBeInTheDocument();
    expect(screen.queryByText("Таблица отражает результат автоматической проверки")).not.toBeInTheDocument();
    expect(c).toEqual(original);
  });
  it("omits insufficient evidence when all indicators are confirmed", () => {
    render(<ChecksProvider><CheckConclusion check={checks.find((check) => check.id === "a")!} /></ChecksProvider>);
    expect(screen.queryByRole("heading", { name: "Недостаточно подтверждений" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Достоверен" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Подписать вывод" })).toBeEnabled();
  });
  it("retains comments and signs only after all problems are reviewed on this screen", () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 14, 10, 15));
    setup();
    const signButton = screen.getByRole("button", { name: "Подписать вывод" });
    const table = screen.getByRole("table", { name: "Показатели КФЗ" });
    const rowButtons = new Map(b.exceptionOrder.map((id) => {
      const row = b.rows.find((item) => item.id === id)!;
      return [id, within(table).getByRole("button", { name: row.name })];
    }));
    for (const id of b.exceptionOrder) {
      expect(signButton).toBeDisabled();
      const row = b.rows.find((item) => item.id === id)!;
      fireEvent.click(rowButtons.get(id)!);
      const details = within(table).getByRole("region", { name: `Подробности: ${row.name}` });
      fireEvent.click(within(details).getByText("Действия бухгалтера"));
      expect(within(details).queryByRole("button", { name: "Исправить значение" })).not.toBeInTheDocument();
      fireEvent.change(within(details).getByRole("textbox", { name: "Комментарий" }), { target: { value: `Проверена строка ${id}` } });
      fireEvent.click(within(details).getByRole("button", { name: "Сохранить" }));
      fireEvent.click(within(details).getByRole("button", { name: "Отметить как просмотренное" }));
    }
    expect(signButton).toBeEnabled();
    fireEvent.click(signButton);
    expect(screen.getByText("Подписано: главный бухгалтер Иванова А. С., 14.11.2026 10:15")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Подписать вывод" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Подробности: Оплата труда" })).getByRole("textbox", { name: "Комментарий" })).toHaveValue("Проверена строка b-1");
  }, 15_000); // Full UI workflow must also fit on the slower GitHub Actions runner.
});
