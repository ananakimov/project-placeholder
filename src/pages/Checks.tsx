import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileSearch,
  Files,
  Plus,
  Search,
  SlidersHorizontal,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkDate, type Check } from "@/data/mock";
import { useChecks } from "@/context/ChecksContext";
import { cn } from "@/lib/utils";
export function countByStatus(c: Check) {
  const rows = c.rows.filter((r) => !r.service);
  return {
    verified: rows.filter((r) => r.status === "verified").length,
    discrepancy: rows.filter((r) => r.status === "discrepancy").length,
    unverified: rows.filter((r) => r.status === "unverified").length,
  };
}
const labels = { all: "Все проверки", attention: "Требуют внимания", verified: "Без расхождений" };
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
  const attention = checks.filter((c) => c.conclusion !== "Достоверен");
  const filtered = useMemo(
    () =>
      checks
        .filter(
          (c) =>
            (!q.trim() ||
              `${c.title} ${c.contract}`.toLowerCase().includes(q.trim().toLowerCase())) &&
            (filter === "all" ||
              (filter === "verified"
                ? c.conclusion === "Достоверен"
                : c.conclusion !== "Достоверен")),
        )
        .sort((a, b) =>
          sort === "name"
            ? a.title.localeCompare(b.title, "ru")
            : checkDate(b)
                .split(".")
                .reverse()
                .join("")
                .localeCompare(checkDate(a).split(".").reverse().join("")),
        ),
    [checks, q, filter, sort],
  );
  const documents = checks.reduce((s, c) => s + c.docs.length, 0);
  const verified = checks.filter((c) => c.conclusion === "Достоверен").length;
  return (
    <div className="overview-page">
      <div className="page-heading">
        <div>
          <h1>Проверки</h1>
          <p>
            Сверяйте отчёты с первичными документами. Разбирайте только то, что требует внимания.
          </p>
        </div>
        <Button asChild className="new-check-button">
          <Link to="/checks/new">
            <Plus size={17} />
            Новая проверка
          </Link>
        </Button>
      </div>
      <div className="overview-stats">
        <button
          onClick={() => setFilter("all")}
          className={cn("stat-card", filter === "all" && "stat-active")}
        >
          <span>
            Всего проверок
            <ClipboardList size={18} />
          </span>
          <strong>{checks.length.toString().padStart(2, "0")}</strong>
          <small>В рабочем пространстве</small>
        </button>
        <button
          onClick={() => setFilter("attention")}
          className={cn("stat-card stat-peach", filter === "attention" && "stat-active")}
        >
          <span>
            Требуют внимания
            <AlertCircle size={18} />
          </span>
          <strong>
            {attention.length.toString().padStart(2, "0")}
            <ArrowUpRight size={22} />
          </strong>
          <small>Расхождения или неполные данные</small>
        </button>
        <button
          onClick={() => setFilter("verified")}
          className={cn("stat-card stat-mint", filter === "verified" && "stat-active")}
        >
          <span>
            Без расхождений
            <CheckCircle2 size={18} />
          </span>
          <strong>{verified.toString().padStart(2, "0")}</strong>
          <small>Все суммы подтверждены</small>
        </button>
        <div className="stat-card stat-neutral">
          <span>
            Документов
            <Files size={18} />
          </span>
          <strong>{documents}</strong>
          <small>В составе всех проверок</small>
        </div>
      </div>
      <div className="checks-section">
        <div className="section-heading">
          <h2>
            Ваши проверки <span>{checks.length}</span>
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
                  {f === "all" ? checks.length : f === "attention" ? attention.length : verified}
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
            <button
              className="sort-button"
              onClick={() => setSort((s) => (s === "recent" ? "name" : "recent"))}
              aria-label={sort === "recent" ? "Сортировать по названию" : "Сортировать по дате"}
              title={sort === "recent" ? "По дате · изменить" : "По названию · изменить"}
            >
              <SlidersHorizontal size={17} />
            </button>
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
                <th>
                  <button onClick={() => setSort((s) => (s === "recent" ? "name" : "recent"))}>
                    Дата <ArrowDown size={12} />
                  </button>
                </th>
                <th aria-label="Открыть" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const n = countByStatus(c);
                const good = c.conclusion === "Достоверен";
                const bad = c.conclusion === "Недостоверен";
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
                            {c.title.split(",")[0]}
                            <ArrowUpRight size={13} />
                          </Link>
                          <small>Договор {c.contract}</small>
                          <small className="period">{c.period.replace("–", " — ")}</small>
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
                        {good ? "Подтверждено" : bad ? "Есть расхождения" : "Неполные данные"}
                      </span>
                      <small className="result-detail">
                        {c.state === "Подписано"
                          ? "Заключение подписано"
                          : bad
                            ? `${n.discrepancy} расхожд. · ${n.unverified} не проверено`
                            : good
                              ? "Можно перейти к заключению"
                              : `${n.unverified} показателей без подтверждения`}
                      </small>
                    </td>
                    <td className="date-cell">{checkDate(c)}</td>
                    <td>
                      <Link
                        to="/checks/$id"
                        params={{ id: c.id }}
                        className="row-open"
                        aria-label={`Открыть ${c.title}`}
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
              <p>
                {checks.length
                  ? "Попробуйте другой запрос или сбросьте фильтры."
                  : "Добавьте отчёт КФЗ и первичные документы."}
              </p>
              {checks.length ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQ("");
                    setFilter("all");
                  }}
                >
                  Сбросить фильтры
                </Button>
              ) : (
                <Button asChild>
                  <Link to="/checks/new">Новая проверка</Link>
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="table-footer">
          <span>
            Показано {filtered.length} из {checks.length} проверок
          </span>
        </div>
      </div>
    </div>
  );
}
