import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewCheck } from "@/pages/NewCheck";
import { ChecksProvider, useChecks } from "@/context/ChecksContext";
import { checks } from "@/data/mock";

const navigate = vi.hoisted(() => vi.fn());
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));

function JournalProbe() {
  const { getCheck } = useChecks();
  return <output data-testid="journal">{JSON.stringify(getCheck("g")?.log)}</output>;
}
function setup(sampleReport = false) {
  const result = render(
    <ChecksProvider>
      <NewCheck />
      <JournalProbe />
    </ChecksProvider>,
  );
  if (sampleReport) fireEvent.click(screen.getByRole("button", { name: "Загрузить пример" }));
  fireEvent.click(screen.getByRole("button", { name: "Перейти к шагу «Первичные документы»" }));
  return result;
}
function launchAndCheck() {
  vi.useFakeTimers();
  fireEvent.click(screen.getByRole("button", { name: "Запустить проверку" }));
  act(() => vi.advanceTimersByTime(2800));
  expect(navigate).toHaveBeenCalledWith({ to: "/checks/$id", params: { id: "g" } });
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  navigate.mockReset();
});

describe("Two-step new check", () => {
  it("requires a report even when primary documents have been added", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Загрузить пример" }));
    expect(screen.getByRole("button", { name: "Запустить проверку" })).toBeDisabled();
  });

  it("requires at least one primary document even when a report has been added", () => {
    setup(true);
    expect(screen.getByRole("button", { name: "Запустить проверку" })).toBeDisabled();
  });

  it("launches the example directly to g without modifying its journal", () => {
    setup(true);
    fireEvent.click(screen.getByRole("button", { name: "Загрузить пример" }));
    expect(screen.getByRole("button", { name: "Запустить проверку" })).toBeEnabled();
    launchAndCheck();
    expect(JSON.parse(screen.getByTestId("journal").textContent ?? "[]")).toEqual(
      checks.find((check) => check.id === "g")?.log,
    );
  });

  it("launches user-uploaded files to g just like the example", () => {
    const { container } = render(
      <ChecksProvider>
        <NewCheck />
      </ChecksProvider>,
    );
    const reportInput = container.querySelector('input[type="file"]');
    if (!reportInput) throw new Error("Report input missing");
    fireEvent.change(reportInput, {
      target: { files: [new File(["report"], "Мой отчёт.pdf", { type: "application/pdf" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Перейти к шагу «Первичные документы»" }));
    const docsInput = container.querySelector('input[type="file"]');
    if (!docsInput) throw new Error("Documents input missing");
    fireEvent.change(docsInput, {
      target: { files: [new File(["document"], "Мой акт.pdf", { type: "application/pdf" })] },
    });
    expect(screen.getByRole("button", { name: "Запустить проверку" })).toBeEnabled();
    launchAndCheck();
  });

  it("disables launch again after the last document is removed", () => {
    const { container } = setup(true);
    const docsInput = container.querySelector('input[type="file"]');
    if (!docsInput) throw new Error("Documents input missing");
    fireEvent.change(docsInput, { target: { files: [new File(["document"], "Акт.pdf")] } });
    expect(screen.getByRole("button", { name: "Запустить проверку" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Убрать Акт.pdf" }));
    expect(screen.getByRole("button", { name: "Запустить проверку" })).toBeDisabled();
  });

  it("still launches when the example contains a damaged file", () => {
    setup(true);
    fireEvent.click(screen.getByRole("button", { name: "Пример с повреждённым файлом" }));
    expect(screen.getByRole("button", { name: "Запустить проверку" })).toBeEnabled();
    launchAndCheck();
  });

  it("adds a report row only to g without changing other check metadata", () => {
    expect(checks.find((check) => check.id === "g")).toMatchObject({
      reportRow: "Этап 3, 2026 г.",
      contract: "СИН-2026/15",
      period: "01.01.2026–31.05.2026",
    });
    for (const id of ["a", "b", "c"]) {
      expect(checks.find((check) => check.id === id)?.reportRow).toBeUndefined();
    }
  });
});
