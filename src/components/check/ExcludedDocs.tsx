import { CalendarX2, Copy, FileX2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/Money";
import type { Check, ExcludedDoc } from "@/data/mock";

const ICON = { "дубль": Copy, "вне периода": CalendarX2, "другой договор": FileX2 } as const;

export function ExcludedDocs({ check, onSource }: {
  check: Check;
  onSource: (item: ExcludedDoc, trigger: HTMLElement) => void;
}) {
  return (
    <section className="rounded-lg border bg-card p-4 shadow-card">
      <h3 className="mb-3 text-sm font-medium">Исключённые документы ({check.excluded.length})</h3>
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {["Файл", "Причина", "Сумма, ₽", "Влияние"].map((h, i) => <TableHead key={h} className={i === 2 ? "h-9 text-right text-[12px] font-medium text-muted-foreground" : "h-9 text-[12px] font-medium text-muted-foreground"}>{h}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {check.excluded.map((e) => {
            const Icon = ICON[e.reason];
            return (
              <TableRow key={e.docId} className="even:bg-row-zebra">
                <TableCell className="whitespace-normal font-medium text-primary">
                  <button type="button" className="text-left underline underline-offset-2" onClick={(event) => onSource(e, event.currentTarget)}>{e.file}</button>
                </TableCell>
                <TableCell><div className="flex flex-wrap gap-1"><Badge variant="outline" className="gap-1 whitespace-nowrap border-border bg-unverified-bg font-normal text-unverified"><Icon className="h-3 w-3" />{e.reason}</Badge></div></TableCell>
                <TableCell className="text-right"><Money value={e.amount} /></TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">{e.impact}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <p className="mt-2 text-[11px] text-muted-foreground">Исключение документа не считается расхождением отчёта, если статья сходится</p>
    </section>
  );
}
