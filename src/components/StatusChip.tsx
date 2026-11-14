import { Check, Minus, AlertTriangle } from "lucide-react";
import type { Status } from "@/data/mock";
const states = {
  verified: { Icon: Check, label: "Подтверждено" },
  discrepancy: { Icon: AlertTriangle, label: "Расхождение" },
  unverified: { Icon: Minus, label: "Не проверено" },
};
export function StatusLabel({ status, label, plain = false }: { status: Status; label: string; plain?: boolean }) {
  const { Icon } = states[status];
  return (
    <span className="status-chip" data-status={status}>
      {(!plain || status !== "unverified") && <span className={plain ? "inline-flex shrink-0" : "status-symbol"}>
        <Icon size={14} strokeWidth={2} aria-hidden="true" />
      </span>}
      {label}
    </span>
  );
}

export function StatusChip({ status }: { status: Status }) {
  return <StatusLabel status={status} label={states[status].label} />;
}
