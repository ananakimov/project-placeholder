import { useState } from "react";
import { Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChecks } from "@/context/ChecksContext";
import type { Check as CheckData } from "@/data/mock";
import { conclusionWorkbook } from "@/lib/conclusion-xlsx";
import { downloadBlob } from "@/lib/export";

const acceptanceDate = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" });

export function AcceptCheck({ check, version = 1 }: { check: CheckData; version?: number | undefined }) {
  const { checkHistory } = useChecks();
  const [error, setError] = useState("");
  const acceptedAt = checkHistory.versions(check).find((item) => item.number === version)?.acceptedAt;
  if (!check.synthetic) return null;

  function saveConclusion() {
    const time = acceptedAt ?? Date.now();
    setError("");
    try {
      const file = conclusionWorkbook(check, version, time);
      if (acceptedAt == null && !checkHistory.accept(check, version, time)) {
        setError("Не удалось сохранить принятие в браузере.");
        return;
      }
      downloadBlob(file, `doccheck-${check.id}-v${version}.xlsx`);
    } catch {
      setError("Не удалось скачать заключение. Попробуйте ещё раз.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2" data-print-hide>
      {acceptedAt != null ? (
        <>
          <p className="flex items-center gap-2 text-sm text-verified" role="status">
            <Check size={16} aria-hidden="true" /> Принят · {acceptanceDate.format(acceptedAt)}
          </p>
          <Button type="button" variant="outline" onClick={saveConclusion}>
            <Download size={16} aria-hidden="true" /> Скачать заключение
          </Button>
        </>
      ) : (
        <Button type="button" size="lg" disabled={!checkHistory.ready}
          onClick={saveConclusion}>
          <Download size={16} aria-hidden="true" /> Принять и скачать заключение
        </Button>
      )}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
