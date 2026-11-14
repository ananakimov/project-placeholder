import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExportDialog } from "@/components/check/ExportDialog";
import { checks } from "@/data/mock";
import { checkToJson, downloadBlob } from "@/lib/export";

const navigate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));
vi.mock("@/lib/export", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/export")>(), downloadBlob: vi.fn(),
}));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.clearAllMocks(); });
const check = checks.find((item) => item.id === "g")!;
function ExportHarness() {
  const [open, setOpen] = useState(true);
  return <ExportDialog check={check} open={open} onOpenChange={setOpen} />;
}
function setup() {
  render(<ExportHarness />);
  return screen.getByRole("dialog");
}

describe("Result export", () => {
  it("retains only PDF / JSON formats in the standalone export dialog", () => {
    const dialog = setup();
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
