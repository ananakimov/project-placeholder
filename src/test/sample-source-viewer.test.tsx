import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { SourceViewer } from "@/components/check/SourceViewer";
import { SidePanel } from "@/components/check/SidePanel";
import { fieldSource } from "@/components/check/document-annotations";
import { CheckDetail } from "@/pages/CheckDetail";
import { ChecksProvider } from "@/context/ChecksContext";
import { checks, type Bbox } from "@/data/mock";
import { SAMPLE_FILES } from "@/data/sample-files";
import manifest from "@/data/sample-document-pages.json";

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn(), Link: ({ children }: { children: import("react").ReactNode }) => <a>{children}</a> }));
beforeAll(() => {
  HTMLElement.prototype.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const g = checks.find((check) => check.id === "g")!;
const production = g.rows.find((row) => row.id === "g-3")!;
const first = g.docs.find((doc) => doc.id === production.sources[0]!.docId)!;

function productionViewer() {
  return render(
    <SourceViewer row={production} source={production.sources[0]!} doc={first} />,
  );
}
function Panel() {
  const [index, setIndex] = useState(0);
  return (
    <SidePanel
      check={g}
      row={production}
      sourceIndex={index}
      onSourceChange={setIndex}
      sources={production.sources}
    />
  );
}

describe("Original example document pages", () => {
  it("bundles all 23 input files' pages with matching original hashes and real WebP dimensions", () => {
    expect(
      Object.values(manifest)
        .map((entry) => entry.fileName)
        .sort(),
    ).toEqual(SAMPLE_FILES.map((file) => file.name).sort());
    const pages = Object.values(manifest).flatMap((entry) => entry.pages.map((page) => page.file));
    expect(readdirSync("src/assets/sample-documents").sort()).toEqual(pages.sort());
    for (const entry of Object.values(manifest)) {
      const original = readFileSync(`fixtures/synthetic-2027/input/${entry.fileName}`);
      expect(createHash("sha256").update(original).digest("hex")).toBe(entry.sha256);
      expect(entry.sha256).toBe(SAMPLE_FILES.find((file) => file.name === entry.fileName)!.sha256);
      for (const page of entry.pages) {
        const image = readFileSync(`src/assets/sample-documents/${page.file}`);
        expect(image.subarray(0, 4).toString()).toBe("RIFF");
        expect(image.subarray(8, 12).toString()).toBe("WEBP");
        // Lossless VP8L header stores the actual raster dimensions, independently
        // of the manifest and the browser's img width/height attributes.
        expect(image.subarray(12, 16).toString()).toBe("VP8L");
        const dimensions = image.readUInt32LE(21);
        expect((dimensions & 0x3fff) + 1).toBe(page.width);
        expect(((dimensions >>> 14) & 0x3fff) + 1).toBe(page.height);
      }
      for (const field of entry.fields) {
        const [x, y, w, h] = field.bbox as Bbox;
        expect(w).toBeGreaterThan(0);
        expect(h).toBeGreaterThan(0);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x + w).toBeLessThanOrEqual(1);
        expect(y + h).toBeLessThanOrEqual(1);
        expect(entry.pages[field.page - 1]).toBeDefined();
      }
    }
  });

  it("renders the real page for every PDF, spreadsheet, Word document and PNG, including excluded files", () => {
    for (const doc of g.docs) {
      const amount = doc.fields.find((field) => field.label === "Сумма")!;
      const source = fieldSource(doc, amount);
      const { container, unmount } = render(
        <SourceViewer row={production} source={source} doc={doc} />,
      );
      const img = screen.getByRole("img", { name: `${doc.fileName}, страница 1` });
      expect(img).toHaveAttribute("src", doc.previewPages![0]!.src);
      expect(container.querySelector(".paper-title, .paper-amount, .paper-eyebrow")).toBeNull();
      expect(screen.queryByLabelText(/Подсвеченный фрагмент:/)).not.toBeInTheDocument();
      fireEvent.load(img);
      const mark = screen.getByLabelText(/Подсвеченный фрагмент:/);
      expect(mark).toHaveAttribute("aria-label", `Подсвеченный фрагмент: ${source.text}`);
      expect(mark).toHaveAttribute("data-kind", "money");
      expect(mark).toHaveStyle({
        left: `${source.bbox[0] * 100}%`,
        top: `${source.bbox[1] * 100}%`,
      });
      expect(screen.getByLabelText(`Страница 1 документа ${doc.title}`).style.aspectRatio).toBe(
        `${doc.previewPages![0]!.width} / ${doc.previewPages![0]!.height}`,
      );
      unmount();
    }
  });

  it("switches the actual page, amount and highlight through document arrows and tabs", () => {
    render(<Panel />);
    expect(screen.getByRole("button", { name: "Предыдущий документ" })).toBeDisabled();
    for (let i = 0; i < production.sources.length; i++) {
      const source = production.sources[i]!;
      const doc = g.docs.find((item) => item.id === source.docId)!;
      const img = screen.getByRole("img", { name: `${doc.fileName}, страница 1` });
      expect(img).toHaveAttribute("src", doc.previewPages![0]!.src);
      fireEvent.load(img);
      expect(screen.getByLabelText(/Подсвеченный фрагмент:/)).toHaveAttribute(
        "aria-label",
        `Подсвеченный фрагмент: ${source.text}`,
      );
      expect(screen.getByLabelText("Реквизиты документа")).toHaveTextContent(doc.number);
      if (i < production.sources.length - 1)
        fireEvent.click(screen.getByRole("button", { name: "Следующий документ" }));
    }
    expect(screen.getByRole("button", { name: "Следующий документ" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Предыдущий документ" }));
    expect(screen.getByRole("img")).toHaveAccessibleName(/06_Служебная_записка_КЛ-84.docx/);
    fireEvent.keyDown(screen.getByRole("tab", { name: `${first.title}, источник 1` }), {
      key: "Enter",
    });
    expect(screen.getByRole("img")).toHaveAttribute("src", first.previewPages![0]!.src);
  });

  it("centers after the image loads, scales the whole page and preserves annotation controls", () => {
    productionViewer();
    expect(HTMLElement.prototype.scrollTo).not.toHaveBeenCalled();
    fireEvent.load(screen.getByRole("img"));
    expect(HTMLElement.prototype.scrollTo).toHaveBeenCalled();
    const page = screen.getByLabelText(`Страница 1 документа ${first.title}`);
    fireEvent.click(screen.getByRole("button", { name: "Увеличить масштаб" }));
    expect(page).toHaveStyle({ width: "125%" });
    expect(screen.getByRole("img")).toHaveAttribute("src", first.previewPages![0]!.src);
    fireEvent.click(screen.getByRole("checkbox", { name: "Подсветка: Суммы" }));
    expect(screen.queryByLabelText(/Подсвеченный фрагмент:/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Распознанное поле: Дата:/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "К сумме" }));
    expect(screen.getByLabelText(/Подсвеченный фрагмент:/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Скрыть подсветку" }));
    expect(screen.queryByLabelText(/Распознанное поле:/)).not.toBeInTheDocument();
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("shows a retry state instead of a fabricated page or floating highlights when loading fails", () => {
    const { container } = productionViewer();
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить страницу");
    expect(screen.queryByLabelText(/Подсвеченный фрагмент:/)).not.toBeInTheDocument();
    expect(container.querySelector(".paper-amount")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Повторить загрузку" }));
    fireEvent.load(screen.getByRole("img"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Подсвеченный фрагмент:/)).toBeInTheDocument();
  });

  it("keeps the loaded original, active fragment, zoom and annotations while the source is hidden", () => {
    render(<ChecksProvider><CheckDetail check={g} /></ChecksProvider>);
    fireEvent.click(screen.getByRole("button", { name: production.name }));
    const details = screen.getByRole("region", { name: `Подробности: ${production.name}` });
    fireEvent.click(within(details).getByRole("button", { name: `Открыть документ: ${first.title}` }));
    const panel = screen.getByRole("region", { name: "Источник документа" });
    const viewer = within(panel);
    fireEvent.click(viewer.getByRole("button", { name: "Следующий документ" }));
    const secondSource = production.sources[1]!;
    const second = g.docs.find((doc) => doc.id === secondSource.docId)!;
    const image = viewer.getByRole("img");
    fireEvent.load(image);
    fireEvent.click(viewer.getByRole("button", { name: "Увеличить масштаб" }));
    fireEvent.click(viewer.getByRole("checkbox", { name: "Подсветка: Даты" }));
    const mark = viewer.getByLabelText(/Подсвеченный фрагмент:/);
    expect(mark).toHaveAttribute("aria-label", `Подсвеченный фрагмент: ${secondSource.text}`);

    fireEvent.click(screen.getByRole("button", { name: "Скрыть источник документа" }));
    expect(panel).toHaveAttribute("inert");
    expect(panel).toHaveAttribute("aria-hidden", "true");
    expect(details).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Показать источник документа" }));
    expect(viewer.getByRole("img")).toBe(image);
    expect(viewer.getByRole("img")).toHaveAttribute("src", second.previewPages![0]!.src);
    expect(viewer.getByLabelText(/Подсвеченный фрагмент:/)).toBe(mark);
    expect(viewer.getByLabelText("Масштаб документа")).toHaveTextContent("125%");
    expect(viewer.getByRole("checkbox", { name: "Подсветка: Даты" })).not.toBeChecked();

    fireEvent.click(viewer.getByRole("button", { name: "Следующий документ" }));
    fireEvent.load(viewer.getByRole("img"));
    expect(viewer.getByRole("img")).toHaveAccessibleName(/06_Служебная_записка_КЛ-84.docx/);
    expect(viewer.getByLabelText(/Подсвеченный фрагмент:/)).toHaveAttribute("aria-label", `Подсвеченный фрагмент: ${production.sources[2]!.text}`);
    fireEvent.click(viewer.getByRole("button", { name: "Предыдущий документ" }));
    fireEvent.load(viewer.getByRole("img"));
    expect(viewer.getByRole("img")).toHaveAttribute("src", second.previewPages![0]!.src);
  });

  it("opens an excluded file at its recorded date field instead of the document amount", () => {
    render(<ChecksProvider><CheckDetail check={g} /></ChecksProvider>);
    const excluded = g.excluded.find((item) => item.reason === "вне периода")!;
    const indicator = g.rows.find((row) => row.id === "g-4")!;
    fireEvent.click(screen.getByRole("button", { name: indicator.name }));
    const details = screen.getByRole("region", { name: `Подробности: ${indicator.name}` });
    fireEvent.click(within(details).getByRole("button", { name: excluded.file }));
    const panel = within(screen.getByRole("region", { name: "Источник документа" }));
    fireEvent.load(panel.getByRole("img"));
    expect(panel.getByLabelText(/Подсвеченный фрагмент: Дата/)).toBeInTheDocument();
    expect(panel.getByRole("button", { name: "К фрагменту" })).toBeInTheDocument();
    expect(panel.queryByRole("button", { name: "К сумме" })).not.toBeInTheDocument();
  });
});
