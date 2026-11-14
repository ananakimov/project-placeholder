import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/Money";
import { ExcludedDocs } from "@/components/check/ExcludedDocs";
import { useChecks } from "@/context/ChecksContext";
import { countByStatus } from "@/pages/Checks";
import type { Check } from "@/data/mock";
import { cn } from "@/lib/utils";

const color: Record<Check["conclusion"], string> = {
  Достоверен: "mint",
  Недостоверен: "peach",
  "Подтвердить полностью нельзя": "lavender",
};

const cardClass = "rounded-lg border bg-card p-4 shadow-card";

export function CheckConclusion({ check, onProblemSelect, children }: {
  check: Check;
  onProblemSelect?: (rowId: string) => void;
  children?: ReactNode;
}) {
  const store = useChecks();
  const signature = store.signature[check.id] ?? null;
  const counts = countByStatus(check);
  const { coverage } = check;
  const reviewed = store.reviewed[check.id];
  const pending = check.rows.filter((row) =>
    check.exceptionOrder.includes(row.id) && row.status !== "verified" && !reviewed?.has(row.id),
  ).length;
  const unverified = check.rows.filter((row) => !row.service && !row.nested && row.status === "unverified");
  const unread = check.docs.filter((doc) => doc.state === "не прочитан");
  const groups = [
    ["Подтверждено", counts.verified, coverage.verifiedSum, coverage.verifiedPct, "verified"],
    ["Расхождения", counts.discrepancy, coverage.discrepancySum, coverage.discrepancyPct, "discrepancy"],
    ["Не проверено", counts.unverified, coverage.unverifiedSum, coverage.unverifiedPct, "unverified"],
  ] as const;

  return <div className="conclusion-page min-w-0 space-y-5">
    <section data-print-card aria-label="Результаты проверки" className={cardClass}>
      <div className="mb-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
        <h2 className="font-medium">Результаты проверки</h2>
        <p>Сумма показателей КФЗ <strong><Money value={coverage.totalSum} /> ₽</strong></p>
      </div>
      <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-unverified-bg" aria-hidden="true">
        {groups.map(([label, , , pct, status]) => (
          <div key={label} className={`coverage-${status}`} style={{ width: `${pct}%` }} />
        ))}
      </div>
      <dl aria-label="Счётчики показателей" className="grid gap-2 text-[13px] sm:grid-cols-3">
        {groups.map(([label, count, sum, pct, status]) => <div key={label}>
          <dt className={cn("font-medium", { "text-verified": status === "verified", "text-discrepancy": status === "discrepancy", "text-unverified": status === "unverified" })}>{label}</dt>
          <dd className="tabular-nums">{count} стр. · <Money value={sum} /> ₽ · {pct.replace(".", ",")}%</dd>
        </div>)}
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">Суммы и доли относятся к денежным статьям КФЗ без итогов.</p>
    </section>

    {children}

    <section aria-label="Дополнительные проверки" className="space-y-3">
      <h2 className="text-lg font-medium">Дополнительные проверки</h2>
      {check.excluded.length > 0 && <ExcludedDocs check={check} />}
      {unread.length > 0 && <div className={cardClass}>
        <h3 className="mb-2 text-sm font-medium">Ошибки чтения</h3>
        <ul className="space-y-1 text-sm">{unread.map((doc) => (
          <li key={doc.id}>{doc.title} · Не удалось прочитать</li>
        ))}</ul>
      </div>}
      {unverified.length > 0 && <section className={cardClass}>
        <h3 className="mb-2 text-sm font-medium">Недостаточно подтверждений</h3>
        <p className="mb-2 text-sm text-muted-foreground">Недостаточно данных для проверки</p>
        <ul className="space-y-2 text-[13px]">{unverified.map((row) => <li key={row.id}>
          {onProblemSelect
            ? <button type="button" className="text-left font-medium text-primary underline"
                aria-label={`Перейти к строке: ${row.name}`} onClick={() => onProblemSelect(row.id)}>{row.name}</button>
            : <strong>{row.name}</strong>}
          {row.reason.trim() && <p className="text-muted-foreground">{row.reason}</p>}
          {row.partialNote && <p className="text-muted-foreground">{row.partialNote}</p>}
        </li>)}</ul>
      </section>}
      {check.excluded.length === 0 && unread.length === 0 && unverified.length === 0 &&
        <p className="text-sm text-muted-foreground">Дополнительных замечаний нет.</p>}
    </section>

    <section data-print-card aria-label="Заключение по проверке" className="space-y-2">
      <h2 className="text-sm font-medium">Заключение</h2>
      <h3 className={cn("conclusion-title", color[check.conclusion])}>{check.conclusion}</h3>
      {signature ? <p className="text-sm text-verified">
        Подписано: главный бухгалтер {signature.by}, {signature.at}
      </p> : <div className="flex flex-wrap items-center gap-3" data-print-hide>
        <Button disabled={pending > 0} onClick={() => {
          store.sign(check.id);
          toast("Вывод подписан");
        }}>Подписать вывод</Button>
        {pending > 0 && <span className="text-sm text-muted-foreground">Осталось просмотреть: {pending}</span>}
      </div>}
    </section>
  </div>;
}
