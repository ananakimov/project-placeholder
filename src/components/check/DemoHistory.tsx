import { useId } from "react";
import { useChecks } from "@/context/ChecksContext";

const dateTime = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" });

export function demoJobName(id: string) {
  return `Демо-задание №${id}`;
}

export function DemoJobTime({ createdAt }: { createdAt: number }) {
  return <time dateTime={new Date(createdAt).toISOString()}>{dateTime.format(createdAt)}</time>;
}

export function DemoJobStatus({ status }: { status: string }) {
  return <span className="rounded bg-muted px-2 py-1 text-xs">{status}</span>;
}

export function DemoHistory({ title = "История демо-заданий" }: { title?: string }) {
  const { demoQueue } = useChecks();
  const heading = useId();
  const entries = demoQueue.entries;
  return <section className="mt-6 rounded-lg border bg-card p-4" aria-labelledby={heading}>
    <h2 id={heading} className="text-base font-medium">{title}</h2>
    <p className="mt-1 text-sm text-muted-foreground">
      Здесь можно проверить отправку комплектов в очередь. Сверка файлов недоступна.
    </p>
    {!demoQueue.ready && <p className="mt-3 text-sm text-muted-foreground">Загрузка истории…</p>}
    {demoQueue.ready && entries.length === 0 &&
      <p className="mt-3 text-sm text-muted-foreground">
        Демо-заданий пока нет.
      </p>}
    <ul className="mt-2 divide-y text-sm" aria-live="polite">
      {entries.map(({ id, createdAt, documents, status }) => <li key={id} className="flex flex-wrap items-start justify-between gap-2 py-3">
        <div className="min-w-0">
          <div className="break-all font-medium">{demoJobName(id)}</div>
          <div className="text-xs text-muted-foreground">
            <DemoJobTime createdAt={createdAt} /> · Документов {documents}
          </div>
        </div>
        <DemoJobStatus status={status} />
      </li>)}
    </ul>
  </section>;
}
