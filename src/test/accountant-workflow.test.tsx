import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Sidebar } from "@/components/layout/Sidebar";
import { CheckHeader } from "@/components/check/CheckHeader";
import { CheckConclusion } from "@/pages/CheckConclusion";
import { CheckExceptions } from "@/pages/CheckExceptions";
import { ChecksProvider, useChecks } from "@/context/ChecksContext";
import { checks } from "@/data/mock";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: "/checks/b/exceptions" } }),
}));

beforeAll(() => {
  HTMLElement.prototype.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function Workspace() {
  const check = useChecks().getCheck("b")!;
  return <>
    <output data-testid="check-state">{check.state}</output>
    <Sidebar />
    <CheckHeader check={check} />
    <CheckExceptions check={check} />
    <CheckConclusion check={check} />
  </>;
}
function setup() {
  return render(<ChecksProvider><Workspace /></ChecksProvider>);
}
const b = checks.find((check) => check.id === "b")!;
function selectRow(id: string) {
  const row = b.rows.find((item) => item.id === id)!;
  const name = row.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${name}`) }));
}

describe("Single accountant workflow", () => {
  it("keeps accountant actions available and removes role and journal controls", () => {
    setup();
    const sidebar = screen.getByRole("complementary");
    expect(within(sidebar).queryByText("Бухгалтер", { exact: true })).not.toBeInTheDocument();
    expect(within(sidebar).queryByText("Анна Иванова")).not.toBeInTheDocument();
    expect(within(sidebar).queryByText("АИ", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("КФЗ № б/н · 2 этап, 2026 г.");
    expect(screen.getByText("Синтетика")).toBeInTheDocument();
    expect(screen.getByText("Договор СИН-2026/12 · Период 01.06.2026–30.09.2026")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Роль пользователя" })).not.toBeInTheDocument();
    expect(screen.queryByText("Аспирант")).not.toBeInTheDocument();
    expect(screen.queryByText("Режим просмотра")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Журнал действий" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Журнал" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Отметить как просмотренное" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Черновик пояснения" })).toBeEnabled();
    expect(screen.getByRole("textbox", { name: "Пояснение бухгалтера" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Подписать вывод" })).toBeDisabled();
    selectRow("b-1");
    expect(screen.getByRole("button", { name: "Исправить значение" })).toBeEnabled();
  });

  it("preserves comments and review marks when switching indicators", () => {
    setup();
    selectRow("b-1");
    fireEvent.change(screen.getByRole("textbox", { name: "Комментарий" }), { target: { value: "Проверено по ведомости" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    fireEvent.click(screen.getByRole("button", { name: "Отметить как просмотренное" }));
    selectRow("b-4");
    selectRow("b-1");
    expect(screen.getByRole("textbox", { name: "Комментарий" })).toHaveValue("Проверено по ведомости");
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Просмотрено" })).toBeDisabled();
  });

  it("requires reviewing every problem before signing and invalidates the signature after a correction", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 14, 9, 5));
    setup();
    const signButton = screen.getByRole("button", { name: "Подписать вывод" });
    const explanation = screen.getByRole("textbox", { name: "Пояснение бухгалтера" });
    for (const id of b.exceptionOrder) {
      expect(signButton).toBeDisabled();
      selectRow(id);
      fireEvent.click(screen.getByRole("button", { name: "Отметить как просмотренное" }));
    }
    fireEvent.change(explanation, { target: { value: "Все расхождения рассмотрены." } });
    expect(signButton).toBeEnabled();
    fireEvent.click(signButton);
    expect(screen.getByText("Подписано: главный бухгалтер Иванова А. С., 14.11.2026 09:05")).toBeInTheDocument();
    expect(explanation).toBeDisabled();

    selectRow("b-1");
    fireEvent.click(screen.getByRole("button", { name: "Исправить значение" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Сохранить" }));
    expect(screen.queryByText(/^Подписано:/)).not.toBeInTheDocument();
    expect(screen.getByTestId("check-state")).toHaveTextContent("Нужна повторная подпись");
    expect(explanation).toBeEnabled();
    expect(explanation).toHaveValue("Все расхождения рассмотрены.");
  }, 15_000); // Preserve the complete review/sign/correct flow on slower CI machines.
});
