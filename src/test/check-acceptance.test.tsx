import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChecksProvider } from "@/context/ChecksContext";
import { getCheck } from "@/data/mock";
import { CheckConclusion } from "@/pages/CheckConclusion";
import { Checks } from "@/pages/Checks";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, params }: { children: ReactNode; to: string; params?: { id: string } }) =>
    <a href={to.replace("$id", params?.id ?? "")}>{children}</a>,
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("Demo acceptance and archive", () => {
  it("archives a discrepant result only after explicit acceptance and preserves it after reload", () => {
    const check = getCheck("g")!;
    const original = structuredClone(check);
    render(<ChecksProvider><CheckConclusion check={check} /><Checks /></ChecksProvider>);
    expect(screen.getByRole("link", { name: "КФЗ №3/7" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Принять проверку" }));
    expect(screen.getByRole("status")).toHaveTextContent("Принят");
    expect(screen.queryByText(/завершении работы, без электронной подписи/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Недостоверен" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "КФЗ №3/7" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Приняты 1" }));
    expect(screen.getByRole("link", { name: "КФЗ №3/7" })).toBeInTheDocument();
    expect(check).toEqual(original);
    cleanup();
    render(<ChecksProvider><Checks archive /></ChecksProvider>);
    expect(screen.getByRole("cell", { name: "Принят" }).firstElementChild).toHaveClass("accepted");
    expect(within(screen.getByRole("table")).getAllByRole("link").map((link) => link.textContent))
      .toEqual(["КФЗ №3/7"]);
  });
});
