import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { CheckDetail } from "@/pages/CheckDetail";
import { SourceViewer } from "@/components/check/SourceViewer";
import { ChecksProvider } from "@/context/ChecksContext";
import { RoleProvider } from "@/context/RoleContext";
import { checks } from "@/data/mock";

beforeAll(() => {
  HTMLElement.prototype.scrollTo = vi.fn();
});
afterEach(cleanup);
const b = checks.find((c) => c.id === "b")!;
const a = checks.find((c) => c.id === "a")!;
function desk(check = b) {
  return render(
    <RoleProvider>
      <ChecksProvider>
        <CheckDetail check={check} />
      </ChecksProvider>
    </RoleProvider>,
  );
}

describe("Reconciliation workspace", () => {
  it("moves between actual discrepancies, excluding service totals and verified rows", () => {
    desk();
    const issues = b.rows.filter((r) => !r.service && r.status === "discrepancy");
    expect(screen.getByRole("button", { name: issues[0]!.name })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Предыдущее расхождение" })).toBeDisabled();
    for (const issue of issues.slice(1)) {
      fireEvent.click(screen.getByRole("button", { name: "Следующее расхождение" }));
      expect(screen.getByRole("button", { name: issue.name })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    }
    expect(screen.getByRole("button", { name: "Следующее расхождение" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Предыдущее расхождение" }));
    expect(screen.getByRole("button", { name: issues.at(-2)!.name })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
  it("switches documents within an aggregate without confusing a single document with the total", () => {
    desk();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Ведомость ЗП, август 2026, источник 3" }), {
      key: "Enter",
    });
    expect(screen.getByLabelText(/Подсвеченный фрагмент: Итого: 375\s000,00/)).toBeInTheDocument();
    expect(screen.getByText("Сумма показателя собрана из 4 документов.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Следующее расхождение" }));
    expect(screen.getByRole("tab", { name: /источник 1$/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
  it("clears stale evidence for empty searches and restores a valid selection on reset", () => {
    desk();
    fireEvent.change(screen.getByRole("textbox", { name: "Поиск показателя или документа" }), {
      target: { value: "несуществующий документ" },
    });
    expect(screen.getByText("Показатели не найдены")).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Документы показателя" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Сбросить фильтры" }));
    expect(screen.getByRole("tablist", { name: "Документы показателя" })).toBeInTheDocument();
  });
  it("disables discrepancy navigation when everything is verified", () => {
    desk(a);
    expect(screen.getByText("Расхождений нет")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Следующее расхождение" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Предыдущее расхождение" })).toBeDisabled();
  });
  it("navigates with Alt + arrows but does not hijack text editing", () => {
    desk();
    const input = screen.getByRole("textbox", { name: "Поиск показателя или документа" });
    fireEvent.keyDown(input, { key: "ArrowDown", altKey: true });
    expect(screen.getByRole("button", { name: b.rows[0]!.name })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const region = screen.getByRole("region", { name: "Рабочее место сверки" });
    fireEvent.keyDown(region, { key: "ArrowDown", altKey: true });
    expect(screen.getByRole("button", { name: "Предыдущее расхождение" })).toBeEnabled();
  });
  it("selects a source-less row and shows its missing evidence state", () => {
    desk(checks.find((c) => c.id === "g")!);
    fireEvent.click(screen.getByRole("button", { name: "Открыть источник: Трудоёмкость, чел.-ч" }));
    expect(screen.getByText("Нет подтверждающего документа")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Подсвеченный фрагмент/)).not.toBeInTheDocument();
  });
  it("links extracted fields to their exact page and preserves zoom within the document", () => {
    desk(a);
    const row = a.rows.find((r) => r.id === "a-7")!;
    fireEvent.click(screen.getByRole("button", { name: row.name }));
    fireEvent.keyDown(screen.getByRole("tab", { name: "Поля документа" }), { key: "Enter" });
    expect(screen.getByRole("textbox", { name: "Сумма" })).toHaveValue("180\u202f000,00");
    fireEvent.click(screen.getByRole("button", { name: "Увеличить масштаб" }));
    fireEvent.click(screen.getByRole("button", { name: "Показать поле «Дата» в документе" }));
    expect(screen.getByText("Стр. 1 / 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Подсвеченный фрагмент: Дата: 30.09.2026")).toHaveAttribute(
      "data-kind",
      "date",
    );
    expect(screen.getByLabelText("Масштаб документа")).toHaveTextContent("125%");
    fireEvent.click(screen.getByRole("button", { name: "Показать поле «Сумма» в документе" }));
    expect(screen.getByText("Стр. 2 / 2")).toBeInTheDocument();
    expect(screen.getByLabelText(/Подсвеченный фрагмент: Сумма:/)).toHaveAttribute(
      "data-kind",
      "money",
    );
  });
  it("keeps the fields synchronized when switching documents or discrepancies", () => {
    desk();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Поля документа" }), { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Показать поле «Дата» в документе" }));
    fireEvent.keyDown(screen.getByRole("tab", { name: "Ведомость ЗП, август 2026, источник 3" }), {
      key: "Enter",
    });
    expect(screen.getByRole("textbox", { name: "Дата" })).toHaveValue("31.08.2026");
    expect(screen.getByLabelText(/Подсвеченный фрагмент: Итого: 375\s000,00/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Следующее расхождение" }));
    expect(screen.getByLabelText(/Подсвеченный фрагмент: Итого: 280\s000,00/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Сумма" })).toHaveValue("280\u202f000,00");
  });
});

describe("Document location controls", () => {
  it("filters annotations by type and restores the targeted amount on demand", () => {
    const row = a.rows[0]!;
    const source = row.sources[0]!;
    const doc = a.docs.find((d) => d.id === source.docId)!;
    render(<SourceViewer row={row} source={source} doc={doc} onWhy={() => {}} />);
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
    render(<SourceViewer row={row} source={source} doc={doc} onWhy={() => {}} />);
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
    render(<SourceViewer row={row} source={source} doc={doc} onWhy={() => {}} />);
    for (let i = 0; i < 3; i++)
      fireEvent.click(screen.getByRole("button", { name: "Увеличить масштаб" }));
    expect(screen.getByLabelText("Масштаб документа")).toHaveTextContent("175%");
    expect(screen.getByRole("button", { name: "Увеличить масштаб" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Сбросить масштаб" }));
    expect(screen.getByLabelText("Масштаб документа")).toHaveTextContent("100%");
  });
});
