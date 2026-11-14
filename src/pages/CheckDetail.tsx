import { Fragment, useEffect, useMemo, useState } from "react";
import { Check, CircleHelp, TriangleAlert, ChevronRight, FileText, Search, X } from "lucide-react";
import { Money } from "@/components/Money";
import { SourceWorkspace, useSourceWorkspace } from "@/components/check/SourceWorkspace";
import { fieldSource } from "@/components/check/document-annotations";
import { AdditionalChecks } from "@/components/check/AdditionalChecks";
import { CheckConclusion } from "@/pages/CheckConclusion";
import { countByStatus } from "@/pages/Checks";
import type { Check as CheckData, ExcludedDoc, Row, SourceRef, Status } from "@/data/mock";
import { cn } from "@/lib/utils";

type Filter = "all" | Status;
const statusLabels: Record<Status, string> = {
  verified: "Подтверждено",
  discrepancy: "Расхождение",
  unverified: "Не проверено",
};
const statusIcons = { verified: Check, discrepancy: TriangleAlert, unverified: CircleHelp };
const statusFilter = (row: Row) => !row.service && !row.nested;

type ResultProps = { check: CheckData; version?: number | undefined };
export function CheckDetail({ check, version }: ResultProps) {
  return <Reconciliation key={`${check.id}:${version ?? 1}`} check={check} version={version} />;
}
function Reconciliation({ check, version }: ResultProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const workspace = useSourceWorkspace(check);
  const { evidence } = workspace;
  const evidenceRowId = evidence?.row?.id;
  const activeRowId = workspace.panelOpen && evidence?.sources[evidence.index]?.docId === workspace.docId
    ? evidenceRowId
    : undefined;
  const { clearEvidence } = workspace;
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const n = countByStatus(check);
  const total = n.verified + n.discrepancy + n.unverified;
  const docById = useMemo(() => new Map(check.docs.map((doc) => [doc.id, doc])), [check.docs]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return check.rows.filter((row) => (filter === "all" || (statusFilter(row) && row.status === filter)) &&
      (!q || row.name.toLowerCase().includes(q) || row.sources.some((source) => `${docById.get(source.docId)?.title} ${docById.get(source.docId)?.number}`.toLowerCase().includes(q))));
  }, [check.rows, filter, query, docById]);
  useEffect(() => {
    if (evidenceRowId && !rows.some((row) => row.id === evidenceRowId)) clearEvidence();
  }, [clearEvidence, evidenceRowId, rows]);

  useEffect(() => {
    if (!scrollTarget) return;
    const target = document.getElementById(`indicator-${scrollTarget}`);
    target?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
    setScrollTarget(null);
  }, [scrollTarget, rows]);
  function toggleRow(rowId: string) {
    setExpanded((previous) => {
      const next = new Set(previous);
      next.has(rowId) ? next.delete(rowId) : next.add(rowId);
      return next;
    });
  }
  function showEvidence(row: Row, sources: readonly SourceRef[], index: number, trigger: HTMLElement) {
    if (!rows.some((item) => item.id === row.id)) {
      setQuery("");
      setFilter("all");
    }
    workspace.openEvidence(row, sources, index, trigger);
  }
  function openSource(row: Row, index: number, trigger: HTMLElement) {
    showEvidence(row, row.sources, index, trigger);
  }
  function openDiagnostic(docId: string, trigger: HTMLElement) {
    const row = check.rows.find((entry) => entry.sources.some((source) => source.docId === docId));
    const source = row?.sources.find((entry) => entry.docId === docId);
    if (row && source) showEvidence(row, [source], 0, trigger);
  }
  function openExcluded(item: ExcludedDoc, trigger: HTMLElement) {
    const row = check.rows.find((entry) => item.rowIds?.includes(entry.id));
    const doc = check.docs.find((entry) => entry.id === item.docId);
    if (!doc) return;
    const field = doc.fields.find((entry) => entry.label === item.field);
    if (row && field) showEvidence(row, [fieldSource(doc, field)], 0, trigger);
    else workspace.openDocument(doc, trigger);
  }
  const filters: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "Все", count: total },
    { value: "discrepancy", label: "Расхождения", count: n.discrepancy },
    { value: "unverified", label: "Нет данных", count: n.unverified },
    { value: "verified", label: "Подтверждено", count: n.verified },
  ];
  return (
    <div className="reconciliation-page">
      <CheckConclusion check={check} version={version}>
      <div className="source-workspace" data-source-open={workspace.panelOpen}
        onKeyDown={(event) => { if (event.key === "Escape" && workspace.panelOpen) workspace.close(); }}>
      <SourceWorkspace check={check} workspace={workspace} />
      <section className="source-workspace-table min-w-0 bg-card" aria-label="Рабочее место сверки">
        <h2 className="py-3 text-lg font-medium">Показатели отчёта</h2>
        <div className="reconcile-filters !mx-0" aria-label="Статус показателя">
          {filters.map((item) => <button key={item.value} aria-pressed={filter === item.value} className={cn(filter === item.value && "active", item.value)} onClick={() => setFilter(item.value)}>{item.label}<span>{item.count}</span></button>)}
        </div>
        <div className="reconcile-search !mx-0">
          <Search size={15} /><input aria-label="Поиск показателя или документа" placeholder="Показатель или номер документа…" value={query} onChange={(event) => setQuery(event.target.value)} />
          {query && <button aria-label="Очистить поиск" onClick={() => setQuery("")}><X size={14} /></button>}
        </div>
        <div className="overflow-x-auto">
          <table className="reconcile-table kfz-result-table" aria-label="Показатели КФЗ">
            <thead><tr>{["Показатель КФЗ", "В КФЗ", "Ожидаемо", "Разница Δ", "Статус", "Пояснение"].map(
              (label) => <th key={label} scope="col">{label}</th>,
            )}</tr></thead>
            <tbody>{rows.map((row) => {
              const isExpanded = expanded.has(row.id);
              const StatusIcon = statusIcons[row.status];
              return <Fragment key={row.id}>
                <tr id={`indicator-${row.id}`} tabIndex={0} aria-expanded={isExpanded} aria-controls={`details-${row.id}`} data-selected={activeRowId === row.id} data-status={row.status}
                  className={cn("cursor-pointer", row.service && "service-row")}
                  onClick={() => toggleRow(row.id)}
                  onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); toggleRow(row.id); } }}>
                  <td><div className="indicator-name">
                    <ChevronRight size={14} className={cn("shrink-0", isExpanded && "rotate-90")} />
                    <button className="row-name-button" aria-expanded={isExpanded} aria-controls={`details-${row.id}`} onClick={(event) => { event.stopPropagation(); toggleRow(row.id); }}>{row.name}</button>
                  </div><div className="indicator-meta"><span>{row.sources.length ? `${row.sources.length} док.` : "Нет источника"}</span>{row.manual && <span>Вручную</span>}{row.service && <span>Итоговая строка</span>}</div></td>
                  <td><Measure value={row.reported} unit={row.unit} /></td>
                  <td className="expected-cell"><Measure value={row.expected} unit={row.unit} />
                    {row.partialNote && <small>Частично подтверждено</small>}
                  </td>
                  <td className={cn("difference-cell", row.status === "discrepancy" && "delta-cell")}>
                    <Measure value={row.delta} unit={row.unit} />
                  </td>
                  <td className="indicator-status-cell">
                    <span className="row-status" data-status={row.status} role="img" tabIndex={0}
                      aria-label={statusLabels[row.status]} onClick={(event) => event.stopPropagation()}>
                      <StatusIcon size={14} aria-hidden="true" />
                      <span className="indicator-status-label" aria-hidden="true">{statusLabels[row.status]}</span>
                    </span>
                  </td>
                  <td className="indicator-explanation">
                    {row.reason || (row.status === "verified" ? "Значение подтверждено документами" : "—")}
                    {row.service && row.partialNote && <p className="mt-1 text-muted-foreground">{row.partialNote}</p>}
                  </td>
                </tr>
                {isExpanded && <tr><td colSpan={6} className="!p-0 !text-left"><div id={`details-${row.id}`} role="region" aria-label={`Подробности: ${row.name}`} className="border-b bg-card px-4 py-3">
                  <RowDocuments row={row} onOpen={(index, trigger) => openSource(row, index, trigger)} docs={docById} />
                </div></td></tr>}
              </Fragment>;
            })}</tbody>
          </table>
        </div>
        {!rows.length && <div className="reconcile-empty"><Search size={25} /><strong>Показатели не найдены</strong><p>Измените запрос или выберите другой статус.</p><button onClick={() => { setQuery(""); setFilter("all"); }}>Сбросить фильтры</button></div>}
      </section>
      </div>
      <AdditionalChecks check={check} version={version} onExcluded={openExcluded} onDiagnostic={openDiagnostic} onIndicator={(id) => {
        setQuery("");
        setFilter("all");
        setExpanded((previous) => new Set(previous).add(id));
        setScrollTarget(id);
      }} />
      </CheckConclusion>
    </div>
  );
}

function Measure({ value, unit }: { value: string | null; unit?: string | undefined }) {
  return <><Money value={value} />{value !== null && <small> {unit ?? "₽"}</small>}</>;
}

function RowDocuments({ row, docs, onOpen }: {
  row: Row;
  docs: ReadonlyMap<string, CheckData["docs"][number]>;
  onOpen: (index: number, trigger: HTMLElement) => void;
}) {
  if (!row.sources.length) return <p className="text-sm text-muted-foreground">Подтверждающих документов нет.</p>;
  return (
    <ul className="divide-y rounded-lg border" aria-label={`Документы: ${row.name}`}>
      {row.sources.map((source, index) => {
        const doc = docs.get(source.docId);
        return (
          <li key={`${source.docId}-${index}`}>
            <button type="button" disabled={!doc} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-row-hover"
              aria-label={`Открыть документ: ${doc?.title ?? source.docId}`} onClick={(event) => onOpen(index, event.currentTarget)}>
              <FileText size={16} className="shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 break-words">
                <span>{doc?.title ?? source.docId}</span>
                <small className="block text-muted-foreground">
                  {doc?.number && `№ ${doc.number} · `}{doc?.date && `${doc.date} · `}Стр. {source.page}
                  {doc?.state !== "прочитан" && doc?.state && ` · ${doc.state}`}
                </small>
              </span>
              <span className="tabular-nums"><Measure value={source.amount} unit={row.unit} /></span>
              <ChevronRight size={14} className="shrink-0" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
