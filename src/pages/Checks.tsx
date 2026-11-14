import { useState, type MouseEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { FileSearch, Files, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { demoJobName, DemoJobStatus, DemoJobTime } from "@/components/check/DemoHistory";
import { Input } from "@/components/ui/input";
import { type Check } from "@/data/mock";
import { useChecks } from "@/context/ChecksContext";
import { cn } from "@/lib/utils";
import { checkLocation } from "@/lib/check-location";
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
function matches(check: Check, counts: ReturnType<typeof countByStatus>, filter: Filter) {
  const incomplete = counts.unverified > 0 || check.conclusion === "Подтвердить полностью нельзя";
  if (filter === "all") return true;
  if (filter === "verified") return counts.verified > 0 && counts.discrepancy === 0 && !incomplete;
  if (filter === "unverified") return incomplete;
  return counts[filter] > 0;
}

export function Checks({ checks: override, archive = false }: { checks?: Check[]; archive?: boolean }) {
  const ctx = useChecks();
  const navigate = useNavigate();
  const allChecks = override ?? ctx.checks;
  const activeResults = allChecks.map(ctx.checkHistory.current).filter((version) => version.acceptedAt === null);
  const pendingResults = allChecks.flatMap((check) => ctx.checkHistory.versions(check)
    .filter((version) => version.number > 1 && version.readyAt > ctx.checkHistory.now)
    .map((pending) => ({ pending, current: ctx.checkHistory.current(check) })));
  const snapshots = archive
    ? allChecks.flatMap((check) => ctx.checkHistory.versions(check).filter((version) => version.acceptedAt !== null))
    : activeResults;
  const activeJobs = override || archive ? [] : ctx.demoQueue.entries.filter((job) => !job.complete && job.kind === "sample");
  const total = snapshots.length + activeJobs.length + (archive ? 0 : pendingResults.length);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const results = snapshots.map((version) => ({
    check: version.result, counts: countByStatus(version.result), version,
  }));
  const search = q.trim().toLocaleLowerCase("ru");
  const matchesSearch = (check: Check) =>
    `${checkName(check)} ${check.title} ${check.contract}`.toLocaleLowerCase("ru").includes(search);
  const entries = [
    ...results.filter(({ check, counts }) => matches(check, counts, filter) && matchesSearch(check))
      .map((result) => ({ id: result.check.id, time: result.version.createdAt, result })),
    ...activeJobs.filter((job) => filter === "all" && demoJobName(job).toLocaleLowerCase("ru").includes(search))
      .map((job) => ({ id: job.id, time: job.createdAt, job })),
    ...pendingResults.filter(({ pending }) => !archive && filter === "all" && matchesSearch(pending.result))
      .map(({ pending, current }) => ({ id: pending.result.id, time: pending.createdAt, pending, current })),
  ].sort((a, b) => b.time - a.time || a.id.localeCompare(b.id, "ru", { numeric: true }));

  function openRow(event: MouseEvent<HTMLTableRowElement>, id: Check["id"], version?: number) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
      event.shiftKey || event.altKey || (event.target as HTMLElement).closest(
        'a, button, input, select, textarea, label, [role="button"], [contenteditable="true"]',
      )) return;
    const { params, search } = checkLocation(id, version);
    void navigate({ to: "/checks/$id", params, ...(Object.keys(search).length > 0 && { search }) });
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
        <div className="checks-toolbar">
          <div className="search-wrap">
            <Search size={16} aria-hidden="true" />
            <Input aria-label="Поиск проверок" placeholder="Название или договор"
              value={q} onChange={(event) => setQ(event.target.value)} />
          </div>
          {!archive && (
            <div className="filter-tabs" aria-label="Фильтры проверок">
              {(Object.keys(labels) as Filter[]).map((item) => (
                <button key={item} type="button" onClick={() => setFilter(item)}
                  aria-pressed={filter === item} className={cn(filter === item && "active")}>
                  {labels[item]}
                  <span>{activeResults.filter((version) => matches(version.result, countByStatus(version.result), item)).length +
                    (item === "all" ? activeJobs.length + pendingResults.length : 0)}</span>
                </button>
              ))}
            </div>
          )}
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
                    <td className="font-medium">
                      {demoJobName(job)}
                      {job.kind === "sample" && <small className="block text-muted-foreground">Демонстрация</small>}
                    </td>
                    <td>
                      <DemoJobStatus status={job.status} failed={job.failed} />
                      {job.progress !== null && <span className="ml-1 text-xs tabular-nums">{job.progress}%</span>}
                    </td>
                    <td aria-label="Покрытие отсутствует">—</td>
                    <td>{job.documents}</td>
                    <td className="date-cell"><DemoJobTime createdAt={job.createdAt} /></td>
                  </tr>;
                }
                if ("pending" in entry) {
                  const { pending, current } = entry;
                  return <tr key={`pending:${entry.id}:${pending.number}`}>
                    <td>
                      <div className="font-medium">{checkName(pending.result)} · Версия {pending.number}</div>
                      <Link to="/checks/$id" {...checkLocation(entry.id, current.number)} className="text-xs underline">
                        Предыдущая версия
                      </Link>
                    </td>
                    <td><DemoJobStatus status="Обрабатывается" /></td>
                    <td aria-label="Покрытие отсутствует">—</td>
                    <td>{pending.result.docs.length}</td>
                    <td className="date-cell"><DemoJobTime createdAt={pending.createdAt} /></td>
                  </tr>;
                }
                const { check, counts, version } = entry.result;
                const versionNumber = archive || version.number > 1 ? version.number : undefined;
                const good = matches(check, counts, "verified");
                const bad = counts.discrepancy > 0;
                const status = good ? labels.verified : bad ? "Есть расхождения" :
                  matches(check, counts, "unverified") ? "Неполные данные" : "Нет показателей";
                const theme = good ? "mint" : bad ? "peach" : "lavender";
                return (
                  <tr key={`${check.id}:${version.number}`} className="check-result-row" onClick={(event) => openRow(event, check.id, versionNumber)}>
                    <td>
                      <div className="check-title-cell">
                        <span className={cn("file-symbol", theme)}><FileSearch size={21} aria-hidden="true" /></span>
                        <div>
                          <Link to="/checks/$id" {...checkLocation(check.id, versionNumber)}>{checkName(check)}</Link>
                          {check.contract && <small>Договор {check.contract}</small>}
                          {check.period && <small className="period">{check.period.replace("–", " — ")}</small>}
                        </div>
                      </div>
                    </td>
                    <td><span className={cn("result-chip", archive ? "accepted" : theme)}>{archive ? "Принят" : status}</span></td>
                    {check.rows.length > 0 ? <td>
                      <CoverageBar c={check.coverage} />
                      <small className="coverage-description">
                        {counts.verified} из {counts.verified + counts.discrepancy + counts.unverified} показателей
                      </small>
                    </td> : <td aria-label="Покрытие отсутствует">—</td>}
                    <td><span className="document-count"><Files size={15} aria-hidden="true" />{check.docs.length}</span></td>
                    <td className="date-cell">{check.createdAt === undefined ? check.date : <DemoJobTime createdAt={version.createdAt} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {entries.length === 0 && (
            <div className="empty-checks">
              <FileSearch size={32} aria-hidden="true" />
              <h3>{total ? "Проверки не найдены" : archive ? "Принятых проверок пока нет" : "Здесь появятся ваши проверки"}</h3>
              {total > 0 && (
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
