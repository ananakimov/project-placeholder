import type { ReactNode } from "react";
import { AcceptCheck } from "@/components/check/AcceptCheck";
import { countByStatus } from "@/pages/Checks";
import type { Check } from "@/data/mock";
import { isKfz } from "@/data/demo-recheck";
import { cn } from "@/lib/utils";
import { formatMeasure, rowSummary } from "@/lib/check-explanation";

const colors = {
  Достоверен: "mint",
  Недостоверен: "peach",
  "Подтвердить полностью нельзя": "lavender",
} satisfies Record<Check["conclusion"], string>;

const plurals = new Intl.PluralRules("ru");
const list = new Intl.ListFormat("ru");

function ConclusionSummary({ check, unverified }: { check: Check; unverified: number }) {
  if (check.docs.some((doc) => isKfz(doc) && doc.demoUpload)) {
    return <p className="mt-2 text-sm leading-relaxed">Для сверки нового КФЗ требуется серверное распознавание.</p>;
  }
  const discrepancies = check.rows.filter((row) => !row.service && !row.nested && row.status === "discrepancy");
  const unchecked = check.rows.filter((row) => !row.service && !row.nested && row.status === "unverified");
  const total = check.rows.find((row) => row.service && row.ruleId === "R-COV-01");
  const discrepancyCount = discrepancies.length;
  const discrepancyForm = plurals.select(discrepancyCount);
  const unverifiedForm = plurals.select(unverified);
  const unreadUploads = check.docs.some((doc) => doc.demoUpload);
  const incomplete = unverified > 0
    ? `Не удалось проверить ${unverified} ${unverifiedForm === "one" ? "показатель" : unverifiedForm === "few" ? "показателя" : "показателей"}: ${list.format(unchecked.map((row) => row.unit ? row.name.replace(/ \([^)]*\)$/, "") : row.name))}.`
    : null;
  const limitations = unreadUploads
    ? "Данные из добавленных файлов недоступны для сверки."
    : check.conclusion === "Подтвердить полностью нельзя" && !incomplete
      ? "Доступных подтверждений недостаточно для вывода по отчёту."
      : null;

  return <div className="mt-2 max-w-[930px] space-y-1 text-sm leading-relaxed tabular-nums">
    {!!discrepancyCount && <>
      <p>{discrepancyForm === "one" ? "Обнаружено" : "Обнаружены"} {discrepancyCount}{" "}
        {discrepancyForm === "one" ? "расхождение" : discrepancyForm === "few" ? "расхождения" : "расхождений"}.</p>
      <ul className="list-disc space-y-1 pl-5">{discrepancies.map((row) => <li key={row.id}>{rowSummary(row)}</li>)}</ul>
    </>}
    {incomplete && <p>{incomplete}</p>}
    {limitations && <p>{limitations}</p>}
    {!discrepancyCount && !incomplete && !limitations && check.conclusion === "Достоверен" && <p>Все показатели подтверждены документами.</p>}
    {total?.status === "unverified" && <p>
      Итого в КФЗ: <strong className="font-medium">{formatMeasure(total.reported, total.unit)}</strong>. {total.partialNote || total.reason}
    </p>}
  </div>;
}

export function CheckConclusion({ check, children, version }: { check: Check; children?: ReactNode; version?: number | undefined }) {
  const counts = countByStatus(check);
  const groups = [
    { label: "Подтверждено", count: counts.verified, theme: "verified" },
    { label: "Расхождения", count: counts.discrepancy, theme: "discrepancy" },
    { label: "Не проверено", count: counts.unverified, theme: "unverified" },
  ];

  return (
    <div className="conclusion-page min-w-0 space-y-4">
      <section aria-label="Заключение по проверке" data-print-card>
        <div className="mb-1 text-[13px] text-muted-foreground">Вывод по проверке</div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <h2 className={cn("rounded-md px-2 py-0.5 text-xl font-medium", colors[check.conclusion])}>
            {check.conclusion}
          </h2>
          <ul aria-label="Счётчики показателей" className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] tabular-nums">
            {groups.map(({ label, count, theme }) => (
              <li key={theme} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`size-2 shrink-0 rounded-full coverage-${theme}`} />
                <span>{label} — <strong className="font-semibold">{count}</strong></span>
              </li>
            ))}
          </ul>
        </div>
        <ConclusionSummary check={check} unverified={counts.unverified} />
      </section>
      {children}
      {check.rows.length > 0 && <AcceptCheck check={check} version={version} />}
    </div>
  );
}
