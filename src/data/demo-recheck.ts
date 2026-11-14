import { sumMoney } from "@/components/money-format";
import type { Check, Doc, Row, Status } from "./mock";

export function isKfz(doc: Doc) {
  return doc.type === "КФЗ";
}

function percent(amount: string, total: string): string {
  const cents = (value: string) => BigInt(value.replace(".", ""));
  const denominator = cents(total);
  if (denominator <= 0n) return "";
  const rounded = (cents(amount) * 10_000n + denominator / 2n) / denominator;
  return `${rounded / 100n}.${String(rounded % 100n).padStart(2, "0")}`;
}

// Project the stored synthetic evidence onto the edited package. A new file has
// no extracted fields in the demo, so it cannot substantiate an amount.
export function recheckDemo(previous: Check, docs: readonly Doc[]): Check {
  if (docs.some((doc) => isKfz(doc) && doc.demoUpload)) {
    return {
      ...previous,
      synthetic: true,
      state: "Готово к разбору",
      title: "Проверка КФЗ",
      kfzNumber: "",
      reportRow: "",
      contract: "",
      period: "",
      docs: docs.map((doc) => doc.state === "вне периода" || doc.state === "другой договор" ? { ...doc, state: "прочитан" } : doc),
      rows: [],
      excluded: [],
      missing: [],
      exceptionOrder: [],
      conclusion: "Подтвердить полностью нельзя",
      coverage: { totalSum: "", verifiedSum: "", discrepancySum: "", unverifiedSum: "", verifiedPct: "", discrepancyPct: "", unverifiedPct: "" },
    };
  }
  const retained = new Set(docs.map((doc) => doc.id));
  const hasUnprocessedFiles = docs.some((doc) => doc.demoUpload);
  const exclusions = previous.excluded.filter((doc) => retained.has(doc.docId));
  const changedExclusions = previous.excluded.filter((doc) => !retained.has(doc.docId));
  const evidenceChanged = (row: Row) => row.sources.some((source) => !retained.has(source.docId)) ||
    row.evidenceDependencies?.some((id) => !retained.has(id));
  const sourceChanged = previous.rows.some(evidenceChanged);
  const rows = previous.rows.map((row): Row => {
    const sources = row.sources.filter((source) => retained.has(source.docId));
    const changedDocument = evidenceChanged(row);
    const changedTotal = row.service && row.ruleId === "R-COV-01" && (sourceChanged || hasUnprocessedFiles);
    if (!changedDocument && !changedTotal) {
      if (row.status === "verified" && changedExclusions.some((doc) => doc.rowIds?.includes(row.id))) {
        return { ...row, reason: "Сохранённые подтверждающие документы соответствуют сумме показателя." };
      }
      return row;
    }

    const { causes, recommendation, partialNote, evidenceDependencies, ...other } = row;
    return {
      ...other,
      sources,
      ...(evidenceDependencies && { evidenceDependencies: evidenceDependencies.filter((id) => retained.has(id)) }),
      category: null,
      expected: null,
      delta: null,
      status: "unverified",
      reason: row.service
        ? "Комплект изменён. Для итогового показателя нужна повторная сверка по обновлённым данным."
        : "Подтверждающий документ исключён или заменён. Полная ожидаемая сумма не установлена.",
    };
  });
  const applicable = rows.filter((row) => !row.service && !row.nested);
  const money = applicable.filter((row) => !row.unit);
  const sum = (status?: Status) => sumMoney(money.filter((row) => !status || row.status === status).map((row) => row.reported));
  const totalSum = sum();
  const verifiedSum = sum("verified");
  const discrepancySum = sum("discrepancy");
  const unverifiedSum = sum("unverified");

  return {
    ...previous,
    synthetic: true,
    state: "Готово к разбору",
    docs: [...docs],
    rows,
    excluded: exclusions,
    conclusion: applicable.some((row) => row.status === "discrepancy")
      ? "Недостоверен"
      : hasUnprocessedFiles || applicable.some((row) => row.status === "unverified")
        ? "Подтвердить полностью нельзя"
        : "Достоверен",
    coverage: {
      totalSum, verifiedSum, discrepancySum, unverifiedSum,
      verifiedPct: percent(verifiedSum, totalSum),
      discrepancyPct: percent(discrepancySum, totalSum),
      unverifiedPct: percent(unverifiedSum, totalSum),
    },
  };
}
