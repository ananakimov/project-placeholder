import type { ReactNode } from "react";
import { AcceptCheck } from "@/components/check/AcceptCheck";
import { formatMoney } from "@/components/money-format";
import { Money } from "@/components/Money";
import { countByStatus } from "@/pages/Checks";
import type { Check } from "@/data/mock";
import { cn } from "@/lib/utils";

const colors = {
  Достоверен: "mint",
  Недостоверен: "peach",
  "Подтвердить полностью нельзя": "lavender",
} satisfies Record<Check["conclusion"], string>;

const plurals = new Intl.PluralRules("ru");
const percent = new Intl.NumberFormat("ru-RU", { style: "percent", maximumFractionDigits: 1 });
const list = new Intl.ListFormat("ru");

function ConclusionSummary({ check, unverified }: { check: Check; unverified: number }) {
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
  const { coverage } = check;
  const checked = counts.verified + counts.discrepancy;
  const total = checked + counts.unverified;
  const groups = [
    { label: "Подтверждено", count: counts.verified, sum: coverage.verifiedSum, pct: coverage.verifiedPct, theme: "verified" },
    { label: "Расхождения", count: counts.discrepancy, sum: coverage.discrepancySum, pct: coverage.discrepancyPct, theme: "discrepancy" },
    { label: "Не проверено", count: counts.unverified, sum: coverage.unverifiedSum, pct: coverage.unverifiedPct, theme: "unverified" },
  ];
  const hasMoneyCoverage = check.rows.some((row) => !row.service && !row.nested && !row.unit) &&
    /^\d+(?:\.\d{1,2})?$/.test(coverage.totalSum) && Number(coverage.totalSum) > 0 && groups.every(({ pct, sum }) =>
      /^\d+(?:\.\d+)?$/.test(pct) && Number(pct) <= 100 && /^-?\d+(?:\.\d{1,2})?$/.test(sum));

  return (
    <div className="conclusion-page min-w-0 space-y-4">
      <section aria-label="Заключение по проверке" data-print-card>
        <div className="mb-1 text-[13px] text-muted-foreground">Вывод по проверке</div>
        <h2 className={cn("inline-block rounded-md px-2 py-0.5 text-xl font-medium", colors[check.conclusion])}>
          {check.conclusion}
        </h2>
        <ConclusionSummary check={check} unverified={counts.unverified} />
      </section>
      <section aria-labelledby="check-coverage-heading" className="space-y-2 rounded-lg border bg-card px-4 py-3.5 shadow-card" data-print-card>
        <h2 id="check-coverage-heading" className="text-[15px] font-medium">Полнота проверки</h2>
        {total > 0 ? <>
          <p className="text-sm tabular-nums">Проверено: <strong className="font-semibold">{checked} из {total}</strong> показателей ({percent.format(checked / total)})</p>
          <div aria-hidden="true" className="flex h-2 overflow-hidden rounded-full bg-unverified-bg">
            {groups.map(({ theme, count }) => (
              <div key={theme} className={`coverage-${theme}`} style={{ width: `${count / total * 100}%` }} />
            ))}
          </div>
          <ul aria-label="Счётчики показателей" className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] tabular-nums">
            {groups.map(({ label, count, theme }) => (
              <li key={theme} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`size-2 shrink-0 rounded-sm coverage-${theme}`} />
                <span>{label} — <strong className="font-semibold">{count}</strong></span>
              </li>
            ))}
          </ul>
        </> : <p className="text-sm text-muted-foreground">Нет показателей для оценки полноты.</p>}
        <details className="text-[13px]">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Подробнее по суммам</summary>
          {hasMoneyCoverage ? (
            <table className="mt-2 w-full tabular-nums" aria-label="Суммы показателей по статусам">
              <thead>
                <tr className="text-muted-foreground">
                  <th scope="col" className="text-left font-normal">Статус</th>
                  <th scope="col" className="text-right font-normal">Сумма в КФЗ</th>
                  <th scope="col" className="pl-2 text-right font-normal">Доля суммы</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(({ label, sum, pct, theme }) => (
                  <tr key={theme}>
                    <th scope="row" className="py-0.5 text-left font-normal">{label}</th>
                    <td className="py-0.5 text-right"><Money value={sum} /> ₽</td>
                    <td className="py-0.5 pl-2 text-right text-muted-foreground">{pct.replace(".", ",")}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className="pt-1 text-left font-medium">Итого в КФЗ</th>
                  <td className="pt-1 text-right"><Money value={coverage.totalSum} /> ₽</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          ) : <p className="mt-2 text-muted-foreground">Недостаточно данных для расчёта покрытия по сумме.</p>}
        </details>
      </section>
      {children}
      <AcceptCheck check={check} version={version} />
    </div>
  );
}
