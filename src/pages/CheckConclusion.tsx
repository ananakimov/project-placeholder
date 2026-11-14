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

function ConclusionSummary({ check }: { check: Check }) {
  const indicators = check.rows.filter((row) => !row.service && !row.nested);
  const discrepancies = indicators.filter((row) => row.status === "discrepancy");
  const unverified = indicators.filter((row) => row.status === "unverified");
  const total = check.rows.find((row) => row.service && row.ruleId === "R-COV-01");
  const verified = indicators.filter((row) => row.status === "verified");
  const article = (name: string) => name.match(/ \(Статья калькуляции (\d+)\)$/)?.[1];
  const indicatorName = (name: string) => article(name) ? `статья ${article(name)}` : name;
  const sentence = (text: string) => text.replace(/\.$/, "") + ".";

  return (
    <div className="mt-2 max-w-[820px] space-y-1 text-[15px] leading-relaxed tabular-nums">
      {discrepancies.length > 0 && <p>
        {discrepancies.map((row) => {
          const label = indicatorName(row.name).replace(/^статья /, "Статья ");
          if (row.delta === null || Number(row.delta) === 0) {
            return <span key={row.id}>{sentence(`${label} — ${row.reason || "выявлено расхождение"}`)}{' '}</span>;
          }
          const absolute = formatMoney(row.delta.replace(/^-/, ""));
          const direction = row.delta.startsWith("-") ? "ниже" : "выше";
          return <span key={row.id}>
            {label} — значение в КФЗ {direction} подтверждённого на <strong>{absolute} {row.unit ?? "₽"}</strong>.
            {row.category && row.category !== "сумма" && row.reason && ` ${sentence(row.reason)}`}{' '}
          </span>;
        })}
      </p>}
      {(verified.length > 0 || unverified.length > 0) && <p>
        {verified.length > 0 && (check.conclusion === "Достоверен"
          ? `Все ${verified.length} показателей КФЗ подтверждены документами.`
          : `Подтверждено: ${verified.map((row) => indicatorName(row.name)).join(", ")}.`)}
        {verified.length > 0 && unverified.length > 0 && " "}
        {unverified.length > 0 && `Не проверено: ${unverified.map((row) =>
          `${indicatorName(row.unit ? row.name.replace(/ \([^)]*\)$/, "") : row.name)} (${formatMoney(row.reported)} ${row.unit ?? "₽"})`).join(", ")}.`}
      </p>}
      {total && total.status !== "verified" && <p>
        {total.status === "discrepancy" && total.delta !== null
          ? `Расхождение по итогу этапа — ${formatMoney(total.delta.replace(/^-/, ""))} ₽.`
          : `Итог в КФЗ — ${formatMoney(total.reported)} ₽. ${total.partialNote || total.reason}`}
      </p>}
      {check.excluded.length > 0 && <p>
        Исключённые документы ({check.excluded.length}): {[...new Set(check.excluded.map((doc) => doc.reason))].join(", ")}.
      </p>}
      {check.docs.some((doc) => doc.demoUpload) && <p>
        Для добавленных файлов извлечение данных недоступно. Покрытие рассчитано по доступным подтверждениям.
      </p>}
    </div>
  );
}

export function CheckConclusion({ check, children, version }: { check: Check; children?: ReactNode; version?: number | undefined }) {
  const counts = countByStatus(check);
  const { coverage } = check;
  const total = counts.verified + counts.discrepancy + counts.unverified;
  const groups = [
    { label: "Подтверждено", count: counts.verified, sum: coverage.verifiedSum, pct: coverage.verifiedPct, theme: "verified" },
    { label: "Строки с расхождениями", count: counts.discrepancy, sum: coverage.discrepancySum, pct: coverage.discrepancyPct, theme: "discrepancy" },
    { label: "Не проверено", count: counts.unverified, sum: coverage.unverifiedSum, pct: coverage.unverifiedPct, theme: "unverified" },
  ];
  const hasCoverage = Number(coverage.totalSum) > 0 && groups.every(({ pct }) =>
    typeof pct === "string" && pct.trim() !== "" && Number.isFinite(Number(pct)) && Number(pct) >= 0 && Number(pct) <= 100);

  return (
    <div className="conclusion-page min-w-0 space-y-5">
      <section aria-label="Заключение по проверке" data-print-card>
        <div className="text-[13px] text-muted-foreground">Вывод по проверке</div>
        <h2 className={cn("conclusion-title", colors[check.conclusion])}>{check.conclusion}</h2>
        <ConclusionSummary check={check} />
      </section>
      <section aria-labelledby="check-coverage-heading" className="rounded-lg border bg-card p-5 shadow-card" data-print-card>
        <h2 id="check-coverage-heading" className="mb-3 text-[15px] font-medium">Покрытие</h2>
        <div className="space-y-4 text-[13px]">
          <div>
            <div className="mb-1.5 flex justify-between gap-2">
              <span className="text-muted-foreground">По строкам</span>
              <span className="tabular-nums">{counts.verified} из {total} подтверждено</span>
            </div>
            <div aria-hidden="true" className="flex h-2 overflow-hidden rounded-full bg-unverified-bg">
              {groups.map(({ theme, count }) => (
                <div key={theme} className={`coverage-${theme}`} style={{ width: `${count / Math.max(total, 1) * 100}%` }} />
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex justify-between gap-2">
              <span className="text-muted-foreground">По сумме</span>
              <span><Money value={coverage.totalSum} /> ₽</span>
            </div>
            {hasCoverage ? (
              <div aria-hidden="true" className="flex h-2 overflow-hidden rounded-full bg-unverified-bg">
                {groups.map(({ theme, pct }) => <div key={theme} className={`coverage-${theme}`} style={{ width: `${pct}%` }} />)}
              </div>
            ) : <p className="text-muted-foreground">Недостаточно данных для расчёта покрытия по сумме.</p>}
            <table className="mt-2 w-full" aria-label="Счётчики показателей">
              <thead className="sr-only">
                <tr><th scope="col">Статус</th><th scope="col">Строки</th><th scope="col">Сумма</th><th scope="col">Доля</th></tr>
              </thead>
              <tbody>
                {groups.map(({ label, count, sum, pct, theme }) => (
                  <tr key={theme}>
                    <th scope="row" className={cn("py-0.5 text-left font-normal", {
                      "text-verified": theme === "verified",
                      "text-discrepancy": theme === "discrepancy",
                      "text-unverified": theme === "unverified",
                    })}>{label}</th>
                    <td className="py-0.5 pr-2 text-right tabular-nums text-muted-foreground">{count} стр.</td>
                    <td className="py-0.5 text-right"><Money value={sum} />{sum !== null && " ₽"}</td>
                    <td className="w-16 py-0.5 text-right tabular-nums text-muted-foreground">{hasCoverage ? `${pct.replace(".", ",")}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      {children}
      <AcceptCheck check={check} version={version} />
    </div>
  );
}
