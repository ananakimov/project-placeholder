import type { Bbox, Doc } from "@/data/mock";
import manifest from "./sample-document-pages.json";

// Vite emits hashed URLs with the configured base (including GitHub Pages).
// Only page images are bundled; fixture reference answers stay outside the app.
const images = import.meta.glob<string>("../assets/sample-documents/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

export function withSamplePreview(document: Doc, prefix: string): Doc {
  const entry = manifest[prefix as keyof typeof manifest];
  if (!entry || document.fileName !== entry.fileName) {
    throw new Error(`Нет страниц исходного файла ${document.fileName}`);
  }
  return {
    ...document,
    pages: entry.pages.length,
    previewPages: entry.pages.map((page) => {
      const src = images[`../assets/sample-documents/${page.file}`];
      if (!src) throw new Error(`Не найдена страница ${page.file}`);
      return { src, width: page.width, height: page.height };
    }),
    // Keep the recorded values, but bind them to the original page coordinates.
    // KFZ has no issue date: do not put a fictitious date annotation on its page.
    fields: document.fields.flatMap((field) => {
      const annotation = entry.fields.find((item) => item.label === field.label);
      return annotation ? [{ ...field, page: annotation.page, bbox: annotation.bbox as Bbox }] : [];
    }),
  };
}
