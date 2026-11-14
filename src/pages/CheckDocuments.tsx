import { useState } from "react";
import { FileSearch } from "lucide-react";
import { checkLocation } from "@/lib/check-location";
import { Link } from "@tanstack/react-router";
import { FileTypeIcon } from "@/components/FileTypeIcon";
import { StatusLabel } from "@/components/StatusChip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fieldSource } from "@/components/check/document-annotations";
import { SourceViewer } from "@/components/check/SourceViewer";
import type { Check, Doc, SourceRef } from "@/data/mock";

const PREFIX: Record<string, string> = { a: "А", b: "Б", c: "В", g: "g-" };
type DocumentFilter = "all" | "read" | "error";
const STATE_LABELS: Record<Doc["state"], string> = {
  "прочитан": "Прочитано",
  "дубль": "Дубликат",
  "вне периода": "Вне периода проверки",
  "другой договор": "Другой договор",
  "не прочитан": "Не удалось прочитать",
};
export function CheckDocuments({ check, version }: { check: Check; version?: number }) {
  const [filter, setFilter] = useState<DocumentFilter>("all");
  const [open, setOpen] = useState<Doc | null>(null);
  const readCount = check.docs.filter((d) => d.state === "прочитан").length;
  const filters: { value: DocumentFilter; label: string; count: number }[] = [
    { value: "all", label: "Все", count: check.docs.length },
    { value: "read", label: "Прочитано", count: readCount },
    { value: "error", label: "Ошибочные", count: check.docs.length - readCount },
  ];
  const refs = (d: Doc) =>
    check.rows
      .filter((r) => r.sources.some((s) => s.docId === d.id))
      .map((r) => `${PREFIX[check.id]}${check.rows.indexOf(r) + 1}`);
  const list = check.docs.filter((d) =>
    filter === "all" || (filter === "read" ? d.state === "прочитан" : d.state !== "прочитан"),
  );
  const openRow = open
    ? (check.rows.find((r) => r.sources.some((s) => s.docId === open.id)) ?? check.rows[0])
    : undefined;
  const field = open?.fields.find((item) => item.label === "Сумма") ?? open?.fields[0];
  const source: SourceRef | null = open
    ? openRow?.sources.find((item) => item.docId === open.id) ?? (field ? fieldSource(open, field) : null)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <span id="doc-filter" className="text-[12px] text-muted-foreground">
          Статус
        </span>
        <ToggleGroup
          aria-labelledby="doc-filter"
          type="single"
          value={filter}
          onValueChange={(v) => v && setFilter(v as DocumentFilter)}
          variant="outline"
          className="justify-start bg-card"
        >
          {filters.map((item) => (
            <ToggleGroupItem key={item.value} value={item.value} className="px-3 text-[13px]">
              {item.label} ({item.count})
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="library-table overflow-hidden bg-card">
        <Table className="text-[13px] [&_td]:whitespace-normal">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {["Файл", "Тип", "Номер", "Дата", "Договор", "Стр.", "Статус", "Строки КФЗ"].map(
                (h) => (
                  <TableHead key={h} className="h-9 text-[12px] font-medium text-muted-foreground">
                    {h}
                  </TableHead>
                ),
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((d) => (
              <TableRow
                key={d.id}
                tabIndex={0}
                onClick={() => setOpen(d)}
                onKeyDown={(event) => { if (event.key === "Enter" && event.target === event.currentTarget) setOpen(d); }}
                className="cursor-pointer even:bg-row-zebra hover:bg-row-hover"
              >
                <TableCell className="max-w-[280px] font-medium">
                  <div className="library-file">
                    <FileTypeIcon
                      extension={
                        d.title.toLowerCase().includes("ведомость") ||
                        d.title.toLowerCase().includes("взнос")
                          ? "XLS"
                          : "PDF"
                      }
                    />
                    <span>{d.title}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[160px] text-muted-foreground">{d.type}</TableCell>
                <TableCell className="tabular-nums">{d.number}</TableCell>
                <TableCell className="tabular-nums">{d.date}</TableCell>
                <TableCell className="tabular-nums">{d.contract}</TableCell>
                <TableCell className="tabular-nums">{d.pages || "—"}</TableCell>
                <TableCell>
                  <StatusLabel
                    plain={d.state !== "прочитан"}
                    status={
                      d.state === "прочитан"
                        ? "verified"
                        : d.state === "не прочитан"
                          ? "discrepancy"
                          : "unverified"
                    }
                    label={d.demoUpload ? "Файл не распознан" : STATE_LABELS[d.state]}
                  />
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {refs(d).length
                    ? refs(d).map((x, i) => (
                        <span key={x}>
                          {i > 0 && ", "}
                          <Link
                            to="/checks/$id"
                            {...checkLocation(check.id, version)}
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary hover:underline"
                          >
                            {x}
                          </Link>
                        </span>
                      ))
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  <FileSearch className="mx-auto mb-2 h-6 w-6" />
                  Документов с этим статусом нет
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[520px]">
          <SheetHeader>
            <SheetTitle>Документ</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {open && openRow && (
              <SourceViewer row={openRow} source={source} doc={open} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
