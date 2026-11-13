import type { Doc, SourceRef } from "@/data/mock";

export type DocumentField = Doc["fields"][number];
export type AnnotationKind = "date" | "money" | "number" | "contract";

export const annotationTypes: { kind: AnnotationKind; label: string }[] = [
  { kind: "date", label: "Даты" },
  { kind: "money", label: "Суммы" },
  { kind: "number", label: "Номера" },
  { kind: "contract", label: "Договоры" },
];

export function annotationKind(label: string): AnnotationKind {
  if (label === "Дата") return "date";
  if (label === "Сумма") return "money";
  if (label === "Договор") return "contract";
  return "number";
}

export function isSourceField(field: DocumentField, source: SourceRef): boolean {
  return field.page === source.page && field.bbox.every((value, i) => value === source.bbox[i]);
}

export function fieldSource(doc: Doc, field: DocumentField): SourceRef {
  return {
    docId: doc.id,
    page: field.page,
    bbox: field.bbox,
    text: `${field.label}: ${field.value}`,
    amount: field.label === "Сумма" ? field.value.replace(/\s/g, "").replace(",", ".") : null,
    matchType: "точное",
  };
}
