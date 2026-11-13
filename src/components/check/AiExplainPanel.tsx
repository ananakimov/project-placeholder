import { Badge } from "@/components/ui/badge";
import type { Row } from "@/data/mock";

export function AiExplainPanel({ row }: { row: Row }) {
  if (row.status === "verified") return null;

  return (
    <div className="space-y-3">
      <div className="reason-note">
        <strong>Что не сходится</strong>
        <p>{row.reason}</p>
        {row.partialNote && <p>{row.partialNote}</p>}
      </div>
      <div className="space-y-2 pt-1">
        <div className="space-y-3 rounded-lg border border-ai/20 bg-ai-bg p-3">
          <Badge variant="outline" className="font-mono">{row.ruleId}</Badge>
          <div className="text-[13px] leading-relaxed">
            <strong>Возможные причины</strong>
            <ul className="list-disc space-y-1 pl-4">
              {row.causes?.map((cause) => <li key={cause}>{cause}</li>)}
            </ul>
          </div>
          <div className="text-[13px] leading-relaxed">
            <strong>Рекомендация</strong>
            <p>{row.recommendation}</p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Статус ставят правила. Подпись за вами.
        </p>
      </div>
    </div>
  );
}
