import { useState, type MouseEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { FileSearch, Files, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { demoJobName, DemoJobStatus, DemoJobTime } from "@/components/check/DemoHistory";
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
function matches(counts: ReturnType<typeof countByStatus>, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "verified") return counts.verified > 0 && counts.discrepancy === 0 && counts.unverified === 0;
  return counts[filter] > 0;
}

function checkTimestamp(check: Check) {
  const [day, month, year] = check.date.split(".").map(Number);
  return Date.UTC(year!, month! - 1, day!);
}

export function Checks({ checks: override, archive = false }: { checks?: Check[]; archive?: boolean }) {
  const ctx = useChecks();
  const navigate = useNavigate();
  const allChecks = override ?? ctx.checks;
  const [acceptedFilter, setAcceptedFilter] = useState(false);
  const showAccepted = archive || acceptedFilter;
  const checks = allChecks.filter((check) => (ctx.checkHistory.current(check).acceptedAt !== null) === showAccepted);
  const jobs = override || showAccepted ? [] : ctx.demoQueue.entries;
  const acceptedCount = allChecks.filter((check) => ctx.checkHistory.current(check).acceptedAt !== null).length;
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const results = checks.map((check) => ({ check, counts: countByStatus(check) }));
  const allSynthetic = checks.length > 0 && checks.every((check) => check.synthetic);
  const search = q.trim().toLocaleLowerCase("ru");
  const entries = [
    ...results.filter(({ check, counts }) => matches(counts, filter) &&
      `${checkName(check)} ${check.title} ${check.contract}`.toLocaleLowerCase("ru").includes(search)
    ).map((result) => ({ id: result.check.id, time: checkTimestamp(result.check), result })),
    ...jobs.filter((job) => filter === "all" && demoJobName(job.id).toLocaleLowerCase("ru").includes(search))
      .map((job) => ({ id: job.id, time: job.createdAt, job })),
  ].sort((a, b) => b.time - a.time || a.id.localeCompare(b.id, "ru", { numeric: true }));

  function openRow(event: MouseEvent<HTMLTableRowElement>, id: Check["id"]) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
      event.shiftKey || event.altKey || (event.target as HTMLElement).closest(
        'a, button, input, select, textarea, label, [role="button"], [contenteditable="true"]',
      )) return;
    void navigate({ to: "/checks/$id", params: { id } });
  }

  return (
    <div className="overview-page">
      <div className="page-heading">
        <div>
          <h1>{archive ? "Архив проверок" : "Проверки"}</h1>
          <p>{archive ? "Принятые проверки и их документы." : "Сверяйте отчёты с первичными документами. Разбирайте только то, что требует внимания."}</p>
        </div>
      </div>
      <div className="checks-section">
        <div className="section-heading">
          <h2>{showAccepted ? "Принятые проверки" : "Ваши проверки"} <span>{checks.length + jobs.length}</span></h2>
          {allSynthetic && <span className="text-xs text-muted-foreground">Демо-режим · синтетические результаты</span>}
        </div>
        <div className="checks-toolbar">
          <div className="filter-tabs" aria-label="Фильтры проверок">
            {!archive && (Object.keys(labels) as Filter[]).map((item) => (
              <button key={item} type="button" onClick={() => { setAcceptedFilter(false); setFilter(item); }}
                aria-pressed={!showAccepted && filter === item} className={cn(!showAccepted && filter === item && "active")}>
                {labels[item]}
                <span>{allChecks.filter((check) => ctx.checkHistory.current(check).acceptedAt === null && matches(countByStatus(check), item)).length +
                  (item === "all" && !override ? ctx.demoQueue.entries.length : 0)}</span>
              </button>
            ))}
            <button type="button" className={cn(showAccepted && "active")} aria-pressed={showAccepted}
              onClick={() => { setAcceptedFilter(true); setFilter("all"); }}>
              Приняты<span>{acceptedCount}</span>
            </button>
          </div>
          <div className="toolbar-inputs">
            <div className="search-wrap">
              <Search size={16} aria-hidden="true" />
              <Input aria-label="Поиск проверок" placeholder="Название или договор"
                value={q} onChange={(event) => setQ(event.target.value)} />
            </div>
          </div>
        </div>
        <div className="checks-table-wrap">
          <table className="checks-table">
            <thead>
              <tr>
                <th scope="col">Проверка</th>
                <th scope="col">Результат</th>
                <th scope="col">Покрытие по сумме</th>
                <th scope="col">Документы</th>
                <th scope="col" aria-sort="descending">Дата</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                if ("job" in entry) {
                  const { job } = entry;
                  return <tr key={`job:${job.id}`}>
                    <td className="break-all font-medium">{demoJobName(job.id)}</td>
                    <td><DemoJobStatus status={job.status} /></td>
                    <td aria-label="Покрытие отсутствует">—</td>
                    <td>{job.documents}</td>
                    <td className="date-cell"><DemoJobTime createdAt={job.createdAt} /></td>
                  </tr>;
                }
                const { check, counts } = entry.result;
                const good = matches(counts, "verified");
                const bad = counts.discrepancy > 0;
                const status = good ? "Подтверждено" : bad ? "Есть расхождения" :
                  counts.unverified > 0 ? "Неполные данные" : "Нет показателей";
                const theme = good ? "mint" : bad ? "peach" : "lavender";
                return (
                  <tr key={check.id} className="check-result-row" onClick={(event) => openRow(event, check.id)}>
                    <td>
                      <div className="check-title-cell">
                        <span className={cn("file-symbol", theme)}><FileSearch size={21} aria-hidden="true" /></span>
                        <div>
                          <Link to="/checks/$id" params={{ id: check.id }}>{checkName(check)}</Link>
                          <small>Договор {check.contract}</small>
                          <small className="period">{check.period.replace("–", " — ")}</small>
                          {!allSynthetic && check.synthetic && <small>Синтетика</small>}
                        </div>
                      </div>
                    </td>
                    <td><span className={cn("result-chip", theme)}><i />{status}</span></td>
                    <td>
                      <CoverageBar c={check.coverage} />
                      <small className="coverage-description">
                        {counts.verified} из {counts.verified + counts.discrepancy + counts.unverified} показателей
                      </small>
                    </td>
                    <td><span className="document-count"><Files size={15} aria-hidden="true" />{check.docs.length}</span></td>
                    <td className="date-cell">{check.date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {entries.length === 0 && (
            <div className="empty-checks">
              <FileSearch size={32} aria-hidden="true" />
              <h3>{checks.length || jobs.length ? "Проверки не найдены" : showAccepted ? "Принятых проверок пока нет" : "Здесь появятся ваши проверки"}</h3>
              {(checks.length > 0 || jobs.length > 0) && (
                <Button variant="outline" onClick={() => { setQ(""); setFilter("all"); }}>
                  Сбросить фильтры
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
