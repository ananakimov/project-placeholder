import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckHeader } from "@/components/check/CheckHeader";
import { CheckConclusion } from "@/pages/CheckConclusion";
import { ChecksProvider } from "@/context/ChecksContext";
import { checks } from "@/data/mock";
import { checkToJson, downloadBlob } from "@/lib/export";

const navigate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));
vi.mock("@/lib/export", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/export")>(), downloadBlob: vi.fn(),
}));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.clearAllMocks(); });
const check = checks.find((item) => item.id === "g")!;
function setup() {
  render(<ChecksProvider><CheckHeader check={check} /><CheckConclusion check={check} /></ChecksProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Скачать результат" }));
  return screen.getByRole("dialog");
}

describe("Result export", () => {
  it("offers one download action in the conclusion and only PDF / JSON formats", () => {
    render(<ChecksProvider><CheckHeader check={check} /><CheckConclusion check={check} /></ChecksProvider>);
    expect(screen.queryByRole("button", { name: "Экспорт" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Скачать результат" })).toHaveLength(1);
    fireEvent.click(within(screen.getByRole("region", { name: "Заключение по проверке" })).getByRole("button", { name: "Скачать результат" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: /Заключение \(PDF\)/ })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Результат \(JSON\)/ })).toBeInTheDocument();
    expect(within(dialog).queryByText(/CSV/)).not.toBeInTheDocument();
  });
  it("downloads the complete current result as JSON and closes the dialog", async () => {
    fireEvent.click(within(setup()).getByRole("button", { name: /Результат \(JSON\)/ }));
    expect(downloadBlob).toHaveBeenCalledTimes(1);
    const [blob, filename] = vi.mocked(downloadBlob).mock.calls[0]!;
    expect(filename).toBe("docheck-g.json");
    expect(blob.type).toBe("application/json");
    const contents = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsText(blob);
    });
    expect(contents).toBe(checkToJson(check));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("opens the combined result before printing the PDF", async () => {
    vi.useFakeTimers(); const print = vi.spyOn(window, "print").mockImplementation(() => {});
    fireEvent.click(within(setup()).getByRole("button", { name: /Заключение \(PDF\)/ }));
    await act(async () => { await Promise.resolve(); });
    expect(navigate).toHaveBeenCalledExactlyOnceWith({ to: "/checks/$id", params: { id: "g" } });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(print).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(400));
    expect(print).toHaveBeenCalledTimes(1);
  });
});
