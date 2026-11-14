import type { ReactNode } from "react";
import { AcceptCheck } from "@/components/check/AcceptCheck";
import { formatMoney } from "@/components/money-format";
import { countByStatus } from "@/pages/Checks";
import type { Check } from "@/data/mock";
import { isKfz } from "@/data/demo-recheck";
import { cn } from "@/lib/utils";

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
  const findings = discrepancies.map((row) => {
    const number = row.name.match(/\(Статья калькуляции (\d+)\)$/)?.[1];
    const label = number ? `по статье ${number}` : `по показателю «${row.name}»`;
    if (row.delta === null || Number(row.delta) === 0) return label;
    const amount = formatMoney(row.delta).replace(/,00$/, "");
    return `${label} (${row.delta.startsWith("-") ? "" : "+"}${amount} ${row.unit ?? "₽"})`;
  });

  const discrepancyCount = discrepancies.length;
  const discrepancyForm = plurals.select(discrepancyCount);
  const unverifiedForm = plurals.select(unverified);
  const unreadUploads = check.docs.some((doc) => doc.demoUpload);
  const uploadNote = "данные из добавленных файлов недоступны для сверки";
  const incomplete = unverified > 0
    ? `${discrepancyCount > 0 ? "Ещё" : "Не удалось проверить"} ${unverified} ${unverifiedForm === "one" ? "показатель" : unverifiedForm === "few" ? "показателя" : "показателей"}${discrepancyCount > 0 ? " не удалось проверить" : ""}${unreadUploads ? `, а ${uploadNote}` : ""}.`
    : null;
  const limitations = !incomplete && unreadUploads
    ? "Данные из добавленных файлов недоступны для сверки."
    : check.conclusion === "Подтвердить полностью нельзя" && !incomplete
      ? "Доступных подтверждений недостаточно для вывода по отчёту."
      : null;

  return (
    <p className="mt-2 max-w-[820px] text-sm leading-relaxed tabular-nums">
      {discrepancyCount > 0 && <>
        {discrepancyForm === "one" ? "Обнаружено" : "Обнаружены"} {discrepancyCount}{" "}
        {discrepancyForm === "one" ? "расхождение" : discrepancyForm === "few" ? "расхождения" : "расхождений"}:{" "}
        <strong className="font-medium">{list.format(findings)}</strong>.{" "}
      </>}
      {incomplete && <>{incomplete}{" "}</>}
      {limitations ?? (!discrepancyCount && !incomplete && check.conclusion === "Достоверен" && "Все показатели подтверждены документами.")}
    </p>
  );
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
      <AcceptCheck check={check} version={version} />
    </div>
  );
}
