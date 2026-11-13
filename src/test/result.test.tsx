import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { CheckDetail } from "@/pages/CheckDetail";
import { CheckHeader } from "@/components/check/CheckHeader";
import { ChecksProvider, useChecks } from "@/context/ChecksContext";
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
  it("shows the conclusion, three counters, coverage and problems before the full table", () => {
    setup();
    const summary = screen.getByRole("region", { name: "Заключение по проверке" });
    expect(within(summary).getByRole("heading", { name: "Недостоверен" })).toBeInTheDocument();
    expect(Array.from(screen.getByLabelText("Счётчики показателей").querySelectorAll("dd")).map((node) => node.textContent)).toEqual(["6", "5", "0"]);
    expect(within(summary).getByText("38,6%")).toBeInTheDocument();
    expect(within(summary).getByText("Найденные проблемы")).toBeInTheDocument();
    expect(summary.compareDocumentPosition(screen.getByRole("table", { name: "Показатели КФЗ" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const navigation = screen.getByRole("navigation", { name: "Разделы проверки" });
    expect(within(navigation).getAllByRole("link").map((link) => link.textContent)).toEqual(["Результат", "Документы"]);
  });
  it("opens and scrolls to a problem row even if search and filters had hidden it", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Подтверждено 6" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Поиск показателя или документа" }), { target: { value: "нет такого" } });
    fireEvent.click(screen.getByRole("button", { name: "Перейти к строке: Командировки" }));
    const trigger = screen.getByRole("button", { name: "Командировки" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "Подробности: Командировки" })).toBeInTheDocument();
    expect(trigger.closest("tr")).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
    expect(screen.getByRole("textbox", { name: "Поиск показателя или документа" })).toHaveValue("");
    expect(screen.getByRole("button", { name: "Все 11" })).toHaveAttribute("aria-pressed", "true");
  });
  it("keeps every problem linked to an existing indicator", () => {
    for (const check of checks) for (const block of PROBLEMS[check.id] ?? []) for (const problem of block.items) {
      expect(problem.rowIds.length).toBeGreaterThan(0);
      for (const id of problem.rowIds) expect(check.rows.some((row) => row.id === id)).toBe(true);
    }
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
      expect(within(details).queryByRole("button", { name: "Исправить значение" })).not.toBeInTheDocument();
      fireEvent.change(within(details).getByRole("textbox", { name: "Комментарий" }), { target: { value: `Проверена строка ${id}` } });
      fireEvent.click(within(details).getByRole("button", { name: "Сохранить" }));
      fireEvent.click(within(details).getByRole("button", { name: "Отметить как просмотренное" }));
    }
    expect(signButton).toBeEnabled();
    fireEvent.click(signButton);
    expect(screen.getByText("Подписано: главный бухгалтер Иванова А. С., 14.11.2026 10:15")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Пояснение бухгалтера" })).toBeDisabled();
    expect(within(screen.getByRole("region", { name: "Подробности: Оплата труда" })).getByRole("textbox", { name: "Комментарий" })).toHaveValue("Проверена строка b-1");
  }, 15_000); // Full UI workflow must also fit on the slower GitHub Actions runner.
});
