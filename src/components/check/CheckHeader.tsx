import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { Check } from "@/data/mock";
import { checkLocation } from "@/lib/check-location";
import { checkName } from "@/lib/check-name";

const tabs = [
  { to: "/checks/$id", label: "Результат", exact: true },
  { to: "/checks/$id/documents", label: "Документы" },
] as const;

export function CheckHeader({ check, versionControls, documentFilters }: {
  check: Check;
  versionControls?: ReactNode;
  documentFilters?: ReactNode;
}) {
  const heading = checkName(check);
  return (
    <div>
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="font-serif text-[28px] font-semibold leading-tight">{heading}</h1>
          {(check.reportRow || check.contract || check.period) && <div className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground">
            {check.reportRow && <span>{check.reportRow}</span>}
            {(check.contract || check.period) && <span className="tabular-nums">
              {check.contract && `Договор ${check.contract}`}{check.contract && check.period && " · "}{check.period && `Период ${check.period}`}
            </span>}
          </div>}
        </div>
      </div>
      <div className="check-header-controls mt-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b" data-print-hide>
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
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
          {documentFilters}
        </div>
        {versionControls}
      </div>
    </div>
  );
}
