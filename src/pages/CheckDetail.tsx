import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowDown, ArrowUp, Check, CheckCheck, ChevronRight, FileText, Maximize2, Minimize2, Search, X } from "lucide-react";
import { Money } from "@/components/Money";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { SidePanel, type PanelTab } from "@/components/check/SidePanel";
import { AiExplainPanel } from "@/components/check/AiExplainPanel";
import { ExcludedDocs } from "@/components/check/ExcludedDocs";
import { CheckConclusion } from "@/pages/CheckConclusion";
import { CheckActions } from "@/pages/CheckExceptions";
import { countByStatus } from "@/pages/Checks";
import type { Breakdown, Check as CheckData, Row, Status } from "@/data/mock";
import { cn } from "@/lib/utils";
import { formatMoney, sumMoney } from "@/components/money-format";

type Filter = "all" | Status;
export function CheckDetail({ check }: { check: CheckData }) {
  return <Reconciliation key={check.id} check={check} />;
}
function Reconciliation({ check }: { check: CheckData }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selection, setSelection] = useState(() => ({ rowId: (check.rows.find((row) => !row.service && row.status === "discrepancy") ?? check.rows[0])?.id ?? "", sourceIndex: 0 }));
  const [panelOpen, setPanelOpen] = useState(false);
  const [sourceExpanded, setSourceExpanded] = useState(false);
  const [tab, setTab] = useState<PanelTab>("source");
  const [focus, setFocus] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const n = countByStatus(check);
  const total = n.verified + n.discrepancy + n.unverified;
  const discrepancies = check.rows.filter((row) => !row.service && row.status === "discrepancy");
  const issueIndex = discrepancies.findIndex((row) => row.id === selection.rowId);
  const docById = useMemo(() => new Map(check.docs.map((doc) => [doc.id, doc])), [check.docs]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return check.rows.filter((row) => (filter === "all" || (!row.service && row.status === filter)) &&
      (!q || row.name.toLowerCase().includes(q) || row.sources.some((source) => `${docById.get(source.docId)?.title} ${docById.get(source.docId)?.number}`.toLowerCase().includes(q))));
  }, [check.rows, filter, query, docById]);
  const selected = rows.find((row) => row.id === selection.rowId) ?? null;
  useEffect(() => {
    if (rows.some((row) => row.id === selection.rowId)) return;
    const next = rows.find((row) => !row.service && row.status === "discrepancy") ?? rows[0];
    setSelection({ rowId: next?.id ?? "", sourceIndex: 0 });
    setPanelOpen(false);
  }, [rows, selection.rowId]);
  useEffect(() => {
    if (!focus) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setFocus(false); };
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = before; window.removeEventListener("keydown", close); };
  }, [focus]);
  useEffect(() => {
    if (!scrollTarget) return;
    const target = document.getElementById(`indicator-${scrollTarget}`);
    target?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
    setScrollTarget(null);
  }, [scrollTarget, rows]);
  function openProblem(rowId: string) {
    setQuery(""); setFilter("all");
    setSelection({ rowId, sourceIndex: 0 });
    setExpanded((previous) => new Set(previous).add(rowId));
    setScrollTarget(rowId);
  }
  function toggleRow(rowId: string) {
    setSelection({ rowId, sourceIndex: 0 });
    setExpanded((previous) => {
      const next = new Set(previous);
      next.has(rowId) ? next.delete(rowId) : next.add(rowId);
      return next;
    });
  }
  function openSource(rowId: string, sourceIndex: number, trigger: HTMLElement) {
    returnFocus.current = trigger;
    setSelection({ rowId, sourceIndex });
    setTab("source");
    setFocus(false);
    setSourceExpanded(false);
    setPanelOpen(true);
  }
  function moveIssue(direction: number) {
    const index = issueIndex < 0 ? (direction > 0 ? 0 : discrepancies.length - 1) : issueIndex + direction;
    const row = discrepancies[index];
    if (!row) return;
    setQuery(""); setFilter("discrepancy");
    setSelection({ rowId: row.id, sourceIndex: 0 });
    setExpanded((previous) => new Set(previous).add(row.id));
    setScrollTarget(row.id);
  }
  const filters: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "Все", count: total },
    { value: "discrepancy", label: "Расхождения", count: n.discrepancy },
    { value: "unverified", label: "Нет данных", count: n.unverified },
    { value: "verified", label: "Подтверждено", count: n.verified },
  ];
  return (
    <div className="reconciliation-page">
      <CheckConclusion check={check} onProblemSelect={openProblem}>
      <section className={cn("min-w-0 bg-card", focus && "reconcile-focus overflow-auto p-4")} aria-label="Рабочее место сверки"
        onKeyDown={(event) => {
          if ((event.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return;
          if (event.altKey && (event.key === "ArrowDown" || event.key === "ArrowUp")) { event.preventDefault(); moveIssue(event.key === "ArrowDown" ? 1 : -1); }
        }}>
        <div className="flex flex-wrap items-center justify-between gap-3 py-4">
          <h2 className="text-lg font-medium">Показатели отчёта</h2>
          <div className="issue-navigation">
            <span className={cn("issue-counter", !discrepancies.length && "no-issues")} aria-live="polite">
              {discrepancies.length ? <><AlertCircle size={14} />Расхождение <b>{issueIndex < 0 ? "—" : issueIndex + 1}</b> / {discrepancies.length}</> : <><CheckCheck size={15} />Расхождений нет</>}
            </span>
            <button aria-label="Предыдущее расхождение" title="Предыдущее расхождение · Alt + ↑" disabled={!discrepancies.length || issueIndex === 0} onClick={() => moveIssue(-1)}><ArrowUp size={16} /></button>
            <button aria-label="Следующее расхождение" title="Следующее расхождение · Alt + ↓" disabled={!discrepancies.length || issueIndex === discrepancies.length - 1} onClick={() => moveIssue(1)}><ArrowDown size={16} /></button>
            <button aria-label={focus ? "Выйти из полноэкранного режима" : "На весь экран"} aria-pressed={focus} onClick={() => setFocus((previous) => !previous)}>{focus ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
          </div>
        </div>
        <div className="reconcile-filters !mx-0" aria-label="Статус показателя">
          {filters.map((item) => <button key={item.value} aria-pressed={filter === item.value} className={cn(filter === item.value && "active", item.value)} onClick={() => setFilter(item.value)}>{item.label}<span>{item.count}</span></button>)}
        </div>
        <div className="reconcile-search !mx-0">
          <Search size={15} /><input aria-label="Поиск показателя или документа" placeholder="Показатель или номер документа…" value={query} onChange={(event) => setQuery(event.target.value)} />
          {query && <button aria-label="Очистить поиск" onClick={() => setQuery("")}><X size={14} /></button>}
        </div>
        <div className="overflow-x-auto">
          <table className="reconcile-table" aria-label="Показатели КФЗ">
            <thead><tr><th scope="col">Показатель</th><th scope="col">В отчёте, ₽</th><th scope="col">Документы, ₽</th><th scope="col">Разница, ₽</th></tr></thead>
            <tbody>{rows.map((row) => {
              const isExpanded = expanded.has(row.id);
              return <Fragment key={row.id}>
                <tr id={`indicator-${row.id}`} tabIndex={0} aria-expanded={isExpanded} aria-controls={`details-${row.id}`} data-selected={selected?.id === row.id} data-status={row.status}
                  className={cn("cursor-pointer", row.service && "service-row")}
                  onClick={() => toggleRow(row.id)}
                  onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); toggleRow(row.id); } }}>
                  <td><div className="indicator-name">
                    <ChevronRight size={14} className={cn("shrink-0", isExpanded && "rotate-90")} />
                    <span className="row-status" data-status={row.status} role="img" aria-label={row.status === "verified" ? "Подтверждено" : row.status === "discrepancy" ? "Расхождение" : "Нет данных"}>{row.status === "verified" ? <Check size={13} /> : row.status === "discrepancy" ? "!" : "−"}</span>
                    <button className="row-name-button" aria-pressed={selected?.id === row.id} aria-expanded={isExpanded} aria-controls={`details-${row.id}`} onClick={(event) => { event.stopPropagation(); toggleRow(row.id); }}>{row.name}</button>
                  </div><div className="indicator-meta"><span>{row.sources.length ? `${row.sources.length} док.` : "Нет источника"}</span>{row.manual && <span>Вручную</span>}{row.service && <span>Итоговая строка</span>}</div></td>
                  <td>{row.unit ? <span>{formatMoney(row.reported)}<small>{row.unit}</small></span> : <Money value={row.reported} />}</td>
                  <td className="expected-cell"><Money value={row.expected} />{row.partialNote && <small>Частично подтверждено</small>}</td>
                  <td className={cn("difference-cell", row.status === "discrepancy" && "delta-cell")}><Money value={row.delta} /></td>
                </tr>
                {isExpanded && <tr><td colSpan={4} className="!p-0 !text-left"><div id={`details-${row.id}`} role="region" aria-label={`Подробности: ${row.name}`} className="space-y-4 border-b bg-card p-5">
                  {row.breakdown && <section aria-label={`В том числе: ${row.name}`}>
                    <h3 className="mb-3 text-sm font-medium">В том числе — по КФЗ</h3>
                    <BreakdownList items={row.breakdown} />
                  </section>}
                  <RowDocuments row={row} check={check} onOpen={(index, trigger) => openSource(row.id, index, trigger)} />
                  {row.partialNote && <p className="text-sm text-muted-foreground">{row.partialNote}</p>}
                  {row.status !== "verified" && <>
                    <p className="text-sm"><strong>Категория: </strong>{row.category ?? "Недостаточно данных"}</p>
                    <AiExplainPanel row={row} />
                    <CheckActions check={check} row={row} showVariants={false} />
                  </>}
                </div></td></tr>}
              </Fragment>;
            })}</tbody>
          </table>
        </div>
        {!rows.length && <div className="reconcile-empty"><Search size={25} /><strong>Показатели не найдены</strong><p>Измените запрос или выберите другой статус.</p><button onClick={() => { setQuery(""); setFilter("all"); }}>Сбросить фильтры</button></div>}
        <div className="reconcile-left-footer"><span>Показателей: {rows.filter((row) => !row.service).length} из {total}</span><span>Суммы в рублях</span></div>
      </section>
      {check.excluded.length > 0 && <details className="excluded-disclosure"><summary>Исключённые документы <span>{check.excluded.length}</span><ChevronRight size={16} /></summary><ExcludedDocs check={check} /></details>}
      <Sheet open={panelOpen && !!selected} onOpenChange={setPanelOpen}>
        <SheetContent side="right" data-fullscreen={sourceExpanded} className="source-sheet flex w-full flex-col gap-0 !p-0 sm:max-w-[800px]" onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus.current?.focus(); }}>
          <div className="source-sheet-header">
            <SheetTitle>Источник документа</SheetTitle>
            <SheetDescription className="sr-only">Документ и подсветка выбранного значения</SheetDescription>
            <div className="source-sheet-header-actions">
              <Button variant="ghost" size="sm" aria-label={sourceExpanded ? "Свернуть источник в боковую панель" : "Развернуть источник на весь экран"} title={sourceExpanded ? "Свернуть источник в боковую панель" : "Развернуть источник на весь экран"} aria-pressed={sourceExpanded} onClick={() => setSourceExpanded((previous) => !previous)}>
                {sourceExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                <span className="hidden sm:inline">{sourceExpanded ? "Свернуть" : "На весь экран"}</span>
              </Button>
              <SheetClose asChild><Button variant="ghost" size="sm" aria-label="Вернуться к таблице">К таблице</Button></SheetClose>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <SidePanel check={check} row={selected} sourceIndex={selection.sourceIndex} onSourceChange={(sourceIndex) => setSelection((previous) => ({ ...previous, sourceIndex }))} tab={tab} onTab={setTab} />
          </div>
        </SheetContent>
      </Sheet>
      </CheckConclusion>
    </div>
  );
}

function BreakdownList({ items }: { items: Breakdown[] }) {
  return <dl className="space-y-3 border-l pl-4 text-sm">
    {items.map((item) => <div key={item.name}>
      <div className="flex items-start justify-between gap-4"><dt>{item.name}</dt><dd className="shrink-0"><Money value={item.reported} /> ₽</dd></div>
      {item.note && <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>}
      {item.children && <div className="mt-3"><BreakdownList items={item.children} /></div>}
    </div>)}
  </dl>;
}

function RowDocuments({ row, check, onOpen }: { row: Row; check: CheckData; onOpen: (index: number, trigger: HTMLElement) => void }) {
  const amounts = row.sources.map((source) => source.amount);
  const aggregated = row.sources.length > 1 && row.ruleId === "R-AGG-01" && amounts.every((amount): amount is string => amount !== null);
  return <div className="space-y-3">
    {!row.sources.length ? <p className="text-sm text-muted-foreground">Нет подтверждающего документа</p> : <ul className="divide-y rounded-lg border" aria-label={`Документы: ${row.name}`}>
      {row.sources.map((source, index) => {
        const doc = check.docs.find((item) => item.id === source.docId);
        return <li key={`${source.docId}-${index}`}><button className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-row-hover" aria-label={`Открыть документ: ${doc?.title ?? source.docId}`} onClick={(event) => onOpen(index, event.currentTarget)}>
          <FileText size={16} className="shrink-0" /><span className="min-w-0 flex-1"><span>{doc?.title ?? source.docId}</span><small className="block text-muted-foreground">№ {doc?.number ?? "—"} · {doc?.date ?? "—"} · Стр. {source.page}</small></span><span className="shrink-0 tabular-nums"><Money value={source.amount} /> ₽</span><ChevronRight size={14} />
        </button></li>;
      })}
    </ul>}
    {aggregated && <p className="text-sm tabular-nums" aria-label={`Сумма документов: ${row.name}`}>{amounts.map((amount) => formatMoney(amount!)).join(" + ")} = <strong>{formatMoney(sumMoney(amounts as string[]))} ₽</strong>{row.expected === null && <span className="block text-muted-foreground">Частичная сумма, подтверждение неполное</span>}</p>}
  </div>;
}
