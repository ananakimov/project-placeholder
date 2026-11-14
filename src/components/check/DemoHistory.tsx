import { useId } from "react";
import { ArrowUpRight, Check, Files, TriangleAlert } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { DEMO_STAGES, type DemoJobEntry } from "@/context/demo-queue";
import { useChecks } from "@/context/ChecksContext";
import { checkLocation } from "@/lib/check-location";
import { checkName } from "@/lib/check-name";
import { Button } from "@/components/ui/button";
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
      <i />{status}
    </span>
  );
}

export function DemoHistory() {
  const { demoQueue } = useChecks();
  const heading = useId();
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
      {demoQueue.ready && demoQueue.entries.length === 0 &&
        <p className="text-sm text-muted-foreground">В очереди пока нет проверок.</p>}
      <ul className="queue-list">
        {demoQueue.entries.map((job) => <JobItem key={job.id} job={job} />)}
      </ul>
    </section>
  );
}

function JobItem({ job }: { job: DemoJobEntry }) {
  const name = demoJobName(job);
  return (
    <li className="queue-job">
      <div className="queue-job-heading">
        <div className="queue-job-title">
          <span className={cn("file-symbol", job.failed ? "peach" : job.complete && job.result ? "mint" : "lavender")}>
            {job.failed ? <TriangleAlert size={20} aria-hidden /> : <Files size={20} aria-hidden />}
          </span>
          <div>
            <h3>{name}</h3>
            <div className="queue-job-meta">
              {job.kind === "sample" && <span>Демонстрация</span>}
              <span>Файлов: {job.documents}</span>
              <DemoJobTime createdAt={job.createdAt} />
            </div>
          </div>
        </div>
        {job.complete && job.result &&
          <Button asChild variant="outline" size="sm">
            <Link to="/checks/$id" {...checkLocation(job.id)}>
              Открыть результат <ArrowUpRight size={15} aria-hidden />
            </Link>
          </Button>}
      </div>
      <div className="queue-job-state">
        <span role="status">{job.status}</span>
        {job.progress !== null && <span className="tabular-nums">{job.progress}%</span>}
      </div>
      {job.progress !== null && <>
        <div className="run-progress queue-progress" role="progressbar" aria-label={name} aria-valuenow={job.progress}
          data-complete={job.complete}>
          <span style={{ width: `${job.progress}%` }} />
        </div>
        {job.kind === "sample" && <>
          <ol className="queue-stages" aria-label="Этапы обработки">
            {DEMO_STAGES.map((label, index) => (
              <li key={label} data-done={job.stage > index} aria-current={job.stage === index ? "step" : undefined}>
                {job.stage > index && <Check size={12} aria-hidden />} {label}
              </li>
            ))}
          </ol>
          <p className="queue-processed">Обработано {job.processed} из {job.documents} файлов</p>
        </>}
      </>}
      {job.failed && <p className="upload-validation">В комплекте есть пустой файл. Добавьте документ ненулевого размера.</p>}
    </li>
  );
}
