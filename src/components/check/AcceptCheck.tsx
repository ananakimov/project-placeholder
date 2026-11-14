import { useState } from "react";
import { Archive, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChecks } from "@/context/ChecksContext";
import type { Check as CheckData } from "@/data/mock";

const acceptanceDate = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" });

export function AcceptCheck({ check, version = 1 }: { check: CheckData; version?: number }) {
  const { checkHistory } = useChecks();
  const [error, setError] = useState(false);
  const acceptedAt = checkHistory.versions(check).find((item) => item.number === version)?.acceptedAt;
  if (!check.synthetic) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1" data-print-hide>
      {acceptedAt != null ? (
        <p className="flex items-center gap-2 text-sm text-verified" role="status">
          <Check size={16} aria-hidden="true" /> Принята · {acceptanceDate.format(acceptedAt)}
        </p>
      ) : (
        <Button type="button" variant="outline" size="sm" disabled={!checkHistory.ready}
          onClick={() => setError(!checkHistory.accept(check, version))}>
          <Archive size={16} aria-hidden="true" /> Принять проверку
        </Button>
      )}
      <span className="text-xs text-muted-foreground">Отметка о завершении работы, без электронной подписи.</span>
      {error && acceptedAt == null && <p className="text-sm text-destructive" role="alert">Не удалось принять проверку.</p>}
    </div>
  );
}
