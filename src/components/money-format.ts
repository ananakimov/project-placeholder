/** Formats "1520000.00" → "1 520 000,00" (U+202F groups) using only string ops. */
export function formatMoney(value: string): string {
  const neg = value.startsWith("-");
  const [int = "0", frac = "00"] = (neg ? value.slice(1) : value).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
  return `${neg ? "−" : ""}${grouped},${frac.padEnd(2, "0")}`;
}
