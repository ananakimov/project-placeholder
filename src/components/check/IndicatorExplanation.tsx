import type { Doc, Row } from "@/data/mock";
import { RULES, RULESET_VERSION } from "@/data/rules";
import { breakdownNotes, calculationText, rowExplanation, sourceCalculation } from "@/lib/check-explanation";

export function IndicatorExplanation({ row, docs, onSource }: {
  row: Row;
  docs: ReadonlyMap<string, Doc>;
  onSource: (index: number, trigger: HTMLElement) => void;
}) {
  const addends = sourceCalculation(row, docs);
  const rule = RULES[row.ruleId];
  const recommendation = row.status === "verified" ? null : row.recommendation;
  const causes = row.status === "verified" ? [] : row.causes ?? [];
  const notes = breakdownNotes(row.breakdown);
  return (
    <>
      {row.category && row.status !== "verified" && <strong className="block font-medium">
        {row.category[0]!.toUpperCase() + row.category.slice(1)}
      </strong>}
      <p>{rowExplanation(row)}</p>
      {row.partialNote && <p className="mt-1 text-muted-foreground">{row.partialNote}</p>}
      {(addends.length > 0 || causes.length > 0 || notes.length > 0 || recommendation || rule) && (
        <details className="mt-1.5" onClick={(event) => event.stopPropagation()}>
          <summary className="cursor-pointer text-primary hover:underline">{addends.length ? "Как рассчитано" : "Основание проверки"}</summary>
          <div className="mt-2 space-y-2">
            {!!addends.length && <>
              <ul className="space-y-1" aria-label="Слагаемые ожидаемого значения">
                {addends.map((source, index) => (
                  <li key={index}>
                    <button type="button" className="text-left text-primary underline"
                      onClick={(event) => onSource(index, event.currentTarget)}>
                      {docs.get(source.docId)?.title}
                    </button>
                    {" · "}стр. {source.page} · {source.text}
                  </li>
                ))}
              </ul>
              <p className="font-medium tabular-nums">{calculationText(row, addends)}</p>
            </>}
            {rule && <p className="text-muted-foreground">{rule.name} · {RULESET_VERSION}</p>}
            {!!notes.length && <ul className="space-y-1 text-muted-foreground">{notes.map((note) => <li key={note}>{note}</li>)}</ul>}
            {!!causes.length && <>
              <p className="font-medium">Возможные причины</p>
              <ul className="list-disc space-y-1 pl-4">{causes.map((cause) => <li key={cause}>{cause}</li>)}</ul>
            </>}
            {recommendation && <p><strong className="font-medium">Следующий шаг. </strong>{recommendation}</p>}
          </div>
        </details>
      )}
    </>
  );
}
