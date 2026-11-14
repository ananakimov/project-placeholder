import { useId } from "react";
import { FileSearch } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { DemoJobEntry } from "@/context/demo-queue";
import { useChecks } from "@/context/ChecksContext";
import { checkLocation } from "@/lib/check-location";
import { checkName } from "@/lib/check-name";
import { cn } from "@/lib/utils";

const dateTime = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" });

export function demoJobName(job: Pick<DemoJobEntry, "id" | "kind" | "result">) {
  if (job.kind === "sample") return checkName(job.result);
  return `Проверка КФЗ · ${job.id.replace(/^demo-/, "").slice(0, 8)}`;
}

export function DemoJobTime({ createdAt }: { createdAt: number }) {
  return <time dateTime={new Date(createdAt).toISOString()}>{dateTime.format(createdAt)}</time>;
}

export function DemoJobStatus({ status, failed, complete }: { status: string; failed?: boolean; complete?: boolean }) {
  return (
    <span className={cn("result-chip", failed ? "peach" : complete ? "mint" : "lavender")}>
      {status}
    </span>
  );
}

export function DemoHistory() {
  const { demoQueue } = useChecks();
  const heading = useId();
  const visibleJobs = demoQueue.entries.filter((job) => !job.complete || job.failed || job.result);
  return (
    <section className="upload-card queue-card" aria-labelledby={heading}>
      <header className="upload-card-header">
        <div>
          <h2 id={heading}>Очередь проверок</h2>
          <p>Демонстрация обработки доступна для примера. Для ваших файлов требуется подключение к серверу.</p>
        </div>
      </header>
      {demoQueue.storageError && <p className="upload-validation" role="status">Очередь доступна до перезагрузки. Сохранить её в браузере не удалось.</p>}
      {!demoQueue.ready && <p className="text-sm text-muted-foreground">Загрузка очереди…</p>}
      {demoQueue.ready && visibleJobs.length === 0 &&
        <p className="text-sm text-muted-foreground">В очереди пока нет проверок.</p>}
      <ul className="queue-list">
        {visibleJobs.map((job) => <JobItem key={job.id} job={job} />)}
      </ul>
    </section>
  );
}

function JobItem({ job }: { job: DemoJobEntry }) {
  const name = demoJobName(job);
  const titleId = useId();
  const ready = job.complete && !!job.result;
  const content = <>
    <div className="queue-job-heading">
      <div className="queue-job-title">
        <span className="file-symbol"><FileSearch size={21} aria-hidden /></span>
        <div>
          <h3 id={titleId}>{name}</h3>
          <div className="queue-job-meta">
            <span>Файлов: {job.documents}</span>
            <DemoJobTime createdAt={job.createdAt} />
          </div>
        </div>
      </div>
      <div className="queue-job-state">
        <span role="status">
          <DemoJobStatus status={job.status} failed={job.failed} complete={ready} />
        </span>
        {job.progress !== null && <span className="tabular-nums">{job.progress}%</span>}
      </div>
    </div>
    {job.progress !== null && (
      <div className="run-progress queue-progress" role="progressbar" aria-label={name} aria-valuenow={job.progress}
        data-complete={ready}>
        <span style={{ width: `${job.progress}%` }} />
      </div>
    )}
    {job.failed && <p className="upload-validation">В комплекте есть пустой файл. Добавьте документ ненулевого размера.</p>}
  </>;
  return <li>
    {ready
      ? <Link className="queue-job queue-job-link" aria-labelledby={titleId} to="/checks/$id" {...checkLocation(job.id)}>{content}</Link>
      : <div className="queue-job">{content}</div>}
  </li>;
}
