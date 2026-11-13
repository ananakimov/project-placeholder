import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Check } from "@/data/mock";
import { useState } from "react";
import { ExportDialog } from "./ExportDialog";

const tabs = [
  { to: "/checks/$id", label: "Показатели", exact: true },
  { to: "/checks/$id/exceptions", label: "Разбор расхождений" },
  { to: "/checks/$id/documents", label: "Документы" },
  { to: "/checks/$id/conclusion", label: "Заключение" },
  { to: "/checks/$id/log", label: "Журнал" },
] as const;

export function CheckHeader({ check }: { check: Check }) {
  const [exportOpen, setExportOpen] = useState(false);
  return (
    <div>
      <nav className="text-[13px] text-muted-foreground" data-print-hide>
        <Link to="/checks" className="hover:text-foreground">
          Проверки
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">{check.title}</span>
      </nav>
      <div className="mt-3 flex items-start justify-between gap-6">
        <div>
          <h1 className="font-serif text-[28px] font-semibold leading-tight">{check.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground">
            <span className="tabular-nums">
              Договор {check.contract} · Период {check.period}
              {check.reportRow && ` · Строка отчёта «${check.reportRow}»`}
            </span>
            <Badge variant="outline" className="font-normal text-foreground">
              {check.state}
            </Badge>
          </div>
        </div>
        <div className="mt-1 flex gap-2" data-print-hide>
          <Button onClick={() => setExportOpen(true)}>
            <Download className="h-4 w-4" /> Экспорт
          </Button>
          <ExportDialog check={check} open={exportOpen} onOpenChange={setExportOpen} />
        </div>
      </div>
      <div className="check-tabs mt-6 flex gap-6 border-b" data-print-hide>
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            params={{ id: check.id }}
            activeOptions={{ exact: "exact" in t }}
            className="-mb-px border-b-2 border-transparent pb-2.5 text-sm text-muted-foreground hover:text-foreground"
            activeProps={{ className: "!border-primary !text-foreground font-medium" }}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
