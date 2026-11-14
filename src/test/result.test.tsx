import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { CheckDetail } from "@/pages/CheckDetail";
import { CheckHeader } from "@/components/check/CheckHeader";
import { ChecksProvider, useChecks } from "@/context/ChecksContext";
import { recheckDemo } from "@/data/demo-recheck";
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
  it("shows one conclusion and completeness above the six-column table", () => {
    setup();
    const conclusion = screen.getByRole("region", { name: "Заключение по проверке" });
    const coverage = screen.getByRole("region", { name: "Полнота проверки" });
    const table = screen.getByRole("table", { name: "Показатели КФЗ" });
    expect(within(conclusion).getByRole("heading", { name: "Недостоверен" })).toBeInTheDocument();
    expect(screen.getAllByText("Недостоверен", { exact: true })).toHaveLength(1);
    expect(coverage).toHaveTextContent(/Проверено: 11 из 11 показателей \(100\s?%\)/);
    const money = within(coverage).getByText("Подробнее по суммам").closest("details")!;
    expect(money.open).toBe(false);
    money.open = true;
    expect(within(money).getByRole("table", { name: "Суммы показателей по статусам" })).toHaveTextContent("38,6%");
    expect(table.compareDocumentPosition(screen.getByRole("button", { name: "Принять проверку" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText("Найденные проблемы")).not.toBeInTheDocument();
    expect(conclusion.compareDocumentPosition(coverage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(coverage.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(table).getAllByRole("columnheader").map((column) => column.textContent))
      .toEqual(["Показатель КФЗ", "В КФЗ", "Ожидаемо", "Разница Δ", "Статус", "Пояснение"]);
    const navigation = screen.getByRole("navigation", { name: "Разделы проверки" });
    expect(within(navigation).getAllByRole("link").map((link) => link.textContent)).toEqual(["Результат", "Документы"]);
  });
  it("describes the financial findings from the open version", () => {
    const sample = checks.find((check) => check.id === "g")!;
    const { rerender } = render(<ChecksProvider><CheckDetail check={sample} /></ChecksProvider>);
    const conclusion = () => within(screen.getByRole("region", { name: "Заключение по проверке" }));
    const completeness = () => screen.getByRole("region", { name: "Полнота проверки" });
    expect(conclusion().getByText(/по статье 0300 \(\+14\s800 ₽\) и по статье 0800 \(−25\s000 ₽\)/)).toBeInTheDocument();
    expect(conclusion().getByText(/Ещё 2 показателя не удалось проверить/)).toBeInTheDocument();
    expect(completeness()).toHaveTextContent(/Проверено: 4 из 6 показателей \(66,7\s?%\)/);
    expect(within(completeness()).getAllByRole("listitem").map((item) => item.textContent))
      .toEqual(["Подтверждено — 2", "Расхождения — 2", "Не проверено — 2"]);
    expect(conclusion().queryByText(/7\s818\s300/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Итого" }).closest("tr"))
      .toHaveTextContent("По представленным документам подтверждается часть затрат на 7 700 000,00 ₽; полной суммы нет.");
    const row = sample.rows.find((indicator) => indicator.id === "g-2")!;
    const updated = recheckDemo(sample, sample.docs.filter((doc) => doc.id !== row.sources[0]!.docId));
    rerender(<ChecksProvider><CheckDetail check={updated} version={2} /></ChecksProvider>);
    expect(conclusion().queryByText(/14\s800/)).not.toBeInTheDocument();
    expect(conclusion().getByText(/−25\s000 ₽/)).toBeInTheDocument();
    expect(completeness()).toHaveTextContent(/Проверено: 3 из 6 показателей \(50\s?%\)/);
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
  it("shows insufficient evidence with rule reasons and partial sums, without an unsupported document checklist", () => {
    const c = checks.find((check) => check.id === "c")!;
    const original = structuredClone(c);
    render(<ChecksProvider><CheckDetail check={c} /></ChecksProvider>);
    const section = screen.getByRole("heading", { name: "Недостаточно подтверждений" }).closest("section")!;
    expect(within(section).queryByText("Недостаточно данных для проверки")).not.toBeInTheDocument();
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
    render(<ChecksProvider><CheckDetail check={checks.find((check) => check.id === "a")!} /></ChecksProvider>);
    expect(screen.queryByRole("heading", { name: "Недостаточно подтверждений" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Достоверен" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Подписать вывод" })).not.toBeInTheDocument();
  });
  it("keeps partial amounts distinct from expected sums and omits the retired actions", () => {
    const c = checks.find((check) => check.id === "c")!;
    render(<ChecksProvider><CheckDetail check={c} /></ChecksProvider>);
    const trigger = screen.getByRole("button", { name: "Оплата труда" });
    fireEvent.click(trigger);
    const details = within(screen.getByRole("region", { name: "Подробности: Оплата труда" }));
    expect(details.getAllByRole("listitem")).toHaveLength(3);
    expect(details.queryByText("найдено 720000.00 за 3 из 4 мес.")).not.toBeInTheDocument();
    expect(trigger.closest("tr")).toHaveTextContent("Частично подтверждено");
    expect(details.queryByText(/^=/)).not.toBeInTheDocument();
    expect(details.queryByRole("button", { name: "Отметить как просмотренное" })).not.toBeInTheDocument();
    expect(details.queryByRole("textbox", { name: "Комментарий" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Подписать вывод" })).not.toBeInTheDocument();
  });
});
