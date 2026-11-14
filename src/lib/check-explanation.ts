import { formatMoney, sumMoney } from "@/components/money-format";
import type { Breakdown, Doc, Row, SourceRef, Status } from "@/data/mock";

export const indicatorStatus: Record<Status, string> = {
  verified: "Подтверждено",
  discrepancy: "Расхождение",
  unverified: "Не проверено",
};

export function formatMeasure(value: string, unit = "₽") {
  return `${formatMoney(value)} ${unit}`;
}

export function sourceCalculation(row: Row, docs: ReadonlyMap<string, Doc>): SourceRef[] {
  if (row.service || row.manual || row.ruleId !== "R-AGG-01" || row.expected === null || !row.sources.length) return [];
  const amounts = row.sources.flatMap((source) =>
    source.amount !== null && docs.get(source.docId)?.state === "прочитан" ? [source.amount] : []);
  return amounts.length === row.sources.length && sumMoney(amounts) === row.expected ? row.sources : [];
}

export function calculationText(row: Row, sources: SourceRef[]) {
  if (!sources.length || row.expected === null) return "";
  const addends = sources.map((source) => formatMoney(source.amount!)).join(" + ");
  return `${addends} = ${formatMeasure(row.expected, row.unit)}`;
}

export function rowExplanation(row: Row) {
  return row.reason || (row.status === "verified" ? "Значение подтверждено документами." :
    row.status === "unverified" ? "Недостаточно подтверждений для проверки показателя." :
    "Значение в КФЗ отличается от подтверждённого.");
}

export function breakdownNotes(items: Breakdown[] = []): string[] {
  return items.flatMap((item) => [
    ...(item.note ? [`${item.name.replace(/^\d+\. /, "")}. ${item.note}`] : []),
    ...breakdownNotes(item.children),
  ]);
}

export function rowSummary(row: Row) {
  const label = row.name.match(/\(Статья калькуляции (\d+)\)$/)?.[1];
  const name = label ? `Статья ${label}` : row.name;
  if (row.expected === null || row.delta === null || Number(row.delta) === 0) return `${name} — ${rowExplanation(row)}`;
  const delta = formatMeasure(row.delta, row.unit);
  return `${name}: в КФЗ ${formatMeasure(row.reported, row.unit)}, по документам ${formatMeasure(row.expected, row.unit)}. Разница ${row.delta.startsWith("-") ? "" : "+"}${delta}.`;
}
