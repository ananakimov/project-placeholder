import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChecks } from "@/context/ChecksContext";
import type { Check as CheckData } from "@/data/mock";

const acceptanceDate = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" });

export function AcceptCheck({ check, version = 1 }: { check: CheckData; version?: number | undefined }) {
  const { checkHistory } = useChecks();
  const [error, setError] = useState(false);
  const acceptedAt = checkHistory.versions(check).find((item) => item.number === version)?.acceptedAt;
  if (!check.synthetic) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2" data-print-hide>
      {acceptedAt != null ? (
        <p className="flex items-center gap-2 text-sm text-verified" role="status">
          <Check size={16} aria-hidden="true" /> Принят · {acceptanceDate.format(acceptedAt)}
        </p>
      ) : (
        <Button type="button" size="lg" disabled={!checkHistory.ready}
          onClick={() => setError(!checkHistory.accept(check, version))}>
          Принять проверку
        </Button>
      )}
      {error && acceptedAt == null && <p className="text-sm text-destructive" role="alert">Не удалось сохранить принятие в браузере.</p>}
    </div>
  );
}
