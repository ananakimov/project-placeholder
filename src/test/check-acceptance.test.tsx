import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChecksProvider } from "@/context/ChecksContext";
import { getCheck } from "@/data/mock";
import { CheckConclusion } from "@/pages/CheckConclusion";
import { Checks } from "@/pages/Checks";
import { downloadBlob } from "@/lib/export";
import { strFromU8, unzipSync } from "fflate";

vi.mock("@/lib/export", () => ({ downloadBlob: vi.fn() }));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, params }: { children: ReactNode; to: string; params?: { id: string } }) =>
    <a href={to.replace("$id", params?.id ?? "")}>{children}</a>,
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

describe("Demo acceptance and archive", () => {
  it("downloads the conclusion for the accepted version and lets the accountant download it again from the archive", async () => {
    const check = getCheck("g")!;
    const original = structuredClone(check);
    render(<ChecksProvider><CheckConclusion check={check} /><Checks /></ChecksProvider>);
    expect(screen.getByRole("link", { name: "КФЗ №3/7" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Принять и скачать заключение" }));
    expect(screen.getByRole("status")).toHaveTextContent("Принят");
    expect(downloadBlob).toHaveBeenCalledTimes(1);
    const [blob, name] = vi.mocked(downloadBlob).mock.calls[0]!;
    expect(name).toBe("doccheck-g-v1.xlsx");
    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
    const files = unzipSync(new Uint8Array(buffer));
    const summary = strFromU8(files["xl/worksheets/sheet1.xml"]!);
    expect(summary).toContain('Недостоверен');
    expect(summary).toContain('<c r="D9" s="3"><v>14800</v></c>');
    expect(summary).toContain('<c r="D10" s="3"><v>-25000</v></c>');
    expect(summary).toContain('<c r="C7" s="2"/>');
    expect(summary).toContain('Дополнительные проверки');
    expect(summary).toContain('Детализация показателя');
    expect(screen.queryByText(/завершении работы, без электронной подписи/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Недостоверен" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "КФЗ №3/7" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Приняты/ })).not.toBeInTheDocument();
    expect(check).toEqual(original);
    cleanup();
    render(<ChecksProvider><CheckConclusion check={check} /><Checks archive /></ChecksProvider>);
    expect(screen.getByRole("cell", { name: "Принят" }).firstElementChild).toHaveClass("accepted");
    expect(within(screen.getByRole("table")).getAllByRole("link").map((link) => link.textContent))
      .toEqual(["КФЗ №3/7"]);
    fireEvent.click(screen.getByRole("button", { name: "Скачать заключение" }));
    expect(downloadBlob).toHaveBeenCalledTimes(2);
  });
});
