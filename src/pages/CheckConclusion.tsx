import type { ReactNode } from "react";
import { FileWarning } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Money } from "@/components/Money";
import { useChecks } from "@/context/ChecksContext";
import { countByStatus } from "@/pages/Checks";
import { CONCLUSION_SUMMARY, PROBLEMS } from "@/data/problems";
import type { Check } from "@/data/mock";
import { cn } from "@/lib/utils";

const color: Record<Check["conclusion"], string> = {
  Достоверен: "mint",
  Недостоверен: "peach",
  "Подтвердить полностью нельзя": "lavender",
};
const pctLabel = (p: string) => `${p.replace(".", ",")}%`;

function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section data-print-card className="rounded-lg border bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-medium">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function CheckConclusion({ check, onProblemSelect, children }: { check: Check; onProblemSelect?: (rowId: string) => void; children?: ReactNode }) {
  const store = useChecks();
  const signature = store.signature[check.id] ?? null;
  const n = countByStatus(check);
  const total = n.verified + n.discrepancy + n.unverified;
  const cov = check.coverage;
  const reviewed = store.reviewed[check.id] ?? new Set<string>();
  const pending = check.exceptionOrder
    .map((id) => check.rows.find((r) => r.id === id))
    .filter(
      (r) => r && (r.status === "discrepancy" || r.status === "unverified") && !reviewed.has(r.id),
    ).length;
  const problems = PROBLEMS[check.id] ?? [];
  const hasCorrections = Object.keys(store.applied[check.id] ?? {}).length > 0;
  const unverified = check.rows.filter((row) => !row.service && !row.nested && row.status === "unverified");

  const sign = () => {
    store.sign(check.id);
    toast("Вывод подписан");
  };

  return (
    <div className="conclusion-page space-y-5">
      <section aria-label="Заключение по проверке" className="space-y-5">
      <div>
        <div className="text-[13px] text-muted-foreground">Вывод по проверке</div>
        <h2 className={cn("conclusion-title", color[check.conclusion])}>{check.conclusion}</h2>
        {!hasCorrections && CONCLUSION_SUMMARY[check.id] && check.conclusion === "Недостоверен" && (
          <p className="mt-2 max-w-[820px] text-[15px] tabular-nums">
            {CONCLUSION_SUMMARY[check.id]}
          </p>
        )}
      </div>

      <dl aria-label="Счётчики показателей" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {([["Подтверждено", n.verified, "text-verified"], ["Расхождения", n.discrepancy, "text-discrepancy"], ["Не проверено", n.unverified, "text-unverified"]] as const).map(([label, value, textColor]) => (
          <div key={label} className="rounded-lg border bg-card p-4">
            <dt className="text-sm text-muted-foreground">{label}</dt><dd className={cn("mt-1 text-2xl font-medium tabular-nums", textColor)}>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="conclusion-grid grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Покрытие">
          <div className="space-y-4 text-[13px]">
            <div>
              <div className="mb-1.5 flex justify-between">
                <span className="text-muted-foreground">По строкам</span>
                <span className="tabular-nums">
                  {n.verified} из {total} подтверждено
                </span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full bg-unverified-bg">
                <div
                  className="coverage-verified"
                  style={{ width: `${(n.verified / Math.max(total, 1)) * 100}%` }}
                />
                <div
                  className="coverage-discrepancy"
                  style={{ width: `${(n.discrepancy / Math.max(total, 1)) * 100}%` }}
                />
                <div
                  className="coverage-unverified"
                  style={{ width: `${(n.unverified / Math.max(total, 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex justify-between">
                <span className="text-muted-foreground">По сумме</span>
                <span>
                  <Money value={cov.totalSum} /> ₽
                </span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full bg-unverified-bg">
                <div className="coverage-verified" style={{ width: `${cov.verifiedPct}%` }} />
                <div className="coverage-discrepancy" style={{ width: `${cov.discrepancyPct}%` }} />
                <div className="coverage-unverified" style={{ width: `${cov.unverifiedPct}%` }} />
              </div>
              <table className="mt-2 w-full">
                <tbody>
                  {(
                    [
                      ["Подтверждено", cov.verifiedSum, cov.verifiedPct, "text-verified"],
                      ["Расхождения", cov.discrepancySum, cov.discrepancyPct, "text-discrepancy"],
                      ["Не проверено", cov.unverifiedSum, cov.unverifiedPct, "text-unverified"],
                    ] as const
                  ).map(([l, s, p, c]) => (
                    <tr key={l}>
                      <td className={cn("py-0.5", c)}>{l}</td>
                      <td className="py-0.5 text-right">
                        <Money value={s} /> ₽
                      </td>
                      <td className="w-[64px] py-0.5 text-right tabular-nums text-muted-foreground">
                        {pctLabel(p)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        <Card title="Найденные проблемы">
          {hasCorrections && problems.length > 0 && (
            <p className="mb-2 text-xs text-muted-foreground">Результат автоматической проверки до ручных правок</p>
          )}
          {problems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Проблем не найдено</p>
          ) : (
            problems.map((b) => (
              <div key={b.title}>
                <div className="mb-1 text-[12px] text-muted-foreground">{b.title}</div>
                <Table className="text-[13px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-8 text-[12px] font-medium text-muted-foreground">
                        Категория
                      </TableHead>
                      <TableHead className="h-8 text-right text-[12px] font-medium text-muted-foreground">
                        Строк
                      </TableHead>
                      <TableHead className="h-8 text-right text-[12px] font-medium text-muted-foreground">
                        Сумма, ₽
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {b.items.map((i) => (
                      <TableRow key={i.category} className="hover:bg-transparent">
                        <TableCell className="py-1.5">
                          {i.category}
                          {onProblemSelect && <div className="flex flex-wrap gap-x-3 gap-y-1">
                            {i.rowIds.map((rowId) => {
                              const row = check.rows.find((item) => item.id === rowId);
                              return row && <button key={rowId} className="text-left text-primary underline underline-offset-2" aria-label={`Перейти к строке: ${row.name}`} onClick={() => onProblemSelect(rowId)}>{row.name}</button>;
                            })}
                          </div>}
                          {i.note && (
                            <div className="text-[11px] text-muted-foreground">{i.note}</div>
                          )}
                        </TableCell>
                        <TableCell className="py-1.5 text-right tabular-nums">{i.rows}</TableCell>
                        <TableCell className="py-1.5 text-right">
                          <Money value={i.sum} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))
          )}
        </Card>
      </div>

      </section>
      {children}

      {unverified.length > 0 && (
        <Card title="Недостаточно подтверждений">
          <p className="mb-3 text-sm text-muted-foreground">Недостаточно данных для проверки</p>
          <ul className="space-y-3 text-[13px]">
            {unverified.map((row) => (
              <li key={row.id} className="flex items-start gap-2">
                <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-unverified" aria-hidden="true" />
                <div>
                  <div className="font-medium">{row.name}</div>
                  <p className="text-muted-foreground">{row.reason}</p>
                  {row.partialNote && <p className="text-muted-foreground">{row.partialNote}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section data-print-card className="flex items-center gap-4">
        {signature ? (
          <div className="rounded-lg border border-verified/30 bg-verified-bg px-4 py-3 text-sm text-verified tabular-nums">
            Подписано: главный бухгалтер {signature.by}, {signature.at}
          </div>
        ) : (
          <div className="flex items-center gap-4" data-print-hide>
            <Button size="lg" disabled={pending > 0} onClick={sign}>
              Подписать вывод
            </Button>
            {pending > 0 && (
              <span className="text-sm text-muted-foreground tabular-nums">
                Осталось просмотреть: {pending}
              </span>
            )}
          </div>
        )}
      </section>

    </div>
  );
}
