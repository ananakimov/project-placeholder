import { checkLocation } from "@/lib/check-location";
import { useNavigate } from "@tanstack/react-router";
import { useChecks } from "@/context/ChecksContext";
import type { DemoCheckVersion } from "@/context/demo-check-history";
import type { Check } from "@/data/mock";
import { EditPackage } from "./EditPackage";

export function VersionControls({ check, selected }: { check: Check; selected: DemoCheckVersion }) {
  const { checkHistory } = useChecks();
  const navigate = useNavigate();
  if (!check.synthetic) return null;

  const versions = checkHistory.versions(check);
  const current = checkHistory.current(check);
  const pending = versions.find((version) => version.number !== 1 && version.readyAt > checkHistory.now);
  return (
    <div className="flex flex-wrap items-center gap-2 pb-1.5" data-print-hide>
      {versions.length > 1 &&
        <select aria-label="Версия" className="max-w-full rounded-md border bg-card px-2 py-1.5 text-sm" value={selected.number}
          onChange={(event) => {
            const version = Number(event.target.value);
            void navigate({ to: ".", search: checkLocation(check.id, version).search });
          }}>
          {[...versions].reverse().map((version) => (
            <option key={version.number} value={version.number} disabled={version === pending}>
              Версия {version.number}
            </option>
          ))}
        </select>}
      <EditPackage key={selected.number} docs={selected.result.docs}
        disabled={!checkHistory.ready || !!pending}
        submit={(docs) => {
          const saved = checkHistory.recheck(check, selected.number, docs);
          if (saved) {
            void navigate({ to: ".", search: checkLocation(check.id).search });
          }
          return saved;
        }} />
      {pending && <p className="text-xs text-muted-foreground" role="status">
        Версия {pending.number} в обработке. Пока доступна версия {current.number}.
      </p>}
    </div>
  );
}
