import type { Doc } from "@/data/mock";

export function DocumentFields({ doc }: { doc: Doc | null }) {
  if (!doc) return null;
  const values = [
    ["Номер", doc.number],
    ["Дата", doc.date],
    ["Договор", doc.contract],
  ].map(([label, value]) => doc.fields.find((field) => field.label === label)?.value ?? (value || "—"));
  return (
    <p
      aria-label="Реквизиты документа"
      title={values.join(" · ")}
      className="document-metadata border-b px-4 py-2 text-[12px] text-muted-foreground tabular-nums"
    >
      {values.join(" · ")}
    </p>
  );
}
