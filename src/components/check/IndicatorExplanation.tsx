import type { Row } from "@/data/mock";
import { rowExplanation } from "@/lib/check-explanation";

export function IndicatorExplanation({ row }: { row: Row }) {
  return (
    <>
      {row.category && row.status !== "verified" && <strong className="block font-medium">
        {row.category[0]!.toUpperCase() + row.category.slice(1)}
      </strong>}
      <p>{rowExplanation(row)}</p>
      {row.partialNote && <p className="mt-1 text-muted-foreground">{row.partialNote}</p>}
    </>
  );
}
