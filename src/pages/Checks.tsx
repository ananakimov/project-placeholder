import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  ChevronRight,
  FileSearch,
  Files,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoHistory } from "@/components/check/DemoHistory";
import { Input } from "@/components/ui/input";
import { type Check } from "@/data/mock";
import { useChecks } from "@/context/ChecksContext";
import { cn } from "@/lib/utils";
import { checkName } from "@/lib/check-name";
export function countByStatus(c: Check) {
  const rows = c.rows.filter((r) => !r.service && !r.nested);
  return {
    verified: rows.filter((r) => r.status === "verified").length,
    discrepancy: rows.filter((r) => r.status === "discrepancy").length,
    unverified: rows.filter((r) => r.status === "unverified").length,
  };
}
const labels = { all: "Все", discrepancy: "Есть расхождения", unverified: "Неполные данные", verified: "Без расхождений" };
type Filter = keyof typeof labels;
function CoverageBar({ c }: { c: Check["coverage"] }) {
  return (
    <div className="coverage-cell">
      <span>
        {c.verifiedPct.replace(".", ",")}
        <small>%</small>
      </span>
      <div className="coverage-track" aria-label={`Подтверждено ${c.verifiedPct}% суммы`}>
        <i style={{ width: `${c.verifiedPct}%` }} />
        <i className="coverage-discrepancy" style={{ width: `${c.discrepancyPct}%` }} />
        <i className="coverage-unknown" style={{ width: `${c.unverifiedPct}%` }} />
      </div>
    </div>
  );
}
export function Checks({ checks: override }: { checks?: Check[] }) {
  const ctx = useChecks();
  const checks = override ?? ctx.checks;
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const results = useMemo(() => checks.map((check) => ({ check, counts: countByStatus(check) })), [checks]);

  function matches(counts: ReturnType<typeof countByStatus>, value: Filter) {
    if (value === "all") return true;
    if (value === "verified") return counts.verified > 0 && counts.discrepancy === 0 && counts.unverified === 0;
    return counts[value] > 0;
  }

  const search = q.trim().toLowerCase();
  const filtered = results.filter(({ check, counts }) => matches(counts, filter) &&
    `${checkName(check)} ${check.title} ${check.contract}`.toLowerCase().includes(search));
  filtered.sort(({ check: a }, { check: b }) => sort === "name"
    ? checkName(a).localeCompare(checkName(b), "ru", { numeric: true })
    : b.date.split(".").reverse().join("").localeCompare(a.date.split(".").reverse().join("")),
  );
  return (
    <div className="overview-page">
      <div className="page-heading">
        <div>
          <h1>Проверки</h1>
          <p>
            Сверяйте отчёты с первичными документами. Разбирайте только то, что требует внимания.
          </p>
        </div>
      </div>
      <div className="checks-section">
        <div className="section-heading">
          <h2>
            Готовые примеры <span>{checks.length}</span>
          </h2>
          <div className="legend">
            <i />
            Подтверждено
            <i />
            Расхождения
            <i />
            Нет данных
          </div>
        </div>
        <div className="checks-toolbar">
          <div className="filter-tabs" aria-label="Фильтры проверок">
            {(Object.keys(labels) as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={cn(filter === f && "active")}
              >
                {labels[f]}
                <span>
                  {results.filter(({ counts }) => matches(counts, f)).length}
                </span>
              </button>
            ))}
          </div>
          <div className="toolbar-inputs">
            <div className="search-wrap">
              <Search size={16} />
              <Input
                aria-label="Поиск проверок"
                placeholder="Название или договор"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <label className="checks-sort">
              Сортировка
              <select value={sort} onChange={(event) => setSort(event.target.value === "name" ? "name" : "recent")}>
                <option value="recent">Сначала новые</option>
                <option value="name">По названию</option>
              </select>
            </label>
          </div>
        </div>
        <div className="checks-table-wrap">
          <table className="checks-table">
            <thead>
              <tr>
                <th>Проверка</th>
                <th>Документы</th>
                <th>Покрытие по сумме</th>
                <th>Результат</th>
                <th aria-sort={sort === "recent" ? "descending" : "none"}>Дата</th>
                <th aria-label="Открыть" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ check: c, counts: n }) => {
                const good = matches(n, "verified");
                const bad = n.discrepancy > 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="check-title-cell">
                        <span
                          className={cn("file-symbol", good ? "mint" : bad ? "peach" : "lavender")}
                        >
                          <FileSearch size={21} />
                        </span>
                        <div>
                          <Link to="/checks/$id" params={{ id: c.id }}>
                            {checkName(c)}
                            <ArrowUpRight size={13} />
                          </Link>
                          <small>Договор {c.contract}</small>
                          <small className="period">{c.period.replace("–", " — ")}</small>
                          {c.synthetic && <small>Синтетика</small>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="document-count">
                        <Files size={15} />
                        {c.docs.length} файлов
                      </span>
                    </td>
                    <td>
                      <CoverageBar c={c.coverage} />
                      <small className="coverage-description">
                        {n.verified} из {n.verified + n.discrepancy + n.unverified} показателей
                      </small>
                    </td>
                    <td>
                      <span
                        className={cn("result-chip", good ? "mint" : bad ? "peach" : "lavender")}
                      >
                        <i />
                        {good ? "Подтверждено" : bad ? "Есть расхождения" : n.unverified > 0 ? "Неполные данные" : "Нет показателей"}
                      </span>
                      <small className="result-detail">
                        {c.state === "Подписано"
                          ? "Заключение подписано"
                          : bad
                            ? `${n.discrepancy} расхожд. · ${n.unverified} не проверено`
                            : good
                              ? "Можно перейти к заключению"
                              : n.unverified > 0 ? `${n.unverified} показателей без подтверждения` : ""}
                      </small>
                    </td>
                    <td className="date-cell">{c.date}</td>
                    <td>
                      <Link
                        to="/checks/$id"
                        params={{ id: c.id }}
                        className="row-open"
                        aria-label={`Открыть ${checkName(c)}`}
                      >
                        <ChevronRight size={18} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && (
            <div className="empty-checks">
              <FileSearch size={32} />
              <h3>{checks.length ? "Проверки не найдены" : "Здесь появятся ваши проверки"}</h3>
              {checks.length > 0 && <p>Попробуйте другой запрос или сбросьте фильтры.</p>}
              {checks.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQ("");
                    setFilter("all");
                  }}
                >
                  Сбросить фильтры
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      {filter === "all" && <DemoHistory search={q} />}
    </div>
  );
}
