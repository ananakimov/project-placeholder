/** Formats "1520000.00" → "1 520 000,00" (U+202F groups) using only string ops. */
export function formatMoney(value: string): string {
  const neg = value.startsWith("-");
  const [int = "0", frac = "00"] = (neg ? value.slice(1) : value).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
  return `${neg ? "−" : ""}${grouped},${frac.padEnd(2, "0")}`;
}

/** Exact sum for the displayed source amounts; no floating-point money arithmetic. */
export function sumMoney(values: string[]): string {
  const cents = values.reduce((sum, value) => {
    const negative = value.startsWith("-");
    const [integer = "0", fraction = ""] = (negative ? value.slice(1) : value).split(".");
    const amount = BigInt(integer) * 100n + BigInt(fraction.padEnd(2, "0"));
    return sum + (negative ? -amount : amount);
  }, 0n);
  const absolute = cents < 0n ? -cents : cents;
  return `${cents < 0n ? "-" : ""}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}
