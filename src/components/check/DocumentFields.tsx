import type { Doc } from "@/data/mock";

export function DocumentFields({ doc }: { doc: Doc | null }) {
  if (!doc) return null;
  const values = ["Номер", "Дата", "Договор"].map(
    (label) => doc.fields.find((field) => field.label === label)?.value ?? "—",
  );
  return (
    <p aria-label="Реквизиты документа" className="border-b px-4 py-2 text-[12px] text-muted-foreground tabular-nums">
      {values.join(" · ")}
    </p>
  );
}
