import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Check } from "@/data/mock";
import { checkLocation } from "@/lib/check-location";
import { checkName } from "@/lib/check-name";

const tabs = [
  { to: "/checks/$id", label: "Результат", exact: true },
  { to: "/checks/$id/documents", label: "Документы" },
] as const;

export function CheckHeader({ check, accepted = false, versionControls }: {
  check: Check;
  accepted?: boolean;
  versionControls?: ReactNode;
}) {
  const heading = checkName(check);
  return (
    <div>
      <nav className="text-[13px] text-muted-foreground" data-print-hide>
        <Link to={accepted ? "/archive" : "/checks"} className="hover:text-foreground">
          {accepted ? "Архив проверок" : "Проверки"}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">{heading}</span>
      </nav>
      <div className="mt-3 flex items-start justify-between gap-6">
        <div>
          <h1 className="font-serif text-[28px] font-semibold leading-tight">{heading}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground">
            {check.reportRow && <span>{check.reportRow}</span>}
            <span className="tabular-nums">
              Договор {check.contract} · Период {check.period}
            </span>
            <Badge variant="outline" className={cn("font-normal", {
              "bg-verified-bg text-verified": check.conclusion === "Достоверен",
              "bg-discrepancy-bg text-discrepancy": check.conclusion === "Недостоверен",
              "bg-unverified-bg text-unverified": check.conclusion === "Подтвердить полностью нельзя",
            })}>
              {check.conclusion}
            </Badge>
            {check.synthetic && <span>Пример</span>}
          </div>
        </div>
      </div>
      <div className="check-header-controls mt-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b" data-print-hide>
        <nav aria-label="Разделы проверки" className="check-tabs flex gap-6">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              params={checkLocation(check.id).params}
              search={(previous) => checkLocation(check.id, previous.version).search}
              activeOptions={{ exact: "exact" in t }}
              className="-mb-px border-b-2 border-transparent pb-2.5 text-sm text-muted-foreground hover:text-foreground"
              activeProps={{ className: "!border-primary !text-foreground font-medium" }}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        {versionControls}
      </div>
    </div>
  );
}
