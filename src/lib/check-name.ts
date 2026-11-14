import type { Check } from "@/data/mock";

/** kfzNumber is the document number; id remains the internal run identifier. */
export function checkName(check: Pick<Check, "id" | "kfzNumber"> | undefined): string {
  if (!check) return "Проверка не найдена";
  const number = check.kfzNumber.trim();
  return number && !["б/н", "—", "-"].includes(number.toLowerCase())
    ? `КФЗ №${number}`
    : `Проверка КФЗ №${check.id}`;
}
