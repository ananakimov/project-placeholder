import { useId } from "react";
import { useChecks } from "@/context/ChecksContext";

const dateTime = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" });

export function DemoHistory({ title = "История демо-заданий", search = "" }: {
  title?: string;
  search?: string;
}) {
  const { demoQueue } = useChecks();
  const heading = useId();
  const entries = demoQueue.entries.filter((entry) =>
    `Демо-задание №${entry.id}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return <section className="mt-6 rounded-lg border bg-card p-4" aria-labelledby={heading}>
    <h2 id={heading} className="text-base font-medium">{title}</h2>
    <p className="mt-1 text-sm text-muted-foreground">
      Синтетика. Очередь демонстрирует интерфейс. Файлы остаются на устройстве, сверка не выполняется.
    </p>
    {!demoQueue.ready && <p className="mt-3 text-sm text-muted-foreground">Загрузка истории…</p>}
    {demoQueue.ready && entries.length === 0 &&
      <p className="mt-3 text-sm text-muted-foreground">
        {search.trim() ? "Демо-задания не найдены." : "Демо-заданий пока нет."}
      </p>}
    <ul className="mt-2 divide-y text-sm" aria-live="polite">
      {entries.map(({ id, createdAt, documents, status }) => <li key={id} className="flex flex-wrap items-start justify-between gap-2 py-3">
        <div className="min-w-0">
          <div className="break-all font-medium">Демо-задание №{id}</div>
          <div className="text-xs text-muted-foreground">
            <time dateTime={new Date(createdAt).toISOString()}>{dateTime.format(createdAt)}</time> · Документов {documents}
          </div>
        </div>
        <span className="rounded bg-muted px-2 py-1 text-xs">{status}</span>
      </li>)}
    </ul>
  </section>;
}
