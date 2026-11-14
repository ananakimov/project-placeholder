import { useState } from "react";
import { CalendarX2, Copy, FileX2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/Money";
import { SourceViewer } from "@/components/check/SourceViewer";
import type { Check, ExcludedDoc, SourceRef } from "@/data/mock";

const ICON = { "дубль": Copy, "вне периода": CalendarX2, "другой договор": FileX2 } as const;

export function ExcludedDocs({ check }: { check: Check }) {
  const [open, setOpen] = useState<ExcludedDoc | null>(null);
  const doc = open ? check.docs.find((d) => d.id === open.docId) ?? null : null;
  const field = doc && open ? doc.fields.find((f) => f.label === open.field) : undefined;
  const source: SourceRef | null = doc && field && open ? { docId: doc.id, page: field.page, bbox: field.bbox, text: `${field.label}: ${field.value}`, amount: open.amount, matchType: "точное" } : null;
  const row = check.rows.find((r) => r.id === "g-4") ?? check.rows[0];
  return (
    <section className="rounded-lg border bg-card p-4 shadow-card">
      <h2 className="mb-3 text-[15px] font-medium">Исключённые документы ({check.excluded.length})</h2>
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
              <TableRow key={e.docId} tabIndex={0} onClick={() => setOpen(e)} onKeyDown={(k) => k.key === "Enter" && setOpen(e)} className="cursor-pointer even:bg-row-zebra hover:bg-row-hover">
                <TableCell className="font-medium text-primary">{e.file}</TableCell>
                <TableCell><div className="flex flex-wrap gap-1"><Badge variant="outline" className="gap-1 whitespace-nowrap border-border bg-unverified-bg font-normal text-unverified"><Icon className="h-3 w-3" />{e.reason}</Badge></div></TableCell>
                <TableCell className="text-right"><Money value={e.amount} /></TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">{e.impact}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <p className="mt-2 text-[11px] text-muted-foreground">Исключение документа не считается расхождением отчёта, если статья сходится</p>
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[520px]">
          <SheetHeader><SheetTitle>Исключённый документ</SheetTitle></SheetHeader>
          <div className="mt-4">{open && row && <SourceViewer row={row} source={source} doc={doc} onWhy={() => {}} />}</div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
