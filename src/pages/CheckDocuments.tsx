import { useState } from "react";
import { FileSearch } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { FileTypeIcon } from "@/components/FileTypeIcon";
import { StatusLabel } from "@/components/StatusChip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SourceWorkspace, useSourceWorkspace } from "@/components/check/SourceWorkspace";
import type { Check, Doc } from "@/data/mock";

type DocumentFilter = "all" | "read" | "excluded" | "error";
function documentGroup(doc: Doc) {
  if (doc.state === "прочитан") return "read";
  if (doc.state === "не прочитан") return "error";
  return "excluded";
}

const STATE_LABELS: Record<Doc["state"], string> = {
  "прочитан": "Прочитано",
  "дубль": "Дубликат",
  "вне периода": "Вне периода проверки",
  "другой договор": "Другой договор",
  "не прочитан": "Не удалось прочитать",
};
export function CheckDocuments({ check, version }: { check: Check; version?: number }) {
  const [filter, setFilter] = useState<DocumentFilter>("all");
  const workspace = useSourceWorkspace(check);
  const readCount = check.docs.filter((doc) => documentGroup(doc) === "read").length;
  const errorCount = check.docs.filter((doc) => documentGroup(doc) === "error").length;
  const filters: { value: DocumentFilter; label: string; count: number }[] = [
    { value: "all", label: "Все", count: check.docs.length },
    { value: "read", label: "Прочитано", count: readCount },
    { value: "excluded", label: "Исключены", count: check.docs.length - readCount - errorCount },
  ];
  if (errorCount) filters.push({ value: "error", label: "Ошибка чтения", count: errorCount });
  const list = check.docs.filter((doc) => filter === "all" || documentGroup(doc) === filter);
  const linkedRows = (docId: string) => check.rows.filter((row) =>
    row.sources.some((source) => source.docId === docId)
      || row.evidenceDependencies?.includes(docId)
      || check.excluded.some((item) => item.docId === docId && item.rowIds?.includes(row.id)));

  return (
    <div className="source-workspace space-y-4" data-source-open={workspace.panelOpen}
      onKeyDown={(event) => { if (event.key === "Escape" && workspace.panelOpen) workspace.close(); }}>
      <SourceWorkspace check={check} workspace={workspace} />
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
          className="justify-start flex-wrap bg-card"
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
            {list.map((d) => {
              const linked = linkedRows(d.id);
              return <TableRow
                key={d.id}
                tabIndex={0}
                onClick={(event) => workspace.openDocument(d, event.currentTarget)}
                onKeyDown={(event) => {
                  if ((event.key === "Enter" || event.key === " ") && event.target === event.currentTarget) {
                    event.preventDefault();
                    workspace.openDocument(d, event.currentTarget);
                  }
                }}
                className="cursor-pointer even:bg-row-zebra hover:bg-row-hover data-[selected=true]:bg-row-hover"
                data-selected={workspace.panelOpen && workspace.docId === d.id}
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
                  {linked.length
                    ? linked.map((row, i) => (
                        <span key={row.id}>
                          {i > 0 && ", "}
                          <Link
                            to="/checks/$id"
                            params={{ id: check.id }}
                            search={version === undefined ? {} : { version }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary hover:underline"
                          >
                            {row.name.replace(/^(.*) \(Статья калькуляции (\d+)\)$/, "$2 · $1")}
                          </Link>
                        </span>
                      ))
                    : "—"}
                </TableCell>
              </TableRow>;
            })}
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
    </div>
  );
}
