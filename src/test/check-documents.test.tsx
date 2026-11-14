import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckDocuments } from "@/pages/CheckDocuments";
import { checks } from "@/data/mock";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
afterEach(cleanup);
const g = checks.find((check) => check.id === "g")!;

describe("Document state filters", () => {
  it("partitions the example into read and erroneous files, retaining each error reason", () => {
    render(<CheckDocuments check={g} />);
    const filters = screen.getByRole("radiogroup", { name: "Состояние файла" });
    expect(within(filters).getAllByRole("radio").map((button) => button.textContent)).toEqual([
      "Все (23)", "Прочитано (20)", "Ошибочные (3)",
    ]);
    expect(screen.getAllByRole("row")).toHaveLength(24);

    fireEvent.click(screen.getByRole("radio", { name: "Ошибочные (3)" }));
    expect(screen.getAllByRole("row")).toHaveLength(4);
    expect(within(screen.getByRole("row", { name: /Акт ADM-48 \(копия\)/ })).getByRole("cell", { name: "Дубликат" })).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /Акт № ОРГ-0604/ })).getByRole("cell", { name: "Вне периода проверки" })).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /Акт № ADM-96/ })).getByRole("cell", { name: "Другой договор" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Прочитано (20)" }));
    expect(screen.getAllByRole("row")).toHaveLength(21);
    expect(screen.getAllByRole("cell", { name: "Прочитано" })).toHaveLength(20);
    // A read source of a discrepant indicator is still a successfully read file.
    expect(screen.getByRole("row", { name: /Акт № 284/ })).toBeInTheDocument();
    expect(screen.queryByText("Акт ADM-48 (копия)")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Все (23)" }));
    expect(screen.getAllByRole("row")).toHaveLength(24);
    expect(screen.getByRole("cell", { name: "Дубликат" })).toBeInTheDocument();
  });

  it("includes unread files among errors and shows the reading failure in the state cell", () => {
    const c = checks.find((check) => check.id === "c")!;
    render(<CheckDocuments check={c} />);
    fireEvent.click(screen.getByRole("radio", { name: "Ошибочные (1)" }));
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(within(screen.getByRole("row", { name: /УПД 0822-7.png/ })).getByRole("cell", { name: "Не удалось прочитать" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /^Прочитано/ }));
    expect(screen.queryByText("УПД 0822-7.png")).not.toBeInTheDocument();
  });

  it("shows an empty state for a check without erroneous documents and keeps the filter selected", () => {
    render(<CheckDocuments check={checks.find((check) => check.id === "a")!} />);
    const errors = screen.getByRole("radio", { name: "Ошибочные (0)" });
    fireEvent.click(errors);
    expect(screen.getByText("Документов в этом состоянии нет")).toBeInTheDocument();
    fireEvent.click(errors);
    expect(errors).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Документов в этом состоянии нет")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /^Все/ }));
    expect(screen.queryByText("Документов в этом состоянии нет")).not.toBeInTheDocument();
  });
});
