import { useEffect, useState } from "react";
import { Copy, Eye, FileWarning, PenLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AiBadge } from "@/components/AiBadge";
import { Money } from "@/components/Money";
import { useChecks } from "@/context/ChecksContext";
import { useRole } from "@/context/RoleContext";
import { countByStatus } from "@/pages/Checks";
import { CONCLUSION_SUMMARY, EXPLANATION_DRAFTS, PROBLEMS, REQUEST_DRAFTS } from "@/data/problems";
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
  extra,
}: {
  title: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <section data-print-card className="rounded-lg border bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-medium">{title}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

export function CheckConclusion({ check }: { check: Check }) {
  const store = useChecks();
  const { role } = useRole();
  const signature = store.signature[check.id] ?? null;
  const [text, setText] = useState(store.explanations[check.id] ?? "");
  const [reqOpen, setReqOpen] = useState(false);
  useEffect(() => {
    store.setExplanation(check.id, text);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const request = REQUEST_DRAFTS[check.id];

  const sign = () => {
    store.sign(check.id);
    store.addLog(check.id, {
      action: "Вывод подписан",
      object: check.title,
      before: check.state,
      after: `Подписано · ${check.conclusion}`,
    });
    toast("Вывод подписан");
  };

  return (
    <div className="conclusion-page space-y-5">
      <div>
        <div className="text-[13px] text-muted-foreground">Вывод по проверке</div>
        <div className={cn("conclusion-title", color[check.conclusion])}>{check.conclusion}</div>
        {CONCLUSION_SUMMARY[check.id] && check.conclusion === "Недостоверен" && (
          <p className="mt-2 max-w-[820px] text-[15px] tabular-nums">
            {CONCLUSION_SUMMARY[check.id]}
          </p>
        )}
        <p className="mt-2 max-w-[820px] text-[13px] text-muted-foreground">
          Нет расхождений и непроверенных → Достоверен. Есть хотя бы одно расхождение →
          Недостоверен. Нет расхождений, есть непроверенные → Подтвердить полностью нельзя.
        </p>
      </div>

      <div className="conclusion-grid grid grid-cols-2 gap-4">
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
          <p className="mt-2 text-[11px] text-muted-foreground">
            Таблица отражает результат автоматической проверки
          </p>
        </Card>
      </div>

      <Card
        title="Недостающие документы"
        extra={
          request && (
            <Button size="sm" variant="outline" onClick={() => setReqOpen(true)} data-print-hide>
              Черновик запроса <AiBadge />
            </Button>
          )
        }
      >
        {check.missing.length === 0 ? (
          <p className="text-sm text-muted-foreground">Недостающих документов нет</p>
        ) : (
          <ul className="space-y-1.5 text-[13px]">
            {check.missing.map((m) => (
              <li key={m} className="flex items-center gap-2">
                <FileWarning className="h-4 w-4 text-unverified" /> {m}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Пояснение бухгалтера"
        extra={
          role === "Бухгалтер" &&
          !signature && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setText(EXPLANATION_DRAFTS[check.id] ?? "")}
              data-print-hide
            >
              <PenLine className="h-3.5 w-3.5" /> Черновик пояснения <AiBadge />
            </Button>
          )
        }
      >
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          disabled={!!signature || role !== "Бухгалтер"}
          placeholder="Опишите основания вывода"
          aria-label="Пояснение бухгалтера"
        />
      </Card>

      <section data-print-card className="flex items-center gap-4">
        {signature ? (
          <div className="rounded-lg border border-verified/30 bg-verified-bg px-4 py-3 text-sm text-verified tabular-nums">
            Подписано: {signature.by}, {signature.at}
          </div>
        ) : role === "Аспирант" ? (
          <div
            className="flex items-center gap-2 rounded-lg border bg-unverified-bg px-4 py-3 text-sm text-unverified"
            data-print-hide
          >
            <Eye className="h-4 w-4" /> Режим просмотра
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

      <Dialog open={reqOpen} onOpenChange={setReqOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Черновик запроса <AiBadge />
            </DialogTitle>
          </DialogHeader>
          <p className="rounded-md border border-ai/20 bg-ai-bg p-3 text-[13px] leading-relaxed">
            {request}
          </p>
          <DialogFooter>
            <Button
              onClick={async () => {
                await navigator.clipboard?.writeText(request ?? "").catch(() => {});
                toast("Текст скопирован");
              }}
            >
              <Copy className="h-4 w-4" /> Копировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
