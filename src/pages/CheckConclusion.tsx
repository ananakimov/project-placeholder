import type { ReactNode } from "react";
import { Money } from "@/components/Money";
import { countByStatus } from "@/pages/Checks";
import type { Check } from "@/data/mock";
import { cn } from "@/lib/utils";

const colors = {
  Достоверен: "mint",
  Недостоверен: "peach",
  "Подтвердить полностью нельзя": "lavender",
} satisfies Record<Check["conclusion"], string>;

export function CheckConclusion({ check, children }: { check: Check; children?: ReactNode }) {
  const counts = countByStatus(check);
  const { coverage } = check;
  const recommendation = counts.discrepancy > 0
    ? "Уточните показатели с расхождениями по первичным документам и повторите проверку."
    : counts.unverified > 0
      ? "Уточните основания по непроверенным показателям, прежде чем делать вывод о достоверности."
      : "Сверьте отчёт с итогом проверки перед его использованием.";
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
        <p className="mt-1 text-sm">{recommendation}</p>
      </section>
      <section aria-labelledby="check-coverage-heading" className="rounded-lg border bg-card p-4 shadow-card" data-print-card>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <h2 id="check-coverage-heading" className="font-medium">Покрытие</h2>
          <span>Учитываемая сумма <strong><Money value={coverage.totalSum} /> ₽</strong></span>
        </div>
        {hasCoverage ? (
          <div aria-hidden="true" className="mb-3 flex h-2 overflow-hidden rounded-full bg-unverified-bg">
            {groups.map(({ theme, pct }) => <div key={theme} className={`coverage-${theme}`} style={{ width: `${pct}%` }} />)}
          </div>
        ) : <p className="mb-3 text-sm text-muted-foreground">Недостаточно данных для расчёта покрытия по сумме.</p>}
        <dl aria-label="Счётчики показателей" className="grid gap-2 text-sm sm:grid-cols-3">
          {groups.map(({ label, count, sum, pct, theme }) => (
            <div key={theme} className="min-w-0">
              <dt className={cn("font-medium", {
                "text-verified": theme === "verified",
                "text-discrepancy": theme === "discrepancy",
                "text-unverified": theme === "unverified",
              })}>{label}</dt>
              <dd className="tabular-nums">
                {sum == null ? <Money value={null} /> : <><Money value={sum} /> ₽</>}
                {hasCoverage && ` · ${pct.replace(".", ",")}%`}
                {` · ${count} стр.`}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">Суммы и доли учитывают денежные показатели КФЗ. Сумма строк с расхождениями отличается от разницы Δ.</p>
      </section>
      {children}
    </div>
  );
}
