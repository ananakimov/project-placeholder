import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Checks } from "@/pages/Checks";
import { CheckHeader } from "@/components/check/CheckHeader";
import { ChecksProvider } from "@/context/ChecksContext";
import { checks } from "@/data/mock";
import { checkName } from "@/lib/check-name";

const navigate = vi.hoisted(() => vi.fn());
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  Link: ({ to, params, children, "aria-label": label }: { to: string; params?: { id: string }; children: ReactNode; "aria-label"?: string }) =>
    <a href={to.replace("$id", params?.id ?? "")} aria-label={label}>{children}</a>,
}));
afterEach(() => { cleanup(); localStorage.clear(); navigate.mockClear(); });
function setup() { render(<ChecksProvider><Checks /></ChecksProvider>); }
function resultLinks() {
  return within(screen.getByRole("table")).getAllByRole("link", { name: /^(КФЗ №|Проверка КФЗ №)/ });
}

describe("Check names", () => {
  it("uses only an explicit document number and keeps run identifiers distinct", () => {
    expect(checkName({ id: "g", kfzNumber: " 3/7 " })).toBe("КФЗ №3/7");
    for (const kfzNumber of ["", " ", "б/н", "Б/Н", "—", "-"]) {
      expect(checkName({ id: "b", kfzNumber })).toBe("Проверка КФЗ №b");
    }
    expect(checkName(undefined)).toBe("Проверка не найдена");
  });

  it("does not equate a missing number with synthetic provenance", () => {
    const check = { ...checks.find((item) => item.id === "b")!, synthetic: false };
    render(<CheckHeader check={check} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Проверка КФЗ №b");
    expect(screen.queryByText("Пример", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText("Договор СИН-2026/12 · Период 01.06.2026–30.09.2026")).toBeInTheDocument();
  });
});

describe("Checks list", () => {
  it("keeps result links, provenance, conclusions and dates without overview cards", () => {
    setup();
    expect(screen.getByRole("heading", { name: "Проверки", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Сверяйте отчёты с первичными документами. Разбирайте только то, что требует внимания.")).toBeInTheDocument();
    expect(resultLinks().map((link) => link.textContent)).toEqual(["Проверка КФЗ №c", "КФЗ №3/7", "Проверка КФЗ №a", "Проверка КФЗ №b"]);
    expect(resultLinks().map((link) => link.getAttribute("href"))).toEqual(["/checks/c", "/checks/g", "/checks/a", "/checks/b"]);
    expect(screen.queryByText("Демо-режим · синтетические результаты")).not.toBeInTheDocument();
    expect(screen.queryByText("Пример", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText("Подтверждено", { exact: true })).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getAllByText("Есть расхождения", { exact: true })).toHaveLength(2);
    expect(within(screen.getByRole("table")).getByText("Неполные данные", { exact: true })).toBeInTheDocument();
    expect(screen.getAllByText("13.11.2026")).toHaveLength(2);
    expect(screen.queryByText("Всего проверок")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Новая проверка" })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Показано \d/)).not.toBeInTheDocument();
  });

  it("combines filters with search by the visible name or contract and resets an empty result", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Есть расхождения 2" }));
    expect(resultLinks()).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Неполные данные 2" }));
    expect(resultLinks().map((link) => link.getAttribute("href"))).toEqual(["/checks/c", "/checks/g"]);
    fireEvent.click(screen.getByRole("button", { name: "Есть расхождения 2" }));
    expect(screen.queryByRole("link", { name: "Проверка КФЗ №a" })).not.toBeInTheDocument();
    const search = screen.getByRole("textbox", { name: "Поиск проверок" });
    fireEvent.change(search, { target: { value: "КФЗ №3/7" } });
    expect(resultLinks().map((link) => link.getAttribute("href"))).toEqual(["/checks/g"]);
    fireEvent.change(search, { target: { value: "СИН-2026/12" } });
    expect(resultLinks().map((link) => link.getAttribute("href"))).toEqual(["/checks/b"]);
    fireEvent.click(screen.getByRole("button", { name: "Без расхождений 1" }));
    expect(screen.getByText("Проверки не найдены")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Сбросить фильтры" }));
    expect(search).toHaveValue("");
    expect(screen.getByRole("button", { name: "Все 4" })).toHaveAttribute("aria-pressed", "true");
    expect(resultLinks()).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Без расхождений 1" }));
    expect(resultLinks().map((link) => link.getAttribute("href"))).toEqual(["/checks/a"]);
  });

  it("opens the row while leaving the native link available for keyboard navigation", () => {
    setup();
    const link = screen.getByRole("link", { name: "КФЗ №3/7" });
    fireEvent.click(within(link.closest("tr")!).getByText("13.11.2026"));
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ to: "/checks/$id", params: { id: "g" } });
    expect(link).toHaveAttribute("href", "/checks/g");
  });

  it("omits manual jobs without a financial result from the checks list", () => {
    localStorage.setItem("doccheck.demo-queue.v1", JSON.stringify([
      { id: "older", createdAt: 1_800_000_000_000, startsAt: 1_800_000_000_000, documents: 1 },
      { id: "newer", createdAt: 1_800_000_000_001, startsAt: 1_800_000_005_000, documents: 2 },
    ]));
    setup();
    expect(screen.getByRole("button", { name: "Все 4" })).toBeInTheDocument();
    expect(screen.queryByText(/^Проверка КФЗ ·/)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^Ваши проверки/ })).not.toBeInTheDocument();
  });
});
