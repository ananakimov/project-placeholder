import { LogTable } from "@/components/LogTable";
import type { Check } from "@/data/mock";

export function CheckLog({ check }: { check: Check }) {
  return <LogTable items={[...check.log].reverse()} />;
}
