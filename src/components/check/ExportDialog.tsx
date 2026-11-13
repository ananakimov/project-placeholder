import { useNavigate } from "@tanstack/react-router";
import { FileJson, FileSpreadsheet, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Check } from "@/data/mock";
import { checkToCsv, checkToJson, downloadBlob } from "@/lib/export";

export function ExportDialog({
  check,
  open,
  onOpenChange,
}: {
  check: Check;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  const options = [
    {
      icon: FileText,
      title: "Заключение (PDF)",
      desc: "Печать страницы вывода. В окне печати выберите «Сохранить как PDF».",
      run: async () => {
        onOpenChange(false);
        await navigate({ to: "/checks/$id/conclusion", params: { id: check.id } });
        setTimeout(() => window.print(), 400);
      },
    },
    {
      icon: FileSpreadsheet,
      title: "Таблица (CSV)",
      desc: "Показатели и источники, разделитель «;», UTF-8.",
      run: () => {
        downloadBlob(
          new Blob([checkToCsv(check)], { type: "text/csv;charset=utf-8" }),
          `docheck-${check.id}.csv`,
        );
        onOpenChange(false);
      },
    },
    {
      icon: FileJson,
      title: "Результат (JSON)",
      desc: "Объект проверки целиком, как есть.",
      run: () => {
        downloadBlob(
          new Blob([checkToJson(check)], { type: "application/json" }),
          `docheck-${check.id}.json`,
        );
        onOpenChange(false);
      },
    },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Экспорт</DialogTitle>
          <DialogDescription>{check.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {options.map((o) => (
            <button
              key={o.title}
              onClick={o.run}
              className="flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left hover:bg-row-hover"
            >
              <o.icon className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <div className="text-sm font-medium">{o.title}</div>
                <div className="text-[12px] text-muted-foreground">{o.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
