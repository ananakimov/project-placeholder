import { FileWarning } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Check, ExcludedDoc } from "@/data/mock";
import { ExcludedDocs } from "./ExcludedDocs";

export function AdditionalChecks({ check, onIndicator, onExcluded, onDiagnostic, version }: {
  check: Check;
  version?: number | undefined;
  onIndicator: (id: string) => void;
  onDiagnostic: (docId: string, trigger: HTMLElement) => void;
  onExcluded: (item: ExcludedDoc, trigger: HTMLElement) => void;
}) {
  const unverified = check.rows.filter((row) => !row.service && !row.nested && row.status === "unverified");
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
      {check.excluded.length > 0 && <ExcludedDocs check={check} onSource={onExcluded} />}
      {unverified.length > 0 && (
        <section className="rounded-lg border bg-card p-5 shadow-card">
          <h3 className="mb-3 text-[15px] font-medium">Недостаточно подтверждений</h3>
          <ul className="space-y-3 text-[13px]">
            {unverified.map((row) => (
              <li key={row.id} className="flex items-start gap-2">
                <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-unverified" aria-hidden="true" />
                <div>
                  <button type="button" className="text-left font-medium hover:underline"
                    aria-label={`Перейти к строке: ${row.name}`} onClick={() => onIndicator(row.id)}>{row.name}</button>
                  <p className="text-muted-foreground">{row.reason || "Недостаточно данных для проверки"}</p>
                  {row.partialNote && <p className="text-muted-foreground">{row.partialNote}</p>}
                </div>
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
              <li key={doc.id}>
                <strong>{doc.demoUpload ? "Файл не распознан" : docStatus[doc.state]}</strong> · {check.rows.some((row) => row.sources.some((source) => source.docId === doc.id))
                  ? <button type="button" className="text-left text-primary underline"
                      onClick={(event) => onDiagnostic(doc.id, event.currentTarget)}>{doc.title}</button>
                  : doc.title}
              </li>
            ))}
          </ul>
          <Link to="/checks/$id/documents" params={{ id: check.id }} search={version === undefined ? {} : { version }}
            className="mt-2 inline-block text-sm text-primary underline">Открыть документы проверки</Link>
        </section>
      )}
      {!unverified.length && !flaggedDocs.length && !check.excluded.length &&
        <p className="text-sm text-muted-foreground">Дополнительных замечаний нет.</p>}
    </section>
  );
}
