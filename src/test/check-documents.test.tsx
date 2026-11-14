import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckDocuments } from "@/pages/CheckDocuments";
import { checks } from "@/data/mock";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/checks/g">{children}</a>,
}));
HTMLElement.prototype.scrollTo = vi.fn();
afterEach(cleanup);
const g = checks.find((check) => check.id === "g")!;

describe("Document state filters", () => {
  it("partitions the example into read and excluded files, retaining exclusion reasons", () => {
    render(<CheckDocuments check={g} />);
    const filters = screen.getByRole("radiogroup", { name: "Статус" });
    expect(within(filters).getAllByRole("radio").map((button) => button.textContent)).toEqual([
      "Все (23)", "Прочитано (20)", "Исключены (3)",
    ]);
    expect(screen.getAllByRole("row")).toHaveLength(24);

    fireEvent.click(screen.getByRole("radio", { name: "Исключены (3)" }));
    expect(screen.getAllByRole("row")).toHaveLength(4);
    expect(within(screen.getByRole("row", { name: /Акт ADM-48 \(копия\)/ })).getByRole("cell", { name: "Дубликат" })).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /Акт № ОРГ-0604/ })).getByRole("cell", { name: "Вне периода проверки" })).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /Акт № ADM-96/ })).getByRole("cell", { name: "Другой договор" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Прочитано (20)" }));
    expect(screen.getAllByRole("row")).toHaveLength(21);
    expect(screen.getAllByRole("cell", { name: "Прочитано" })).toHaveLength(20);
    // A read source of a discrepant indicator is still a successfully read file.
    expect(screen.getByRole("row", { name: /Акт № 284/ })).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /Акт ADM-48 \(копия\)/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Все (23)" }));
    expect(screen.getAllByRole("row")).toHaveLength(24);
    expect(screen.getByRole("cell", { name: "Дубликат" })).toBeInTheDocument();
  });

  it("includes unread files among errors and shows the reading failure in the state cell", () => {
    const c = checks.find((check) => check.id === "c")!;
    render(<CheckDocuments check={c} />);
    fireEvent.click(screen.getByRole("radio", { name: "Ошибка чтения (1)" }));
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(within(screen.getByRole("row", { name: /УПД 0822-7.png/ })).getByRole("cell", { name: "Не удалось прочитать" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /^Прочитано/ }));
    expect(screen.queryByRole("row", { name: /УПД 0822-7.png/ })).not.toBeInTheDocument();
  });

  it("omits the reading-error filter when no documents failed", () => {
    render(<CheckDocuments check={checks.find((check) => check.id === "a")!} />);
    expect(screen.queryByRole("radio", { name: /^Ошибка чтения/ })).not.toBeInTheDocument();
    const excluded = screen.getByRole("radio", { name: "Исключены (0)" });
    fireEvent.click(excluded);
    expect(screen.getByText("Документов с этим статусом нет")).toBeInTheDocument();
    fireEvent.click(excluded);
    expect(excluded).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Документов с этим статусом нет")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /^Все/ }));
    expect(screen.queryByText("Документов с этим статусом нет")).not.toBeInTheDocument();
  });

  it("uses article names and opens the same right panel with the actual source", () => {
    render(<CheckDocuments check={g} version={1} />);
    const row = screen.getByRole("row", { name: /Акт № 284/ });
    expect(within(row).getByRole("link", { name: "0800 · Общепроизводственные затраты" })).toBeInTheDocument();
    expect(within(row).queryByText("g-3")).not.toBeInTheDocument();
    fireEvent.keyDown(row, { key: " " });
    const panel = within(screen.getByRole("region", { name: "Источник документа" }));
    const image = panel.getByRole("img", { name: /Акт_284/ });
    fireEvent.load(image);
    expect(panel.getByRole("combobox", { name: "Документы комплекта" })).toHaveValue(g.docs.find((doc) => doc.number === "284")!.id);
    expect(panel.getByLabelText(/Подсвеченный фрагмент/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Скрыть источник документа" }));
    fireEvent.click(screen.getByRole("button", { name: "Показать источник документа" }));
    expect(panel.getByRole("img", { name: /Акт_284/ })).toBe(image);
  });
});
