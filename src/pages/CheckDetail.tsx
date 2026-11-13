import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Bookmark,
  Check,
  CheckCheck,
  ChevronRight,
  FileText,
  Maximize2,
  Minimize2,
  Search,
  X,
} from "lucide-react";
import { Money } from "@/components/Money";
import { SidePanel, type PanelTab } from "@/components/check/SidePanel";
import { ExcludedDocs } from "@/components/check/ExcludedDocs";
import { countByStatus } from "@/pages/Checks";
import type { Check as CheckData, Status } from "@/data/mock";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/components/money-format";

type Filter = "all" | Status;
export function CheckDetail({ check }: { check: CheckData }) {
  return <Reconciliation key={check.id} check={check} />;
}
function Reconciliation({ check }: { check: CheckData }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selection, setSelection] = useState(() => ({
    rowId:
      (check.rows.find((r) => !r.service && r.status === "discrepancy") ?? check.rows[0])?.id ?? "",
    sourceIndex: 0,
  }));
  const [tab, setTab] = useState<PanelTab>("source");
  const [focus, setFocus] = useState(false);
  const selectedElement = useRef<HTMLTableRowElement>(null);
  const tableScroll = useRef<HTMLDivElement>(null);
  const n = countByStatus(check);
  const total = n.verified + n.discrepancy + n.unverified;
  const discrepancies = check.rows.filter((r) => !r.service && r.status === "discrepancy");
  const issueIndex = discrepancies.findIndex((r) => r.id === selection.rowId);
  const docById = useMemo(() => new Map(check.docs.map((d) => [d.id, d])), [check.docs]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return check.rows.filter(
      (r) =>
        (filter === "all" || (!r.service && r.status === filter)) &&
        (!q ||
          r.name.toLowerCase().includes(q) ||
          r.sources.some((s) =>
            `${docById.get(s.docId)?.title} ${docById.get(s.docId)?.number}`
              .toLowerCase()
              .includes(q),
          )),
    );
  }, [check.rows, filter, query, docById]);
  const selected = rows.find((r) => r.id === selection.rowId) ?? null;
  const select = (rowId: string, sourceIndex = 0) => {
    setSelection({ rowId, sourceIndex });
    setTab("source");
  };
  useEffect(() => {
    if (!rows.some((r) => r.id === selection.rowId)) {
      const next = rows.find((r) => !r.service && r.status === "discrepancy") ?? rows[0];
      setSelection({ rowId: next?.id ?? "", sourceIndex: 0 });
        setTab("source");
    }
  }, [rows, selection.rowId]);
  useEffect(() => {
    const row = selectedElement.current;
    const box = tableScroll.current;
    if (!row || !box) return;
    const rect = row.getBoundingClientRect();
    const bounds = box.getBoundingClientRect();
    if (rect.top < bounds.top + 42 || rect.bottom > bounds.bottom)
      box.scrollTo({ top: box.scrollTop + rect.top - bounds.top - 56, behavior: "smooth" });
  }, [selection.rowId, filter, query]);
  useEffect(() => {
    if (!focus) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocus(false);
    };
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = before;
      window.removeEventListener("keydown", close);
    };
  }, [focus]);
  function moveIssue(direction: number) {
    const index =
      issueIndex < 0 ? (direction > 0 ? 0 : discrepancies.length - 1) : issueIndex + direction;
    const row = discrepancies[index];
    if (!row) return;
    setQuery("");
    setFilter("discrepancy");
    select(row.id);
  }
  const filters: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "Все", count: total },
    { value: "discrepancy", label: "Расхождения", count: n.discrepancy },
    { value: "unverified", label: "Нет данных", count: n.unverified },
    { value: "verified", label: "Подтверждено", count: n.verified },
  ];
  return (
    <div className="reconciliation-page">
      <div className="reconcile-summary">
        <div>
          <span className="summary-dot" />
          Подтверждено <strong>{check.coverage.verifiedPct.replace(".", ",")}%</strong> суммы отчёта
        </div>
        <div className="mini-coverage">
          <i style={{ width: `${check.coverage.verifiedPct}%` }} />
          <i style={{ width: `${check.coverage.discrepancyPct}%` }} />
          <i style={{ width: `${check.coverage.unverifiedPct}%` }} />
        </div>
        <span>
          Всего <Money value={check.coverage.totalSum} /> ₽
        </span>
        <span className="summary-docs">
          <FileText size={14} />
          {check.docs.length} документов
        </span>
      </div>
      <section
        className={cn("reconciliation", focus && "reconcile-focus")}
        aria-label="Рабочее место сверки"
        onKeyDown={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
          if (e.altKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            moveIssue(e.key === "ArrowDown" ? 1 : -1);
          }
        }}
      >
        <div className="reconcile-commandbar">
          <div className="reconcile-command-title">
            <span className="reconcile-icon">
              <FileText size={17} />
            </span>
            <strong>Сверка с документами</strong>
            <span className="reconcile-contract">{check.contract}</span>
          </div>
          <div className="issue-navigation">
            <span
              className={cn("issue-counter", !discrepancies.length && "no-issues")}
              aria-live="polite"
            >
              {discrepancies.length ? (
                <>
                  <AlertCircle size={14} />
                  Расхождение <b>{issueIndex < 0 ? "—" : issueIndex + 1}</b> /{" "}
                  {discrepancies.length}
                </>
              ) : (
                <>
                  <CheckCheck size={15} />
                  Расхождений нет
                </>
              )}
            </span>
            <button
              aria-label="Предыдущее расхождение"
              title="Предыдущее расхождение · Alt + ↑"
              disabled={!discrepancies.length || issueIndex === 0}
              onClick={() => moveIssue(-1)}
            >
              <ArrowUp size={16} />
            </button>
            <button
              aria-label="Следующее расхождение"
              title="Следующее расхождение · Alt + ↓"
              disabled={!discrepancies.length || issueIndex === discrepancies.length - 1}
              onClick={() => moveIssue(1)}
            >
              <ArrowDown size={16} />
            </button>
            <span className="command-separator" />
            <button
              aria-label={focus ? "Выйти из полноэкранного режима" : "На весь экран"}
              aria-pressed={focus}
              title={focus ? "Свернуть · Esc" : "На весь экран"}
              onClick={() => setFocus((v) => !v)}
            >
              {focus ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
        <div className="reconcile-panes">
          <div className="reconcile-left">
            <div className="reconcile-left-header">
              <div>
                <h2>Показатели отчёта</h2>
                <span>Выберите сумму, чтобы открыть источник</span>
              </div>
              <span className="record-count">{total}</span>
            </div>
            <div className="reconcile-table-content">
              <div className="reconcile-filters" aria-label="Статус показателя">
                {filters.map((f) => (
                  <button
                    key={f.value}
                    aria-pressed={filter === f.value}
                    className={cn(filter === f.value && "active", f.value)}
                    onClick={() => setFilter(f.value)}
                  >
                    {f.label}
                    <span>{f.count}</span>
                  </button>
                ))}
              </div>
              <div className="reconcile-search">
                <Search size={15} />
                <input
                  aria-label="Поиск показателя или документа"
                  placeholder="Показатель или номер документа…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button aria-label="Очистить поиск" onClick={() => setQuery("")}>
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="reconcile-table-scroll" ref={tableScroll}>
                <table className="reconcile-table">
                  <thead>
                    <tr>
                      <th scope="col">Показатель</th>
                      <th scope="col">
                        <span className="column-label">
                          В отчёте, ₽<i className="column-dot reported-dot" />
                        </span>
                      </th>
                      <th scope="col">
                        <span className="column-label">
                          Документы, ₽<i className="column-dot expected-dot" />
                        </span>
                      </th>
                      <th scope="col">
                        <span className="column-label">
                          Разница, ₽<i className="column-dot delta-dot" />
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const isSelected = selected?.id === r.id;
                      const isExpanded = expanded.has(r.id);
                      const multi = r.sources.length > 1;
                      return (
                        <Fragment key={r.id}>
                          <tr
                            ref={isSelected ? selectedElement : undefined}
                            data-selected={isSelected}
                            data-status={r.status}
                            className={cn(r.service && "service-row")}
                            onClick={() => select(r.id)}
                          >
                            <td>
                              <div className="indicator-name">
                                <span
                                  className="row-status"
                                  data-status={r.status}
                                  role="img"
                                  aria-label={
                                    r.status === "verified"
                                      ? "Подтверждено"
                                      : r.status === "discrepancy"
                                        ? "Расхождение"
                                        : "Нет данных"
                                  }
                                  title={
                                    r.status === "verified"
                                      ? "Подтверждено"
                                      : r.status === "discrepancy"
                                        ? "Расхождение"
                                        : "Нет данных"
                                  }
                                >
                                  {r.status === "verified" ? (
                                    <Check size={13} />
                                  ) : r.status === "discrepancy" ? (
                                    <span>!</span>
                                  ) : (
                                    <span>−</span>
                                  )}
                                </span>
                                <button
                                  className="row-name-button"
                                  aria-pressed={isSelected}
                                  onClick={() => select(r.id)}
                                >
                                  {r.name}
                                </button>
                              </div>
                              <div className="indicator-meta">
                                {r.sources.length > 0 && (
                                  <button
                                    className="source-count"
                                    aria-expanded={multi ? isExpanded : undefined}
                                    aria-label={
                                      multi
                                        ? `${isExpanded ? "Скрыть" : "Показать"} источники: ${r.name}`
                                        : `Открыть документ: ${r.name}`
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      select(r.id);
                                      if (multi)
                                        setExpanded((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(r.id)) next.delete(r.id);
                                          else next.add(r.id);
                                          return next;
                                        });
                                    }}
                                  >
                                    {multi ? (
                                      <ChevronRight
                                        size={12}
                                        className={cn(isExpanded && "rotate-90")}
                                      />
                                    ) : (
                                      <FileText size={12} />
                                    )}
                                    {r.sources.length} док.
                                  </button>
                                )}
                                {r.manual && <span>Вручную</span>}
                                {r.service && <span>Итоговая строка</span>}
                                {!r.sources.length && !r.service && <span>Нет источника</span>}
                              </div>
                            </td>
                            <td>
                              {r.unit ? (
                                <span>
                                  {r.reported}
                                  <small>{r.unit}</small>
                                </span>
                              ) : (
                                <Money value={r.reported} />
                              )}
                            </td>
                            <td className="expected-cell">
                              <button
                                className="source-amount-button"
                                aria-label={`Открыть источник: ${r.name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  select(r.id);
                                }}
                              >
                                <Money value={r.expected} />
                                {r.sources.length > 0 && (
                                  <Bookmark
                                    className="amount-bookmark"
                                    size={18}
                                    fill="currentColor"
                                    strokeWidth={0}
                                  />
                                )}
                              </button>
                              {r.partialNote && <small>Частично подтверждено</small>}
                            </td>
                            <td
                              className={cn(
                                "difference-cell",
                                r.status === "discrepancy" && "delta-cell",
                              )}
                            >
                              <Money value={r.delta} />
                            </td>
                          </tr>
                          {multi &&
                            isExpanded &&
                            r.sources.map((s, i) => (
                              <tr className="source-subrow" key={`${s.docId}-${i}`}>
                                <td colSpan={4}>
                                  <button
                                    aria-pressed={isSelected && selection.sourceIndex === i}
                                    onClick={() => select(r.id, i)}
                                  >
                                    <FileText size={14} />
                                    <span>
                                      {docById.get(s.docId)?.title ?? s.docId}
                                      <small>Страница {s.page}</small>
                                    </span>
                                    <b>{s.amount ? formatMoney(s.amount) : "—"}</b>
                                    <ChevronRight size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
                {!rows.length && (
                  <div className="reconcile-empty">
                    <Search size={25} />
                    <strong>Показатели не найдены</strong>
                    <p>Измените запрос или выберите другой статус.</p>
                    <button
                      onClick={() => {
                        setQuery("");
                        setFilter("all");
                      }}
                    >
                      Сбросить фильтры
                    </button>
                  </div>
                )}
              </div>
              <div className="reconcile-left-footer">
                <span>
                  Показателей: {rows.filter((r) => !r.service).length} из {total}
                </span>
                <span>Суммы в рублях</span>
              </div>
            </div>
          </div>
          <aside className="reconcile-right" aria-label="Документ и подтверждение">
            <SidePanel
              check={check}
              row={selected}
              sourceIndex={selection.sourceIndex}
              onSourceChange={(index) => select(selection.rowId, index)}
              tab={tab}
              onTab={setTab}
            />
          </aside>
        </div>
        <div className="reconcile-bottom">
          <span>
            <span className="link-dot" />
            Каждая сумма связана с её источником
          </span>
          <span>
            Между расхождениями <kbd>Alt</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd>
          </span>
        </div>
      </section>
      {check.excluded.length > 0 && (
        <details className="excluded-disclosure">
          <summary>
            Исключённые документы <span>{check.excluded.length}</span>
            <ChevronRight size={16} />
          </summary>
          <ExcludedDocs check={check} />
        </details>
      )}
    </div>
  );
}
