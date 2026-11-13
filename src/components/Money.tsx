import { cn } from "@/lib/utils";
import { formatMoney } from "./money-format";

export function Money({ value, className }: { value: string | null; className?: string }) {
  if (value === null)
    return <span title="нет данных" className={cn("tabular-nums text-muted-foreground", className)}>—</span>;
  return <span className={cn("tabular-nums whitespace-nowrap", className)}>{formatMoney(value)}</span>;
}
