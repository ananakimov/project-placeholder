import { Link } from "@tanstack/react-router";
import type { Check } from "@/data/mock";
import { ExcludedDocs } from "./ExcludedDocs";

export function AdditionalChecks({ check, onIndicator }: { check: Check; onIndicator: (id: string) => void }) {
  const unverified = check.rows.filter((row) => row.status === "unverified");
  const flaggedDocs = check.docs.filter((doc) => doc.state !== "прочитан" &&
    !check.excluded.some((item) => item.docId === doc.id));
  const docStatus = {
    "дубль": "Дубликат документа",
    "вне периода": "Документ вне периода",
    "другой договор": "Документ другого договора",
    "не прочитан": "Файл не прочитан",
  } as const;
  return (
    <section aria-labelledby="additional-checks" className="min-w-0 space-y-3">
      <h2 id="additional-checks" className="text-lg font-medium">Дополнительные проверки</h2>
      {check.excluded.length > 0 && <ExcludedDocs check={check} />}
      {unverified.length > 0 && (
        <section className="rounded-lg border bg-card p-4 shadow-card">
          <h3 className="mb-2 text-sm font-medium">Недостаточно подтверждений</h3>
          <ul className="divide-y text-sm">
            {unverified.map((row) => (
              <li key={row.id} className="space-y-1 py-2">
                <button type="button" className="text-left font-medium text-primary underline underline-offset-2"
                  aria-label={`Перейти к строке: ${row.name}`} onClick={() => onIndicator(row.id)}>{row.name}</button>
                {row.reason && <p className="text-muted-foreground">{row.reason}</p>}
                {row.partialNote && <p className="text-muted-foreground">{row.partialNote}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {flaggedDocs.length > 0 && (
        <section className="rounded-lg border bg-card p-4 shadow-card">
          <h3 className="mb-2 text-sm font-medium">Состояние документов</h3>
          <ul className="space-y-2 text-sm">
            {flaggedDocs.map((doc) => doc.state !== "прочитан" && (
              <li key={doc.id}><strong>{docStatus[doc.state]}</strong> · {doc.title}</li>
            ))}
          </ul>
          <Link to="/checks/$id/documents" params={{ id: check.id }}
            className="mt-2 inline-block text-sm text-primary underline">Открыть документы проверки</Link>
        </section>
      )}
      {!unverified.length && !flaggedDocs.length && !check.excluded.length &&
        <p className="text-sm text-muted-foreground">Дополнительных замечаний нет.</p>}
    </section>
  );
}
