import type { ReactNode } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Sidebar } from "@/components/layout/Sidebar";
import { CheckHeader } from "@/components/check/CheckHeader";
import { CheckDetail } from "@/pages/CheckDetail";
import { ChecksProvider, useChecks } from "@/context/ChecksContext";

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
    <CheckDetail check={check} />
  </>;
}
function setup() {
  return render(<ChecksProvider><Workspace /></ChecksProvider>);
}
describe("Single accountant workflow", () => {
  it("keeps result navigation free of role, journal and manual workflow controls", () => {
    setup();
    const sidebar = screen.getByRole("complementary", { name: "Меню DocCheck" });
    expect(within(sidebar).queryByText("Бухгалтер", { exact: true })).not.toBeInTheDocument();
    expect(within(sidebar).queryByRole("button", { name: "Развернуть меню" })).not.toBeInTheDocument();
    expect(within(sidebar).queryByText("Анна Иванова")).not.toBeInTheDocument();
    expect(within(sidebar).queryByText("АИ", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Проверка КФЗ №b");
    expect(screen.getByText("2 этап, 2026 г.")).toBeInTheDocument();
    expect(screen.queryByText("Пример", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText("Результат демонстрационной проверки")).toBeInTheDocument();
    expect(screen.getByText("Договор СИН-2026/12 · Период 01.06.2026–30.09.2026")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Роль пользователя" })).not.toBeInTheDocument();
    expect(screen.queryByText("Аспирант")).not.toBeInTheDocument();
    expect(screen.queryByText("Режим просмотра")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Журнал действий" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Журнал" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Отметить как просмотренное" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Черновик запроса" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Черновик пояснения" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Пояснение бухгалтера" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Подписать вывод" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Исправить значение" })).not.toBeInTheDocument();
  });
});
