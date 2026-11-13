import { LogTable, type LogItem } from "@/components/LogTable";
import { useChecks } from "@/context/ChecksContext";
import { checks as baseChecks } from "@/data/mock";
import { stampKey } from "@/lib/log-time";

export function GlobalLog() {
  const { checks } = useChecks();
  const withTitle = checks.map((c) => {
    const baseLen = baseChecks.find((b) => b.id === c.id)?.log.length ?? 0;
    return { base: c.log.slice(0, baseLen), added: c.log.slice(baseLen), title: c.title };
  });
  // Действия в этой сессии — сверху (новые первыми), затем исходные записи пакетов по убыванию времени.
  const added: (LogItem & { _n: number })[] = withTitle.flatMap((c) =>
    c.added.map((e, i) => ({ ...e, checkTitle: c.title, _n: i })),
  );
  const base: LogItem[] = withTitle
    .flatMap((c) => c.base.map((e) => ({ ...e, checkTitle: c.title })))
    .sort((a, b) =>
      stampKey(b.at) < stampKey(a.at) ? -1 : stampKey(b.at) > stampKey(a.at) ? 1 : 0,
    );
  added.sort((a, b) =>
    stampKey(b.at) < stampKey(a.at) ? -1 : stampKey(b.at) > stampKey(a.at) ? 1 : b._n - a._n,
  );
  return (
    <div>
      <h1 className="font-serif text-[28px] font-semibold">Журнал</h1>
      <div className="mt-6">
        <LogTable items={[...added, ...base]} showCheck />
      </div>
    </div>
  );
}
