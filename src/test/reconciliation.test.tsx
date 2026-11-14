import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { CheckDetail } from "@/pages/CheckDetail";
import { SourceViewer } from "@/components/check/SourceViewer";
import { ChecksProvider } from "@/context/ChecksContext";
import { checks, type Check } from "@/data/mock";
import { sumMoney } from "@/components/money-format";

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn(), Link: ({ children }: { children: import("react").ReactNode }) => <a>{children}</a> }));
beforeAll(() => { HTMLElement.prototype.scrollTo = vi.fn(); });
afterEach(cleanup);
const b = checks.find((check) => check.id === "b")!;
const a = checks.find((check) => check.id === "a")!;
function desk(check = b) {
  return render(<ChecksProvider><CheckDetail check={check} /></ChecksProvider>);
}
function expand(check: Check, id: string) {
  const row = check.rows.find((item) => item.id === id)!;
  const trigger = screen.getByRole("button", { name: row.name });
  if (trigger.getAttribute("aria-expanded") !== "true") fireEvent.click(trigger);
  return screen.getByRole("region", { name: `Подробности: ${row.name}` });
}
function openDocument(check: Check, id: string, index = 0) {
  const details = expand(check, id);
  const row = check.rows.find((item) => item.id === id)!;
  const doc = check.docs.find((item) => item.id === row.sources[index]!.docId)!;
  const trigger = within(details).getByRole("button", { name: `Открыть документ: ${doc.title}` });
  fireEvent.click(trigger);
  return trigger;
}
function closeDocument() {
  fireEvent.click(screen.getByRole("button", { name: "Скрыть источник документа" }));
}

describe("Reconciliation workspace", () => {
  it("expands the row in place; opening its document resets the panel to the exact source bbox", () => {
    desk();
    openDocument(b, "b-1");
    expect(screen.getByRole("region", { name: "Источник документа" })).toBeInTheDocument();
    closeDocument();
    const details = expand(b, "b-8");
    expect(screen.queryByRole("region", { name: "Источник документа" })).not.toBeInTheDocument();
    expect(within(details).getByText("Рекомендация")).toBeInTheDocument();
    openDocument(b, "b-8");
    expect(screen.getByRole("region", { name: "Источник документа" })).toBeInTheDocument();
    expect(screen.getByText("Стр. 2 / 2")).toBeInTheDocument();
    expect(screen.getByLabelText(/Подсвеченный фрагмент: Итого: 48\s570,00/)).toHaveStyle({ left: "66%", top: "34%", width: "20%", height: "3%" });
  });
  it("supports full-row clicks, Enter and Space with aria-expanded", () => {
    desk();
    const button = screen.getByRole("button", { name: b.rows[0]!.name });
    const row = button.closest("tr")!;
    expect(row).toHaveAttribute("tabindex", "0");
    expect(row).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(row);
    expect(row).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(row, { key: "Enter" });
    expect(row).toHaveAttribute("aria-expanded", "false");
    fireEvent.keyDown(row, { key: " " });
    expect(row).toHaveAttribute("aria-expanded", "true");
    expect(button).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(button);
    expect(row).toHaveAttribute("aria-expanded", "false");
  });
  it("returns focus to the source button and preserves expanded rows when the panel closes", async () => {
    desk();
    expand(b, "b-8");
    const trigger = openDocument(b, "b-1", 2);
    closeDocument();
    expect(screen.getByRole("region", { name: "Подробности: Оплата труда" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Подробности: Командировки" })).toBeInTheDocument();
    await vi.waitFor(() => expect(trigger).toHaveFocus());
  });
  it("does not offer an explanation block for a verified indicator", () => {
    desk(a); expand(a, "a-1");
    expect(screen.queryByText("Что не сходится")).not.toBeInTheDocument();
    openDocument(a, "a-1");
    expect(screen.queryByRole("tab", { name: "Объяснение и рекомендация" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Источник документа" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Правило проверки" })).not.toBeInTheDocument();
  });
  it("moves between actual discrepancies, expanding each and excluding service totals", () => {
    desk();
    const issues = b.rows.filter((row) => !row.service && row.status === "discrepancy");
    expect(screen.getByRole("button", { name: issues[0]!.name })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Предыдущее расхождение" })).toBeDisabled();
    for (const issue of issues.slice(1)) {
      fireEvent.click(screen.getByRole("button", { name: "Следующее расхождение" }));
      expect(screen.getByRole("button", { name: issue.name })).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("button", { name: issue.name })).toHaveAttribute("aria-pressed", "true");
    }
    expect(screen.getByRole("button", { name: "Следующее расхождение" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Предыдущее расхождение" }));
    expect(screen.getByRole("button", { name: issues.at(-2)!.name })).toHaveAttribute("aria-pressed", "true");
  });
  it("shows source metadata, addends and the exact total without confusing a document with the aggregate", () => {
    desk();
    const details = expand(b, "b-1");
    expect(within(details).getByText("№ ВЗ-08 · 31.08.2026 · Стр. 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Сумма документов: Оплата труда")).toHaveTextContent("380\u202f000,00 + 380\u202f000,00 + 375\u202f000,00 + 380\u202f000,00 = 1\u202f515\u202f000,00 ₽", { normalizeWhitespace: false });
    openDocument(b, "b-1");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Ведомость ЗП, август 2026, источник 3" }), { key: "Enter" });
    expect(screen.getByLabelText(/Подсвеченный фрагмент: Итого: 375\s000,00/)).toBeInTheDocument();
    expect(screen.getByText("3 / 4")).toBeInTheDocument();
  });
  it("does not sum ambiguous document candidates as if they were accepted addends", () => {
    const c = checks.find((check) => check.id === "c")!;
    desk(c); expand(c, "c-7");
    expect(screen.getByRole("list", { name: "Документы: Аренда помещения" }).children).toHaveLength(4);
    expect(screen.queryByLabelText("Сумма документов: Аренда помещения")).not.toBeInTheDocument();
  });
  it("clears stale evidence for empty searches and keeps the expansion after reset", () => {
    desk(); expand(b, "b-1");
    fireEvent.change(screen.getByRole("textbox", { name: "Поиск показателя или документа" }), { target: { value: "несуществующий документ" } });
    expect(screen.getByText("Показатели не найдены")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Источник документа" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Сбросить фильтры" }));
    expect(screen.getByRole("region", { name: "Подробности: Оплата труда" })).toBeInTheDocument();
  });
  it("disables discrepancy navigation when everything is verified", () => {
    desk(a);
    expect(screen.getByText("Расхождений нет")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Следующее расхождение" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Предыдущее расхождение" })).toBeDisabled();
  });
  it("navigates with Alt + arrows but does not hijack text editing", () => {
    desk();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Поиск показателя или документа" }), { key: "ArrowDown", altKey: true });
    expect(screen.getByRole("button", { name: b.rows[0]!.name })).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(screen.getByRole("region", { name: "Рабочее место сверки" }), { key: "ArrowDown", altKey: true });
    expect(screen.getByRole("button", { name: "Предыдущее расхождение" })).toBeEnabled();
  });
  it("shows missing evidence and recommendations in a source-less expanded row", () => {
    const g = checks.find((check) => check.id === "g")!;
    desk(g); const details = expand(g, "g-5");
    expect(within(details).getByText(/не подтверждена отдельным расчётом/)).toBeInTheDocument();
    expect(within(details).getByText("Рекомендация")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Подсвеченный фрагмент/)).not.toBeInTheDocument();
  });
  it("keeps the selected page and zoom when the source panel is collapsed and restored", () => {
    desk();
    openDocument(b, "b-8");
    fireEvent.click(screen.getByRole("button", { name: "Увеличить масштаб" }));
    closeDocument();
    expect(screen.queryByRole("region", { name: "Источник документа" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Показать источник документа" }));
    expect(screen.getByLabelText("Масштаб документа")).toHaveTextContent("125%");
    expect(screen.getByText("Стр. 2 / 2")).toBeInTheDocument();
  });
  it("keeps metadata and highlights synchronized across documents", () => {
    desk(); openDocument(b, "b-1");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Ведомость ЗП, август 2026, источник 3" }), { key: "Enter" });
    expect(screen.getByLabelText("Реквизиты документа")).toHaveTextContent("ВЗ-08 · 31.08.2026 · СИН-2026/12");
    expect(screen.getByLabelText(/Подсвеченный фрагмент: Итого: 375\s000,00/)).toBeInTheDocument();
    closeDocument(); openDocument(b, "b-4");
    expect(screen.getByLabelText(/Подсвеченный фрагмент: Итого: 280\s000,00/)).toBeInTheDocument();
    expect(screen.getByLabelText("Реквизиты документа")).toHaveTextContent("СП-27 · 28.08.2026 · СИН-2026/12");
  });
  it("sums source money exactly, including negative amounts and large values", () => {
    expect(sumMoney(["0.10", "0.20", "-0.30"])).toBe("0.00");
    expect(sumMoney(["9007199254740991.99", "0.01"])).toBe("9007199254740992.00");
    expect(sumMoney(["-12.31", "2.10"])).toBe("-10.21");
  });
});

describe("Document location controls", () => {
  it("filters annotations by type and restores the targeted amount on demand", () => {
    const row = a.rows[0]!;
    const source = row.sources[0]!;
    const doc = a.docs.find((d) => d.id === source.docId)!;
    render(<SourceViewer row={row} source={source} doc={doc} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Подсветка: Суммы" }));
    expect(screen.queryByLabelText(/Подсвеченный фрагмент/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Распознанное поле: Дата:/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "К сумме" }));
    expect(screen.getByRole("checkbox", { name: "Подсветка: Суммы" })).toBeChecked();
    expect(screen.getByLabelText(/Подсвеченный фрагмент/)).toHaveAttribute("data-kind", "money");
    fireEvent.click(screen.getByRole("button", { name: "Скрыть подсветку" }));
    expect(screen.queryByLabelText(/Распознанное поле:/)).not.toBeInTheDocument();
  });
  it("returns to the exact source page and re-enables its highlight", () => {
    const row = a.rows.find((r) => r.id === "a-7")!;
    const source = row.sources[0]!;
    const doc = a.docs.find((d) => d.id === source.docId)!;
    render(<SourceViewer row={row} source={source} doc={doc} />);
    expect(screen.getByText("Стр. 2 / 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Предыдущая страница" }));
    expect(screen.queryByLabelText(/Подсвеченный фрагмент/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "К сумме" }));
    expect(screen.getByText("Стр. 2 / 2")).toBeInTheDocument();
    expect(screen.getByLabelText(/Подсвеченный фрагмент/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Скрыть подсветку" }));
    expect(screen.queryByLabelText(/Подсвеченный фрагмент/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "К сумме" }));
    expect(screen.getByLabelText(/Подсвеченный фрагмент/)).toBeInTheDocument();
  });
  it("bounds zoom and resets to fit width", () => {
    const row = a.rows[0]!;
    const source = row.sources[0]!;
    const doc = a.docs.find((d) => d.id === source.docId)!;
    render(<SourceViewer row={row} source={source} doc={doc} />);
    for (let i = 0; i < 3; i++)
      fireEvent.click(screen.getByRole("button", { name: "Увеличить масштаб" }));
    expect(screen.getByLabelText("Масштаб документа")).toHaveTextContent("175%");
    expect(screen.getByRole("button", { name: "Увеличить масштаб" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Сбросить масштаб" }));
    expect(screen.getByLabelText("Масштаб документа")).toHaveTextContent("100%");
  });
});
