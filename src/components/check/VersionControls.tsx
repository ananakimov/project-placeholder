import { useNavigate } from "@tanstack/react-router";
import { useChecks } from "@/context/ChecksContext";
import type { DemoCheckVersion } from "@/context/demo-check-history";
import type { Check } from "@/data/mock";
import { EditPackage } from "./EditPackage";

const dateTime = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" });
const dateOnly = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeZone: "UTC" });

export function VersionControls({ check, selected }: { check: Check; selected: DemoCheckVersion }) {
  const { checkHistory } = useChecks();
  const navigate = useNavigate();
  if (!check.synthetic) return null;

  const versions = checkHistory.versions(check);
  const current = checkHistory.current(check);
  const pending = versions.find((version) => version.number !== 1 && version.readyAt > checkHistory.now);
  return (
    <div className="flex flex-wrap items-center gap-2 pb-1.5" data-print-hide>
      {versions.length > 1 && <label className="flex flex-wrap items-center gap-2 text-sm">
        Версия
        <select className="max-w-full rounded-md border bg-card px-2 py-1.5" value={selected.number}
          onChange={(event) => {
            const version = Number(event.target.value);
            void navigate({ to: ".", search: { version } });
          }}>
          {versions.map((version) => (
            <option key={version.number} value={version.number} disabled={version === pending}>
              {version.number} · {version.number === 1 ? dateOnly.format(version.createdAt) : dateTime.format(version.createdAt)}
              {version.number === current.number ? " · текущая" : ""}
              {version.acceptedAt !== null ? " · принята" : ""}
              {version === pending ? " · в работе" : ""}
            </option>
          ))}
        </select>
      </label>}
      <EditPackage key={selected.number} docs={selected.result.docs}
        disabled={!checkHistory.ready || !!pending}
        submit={(docs) => {
          const saved = checkHistory.recheck(check, selected.number, docs);
          if (saved) {
            void navigate({ to: ".", search: {} });
          }
          return saved;
        }} />
      {pending && <p className="text-xs text-muted-foreground" role="status">
        Версия {pending.number} в обработке. Пока доступна версия {current.number}.
      </p>}
    </div>
  );
}
