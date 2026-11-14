import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AcceptCheck } from "@/components/check/AcceptCheck";
import { VersionControls } from "@/components/check/VersionControls";
import { ChecksProvider, useChecks } from "@/context/ChecksContext";
import { recheckDemo } from "@/data/demo-recheck";
import { getCheck } from "@/data/mock";
import { Checks } from "@/pages/Checks";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, params, search }: {
    children: ReactNode; to: string; params?: { id: string }; search?: { version?: number };
  }) => <a href={to.replace("$id", params?.id ?? "") + (search?.version ? `?version=${search.version}` : "")}>{children}</a>,
}));

const base = getCheck("g")!;
const affected = base.rows.find((row) => row.id === "g-3")!;
const source = base.docs.find((doc) => doc.id === affected.sources[0]!.docId)!;

function Workflow({ archive = false }: { archive?: boolean }) {
  const { checkHistory } = useChecks();
  const current = checkHistory.current(base);
  return <>
    <VersionControls check={base} selected={current} />
    <AcceptCheck check={current.result} version={current.number} />
    <output data-testid="current">{JSON.stringify(current)}</output>
    <Checks archive={archive} />
  </>;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Versioned demo package", () => {
  it("drops findings that rely on an excluded duplicate and keeps arithmetic on the unchanged report", () => {
    const check = getCheck("b")!;
    const revised = recheckDemo(check, check.docs.filter((doc) => doc.id !== "b-sp27-copy"));
    expect(revised.rows.find((row) => row.id === "b-4"))
      .toMatchObject({ status: "unverified", category: null, expected: null, delta: null });
    expect(revised.rows.find((row) => row.ruleId === "R-ARI-01"))
      .toEqual(check.rows.find((row) => row.ruleId === "R-ARI-01"));
    expect(revised.rows.find((row) => row.id === "b-13")).toMatchObject({ status: "unverified" });
  });

  it("shows incomplete coverage of new files even when the previously confirmed indicators remain confirmed", () => {
    const check = getCheck("a")!;
    const result = recheckDemo(check, [...check.docs, {
      id: "new-file", demoUpload: true, title: "Акт.pdf", type: "PDF", number: "", date: "", contract: "",
      pages: 0, state: "не прочитан", fields: [],
    }]);
    expect(result.rows.filter((row) => !row.service && !row.nested).every((row) => row.status === "verified")).toBe(true);
    render(<ChecksProvider><Checks checks={[result]} /></ChecksProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Неполные данные 1" }));
    expect(screen.getByRole("cell", { name: "Неполные данные" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Без расхождений 0" }));
    expect(screen.getByText("Проверки не найдены")).toBeInTheDocument();
  });
  it("keeps the accepted snapshot and opens a new unaccepted version after processing", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-14T12:00:00Z"));
    render(<ChecksProvider><Workflow /></ChecksProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Принять проверку" }));
    fireEvent.click(screen.getByRole("button", { name: "Изменить комплект" }));
    const editor = screen.getByRole("dialog", { name: "Изменить комплект" });
    fireEvent.click(within(editor).getByRole("button", { name: `Заменить ${source.title}` }));
    fireEvent.change(within(editor).getByLabelText("Файлы комплекта"), {
      target: { files: [new File(["fixture"], "Заменяющий акт.pdf")] },
    });
    fireEvent.click(within(editor).getByRole("button", { name: "Добавить документ" }));
    fireEvent.change(within(editor).getByLabelText("Файлы комплекта"), {
      target: { files: [new File(["synthetic"], "Дополнение.xlsx")] },
    });
    const another = base.docs.find((doc) => doc.id === affected.sources[1]!.docId)!;
    fireEvent.click(within(editor).getByRole("button", { name: `Исключить ${another.title}` }));
    fireEvent.click(within(editor).getByRole("button", { name: "Запустить повторную проверку" }));

    expect(screen.getByText(/Версия 2 в обработке/)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Версия" })).toHaveValue("1");
    const pending = screen.getByRole("row", { name: /КФЗ №3\/7 · Версия 2/ });
    expect(within(pending).getByText("Обрабатывается")).toBeInTheDocument();
    expect(within(pending).getByRole("link", { name: "Предыдущая версия" })).toHaveAttribute("href", "/checks/g?version=1");
    expect(screen.queryByRole("link", { name: "КФЗ №3/7" })).not.toBeInTheDocument();
    const previous = JSON.parse(screen.getByTestId("current").textContent!);
    expect(previous.result).toEqual(base);
    expect(previous.acceptedAt).not.toBeNull();
    act(() => { vi.advanceTimersByTime(4_250); });

    expect(screen.getByRole("combobox", { name: "Версия" })).toHaveValue("2");
    expect(screen.getByRole("button", { name: "Принять проверку" })).toBeEnabled();
    const current = JSON.parse(screen.getByTestId("current").textContent!);
    expect(current.acceptedAt).toBeNull();
    expect(current.result.rows.find((row: { id: string }) => row.id === affected.id))
      .toMatchObject({ status: "unverified", expected: null, delta: null });
    expect(current.result.docs.map((doc: { title: string }) => doc.title)).toEqual(expect.arrayContaining(
      ["Заменяющий акт.pdf", "Дополнение.xlsx"],
    ));
    expect(current.result.docs.map((doc: { id: string }) => doc.id)).not.toContain(source.id);
    fireEvent.click(screen.getByRole("button", { name: "Приняты 1" }));
    expect(screen.getByRole("link", { name: "КФЗ №3/7" })).toHaveAttribute("href", "/checks/g?version=1");

    cleanup();
    render(<ChecksProvider><Workflow archive /></ChecksProvider>);
    expect(screen.getByRole("link", { name: "КФЗ №3/7" })).toHaveAttribute("href", "/checks/g?version=1");
    expect(screen.getByRole("combobox", { name: "Версия" })).toHaveValue("2");
    expect(getCheck("g")).toEqual(previous.result);
  });
});
