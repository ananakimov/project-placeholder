import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCheck, CheckCircle2, Flag, PencilLine, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Money } from "@/components/Money";
import { StatusChip } from "@/components/StatusChip";
import { SidePanel, type PanelTab } from "@/components/check/SidePanel";
import { useChecks } from "@/context/ChecksContext";
import type { Check, Row } from "@/data/mock";
import { cn } from "@/lib/utils";

const fixTarget = (label: string) => label.match(/→\s*([\d.]+)/)?.[1] ?? "";

export function CheckExceptions({ check }: { check: Check }) {
  const store = useChecks();
  const rows = check.exceptionOrder
    .map((id) => check.rows.find((r) => r.id === id))
    .filter((r): r is Row => !!r);
  const [selId, setSelId] = useState<string | null>(rows[0]?.id ?? null);
  const [tab, setTab] = useState<PanelTab>("source");
  const reviewed = store.reviewed[check.id] ?? new Set<string>();
  const done = rows.filter((r) => reviewed.has(r.id)).length;

  if (rows.length === 0)
    return (
      <div className="flex flex-col items-center rounded-lg border bg-card py-16 text-center shadow-card">
        <CheckCircle2 className="h-10 w-10 text-verified" />
        <div className="mt-4 font-medium">
          Исключений нет. Все показатели подтверждены правилами
        </div>
        <Button asChild className="mt-5">
          <Link to="/checks/$id/conclusion" params={{ id: check.id }}>
            К выводу <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    );

  const sel = rows.find((r) => r.id === selId) ?? null;
  return (
    <div className="exceptions-layout flex items-start gap-6">
      <div className="exceptions-list w-[320px] shrink-0 space-y-3">
        <div className="text-[13px] text-muted-foreground tabular-nums">
          Просмотрено {done} из {rows.length}
        </div>
        {rows.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              setSelId(r.id);
              setTab("source");
            }}
            className={cn(
              "w-full rounded-lg border bg-card p-3 text-left shadow-card hover:bg-row-hover",
              selId === r.id && "border-primary",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[13px] font-medium">{r.name}</span>
              {reviewed.has(r.id) && (
                <CheckCheck className="h-4 w-4 shrink-0 text-verified" aria-label="просмотрено" />
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <StatusChip status={r.status} />
              {store.flagged.has(r.id) && <Flag className="h-3.5 w-3.5 text-discrepancy" />}
            </div>
            <div className="mt-2 text-[12px] text-muted-foreground">
              {r.status === "unverified" ? (
                r.reason
              ) : (
                <>
                  Δ{" "}
                  <Money value={r.delta} className={cn(r.delta !== "0.00" && "text-discrepancy")} />{" "}
                  ₽
                </>
              )}
            </div>
            {r.category && (
              <div className="mt-0.5 text-[12px] text-muted-foreground">
                Категория: {r.category}
              </div>
            )}
          </button>
        ))}
        {done === rows.length && (
          <Button asChild className="w-full">
            <Link to="/checks/$id/conclusion" params={{ id: check.id }}>
              К выводу <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
      <div className="exceptions-detail min-w-0 flex-1 space-y-4">
        <div className="h-[calc(100vh-320px)] min-h-[720px] overflow-hidden rounded-lg border bg-card shadow-card">
          <SidePanel check={check} row={sel} sourceIndex={0} tab={tab} onTab={setTab} />
        </div>
        {sel && <Actions key={sel.id} check={check} row={sel} />}
      </div>
    </div>
  );
}

function Actions({ check, row }: { check: Check; row: Row }) {
  const store = useChecks();
  const [comment, setComment] = useState(store.comments[row.id] ?? "");
  const saved = store.comments[row.id];
  useEffect(() => {
    if (saved !== undefined) setComment(saved);
  }, [saved]);
  const [fixOpen, setFixOpen] = useState(false);
  const fix = row.variants?.["fix"];
  const picks = Object.entries(row.variants ?? {}).filter(([k]) => k.startsWith("pick-"));
  const isReviewed = store.reviewed[check.id]?.has(row.id);
  const flagged = store.flagged.has(row.id);

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4 shadow-card">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={isReviewed ? "outline" : "default"}
          disabled={isReviewed}
          onClick={() => {
            store.markReviewed(check.id, row.id);
          }}
        >
          <CheckCheck className="h-4 w-4" />{" "}
          {isReviewed ? "Просмотрено" : "Отметить как просмотренное"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            store.toggleFlag(row.id);
          }}
        >
          <Flag className={cn("h-4 w-4", flagged && "text-discrepancy")} />{" "}
          {flagged ? "Снять флаг" : "Флаг: нужна ручная проверка"}
        </Button>
        {fix && !row.manual && (
          <Button variant="outline" onClick={() => setFixOpen(true)}>
            <PencilLine className="h-4 w-4" /> Исправить значение
          </Button>
        )}
      </div>

      {picks.length > 0 && (
        <div className="space-y-2">
          <Label className="text-[13px]">Выбрать документ</Label>
          <RadioGroup
            value={store.applied[check.id]?.[row.id] ?? ""}
            onValueChange={(k) => {
              store.applyVariant(check.id, row.id, k);
              toast("Статус пересчитан правилами");
            }}
          >
            {picks.map(([k]) => {
              const d = check.docs.find((x) => x.id === `${check.id}-${k.slice(5)}`);
              const sum = d?.fields.find((f) => f.label === "Сумма")?.value;
              return (
                <label
                  key={k}
                  className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-[13px] hover:bg-row-hover"
                >
                  <RadioGroupItem value={k} />
                  <span className="font-medium">{d?.number}</span>
                  <span className="text-muted-foreground">
                    договор {d?.contract} · от {d?.date}
                  </span>
                  <span className="ml-auto tabular-nums">{sum} ₽</span>
                </label>
              );
            })}
          </RadioGroup>
          {store.applied[check.id]?.[row.id] && (
            <p className="text-[12px] text-muted-foreground">
              Связь выбрана вручную, проверена правилами
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="comment" className="text-[13px]">
          Комментарий
        </Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={!comment.trim() || comment === store.comments[row.id]}
          onClick={() => {
            store.addComment(row.id, comment.trim());
          }}
        >
          Сохранить
        </Button>
      </div>

      {fix && (
        <FixDialog
          open={fixOpen}
          onOpenChange={setFixOpen}
          label={fix.label}
          onSave={() => {
            store.applyVariant(check.id, row.id, "fix");
            toast("Статус пересчитан правилами");
            setFixOpen(false);
          }}
        />
      )}
    </div>
  );
}

function FixDialog({
  open,
  onOpenChange,
  label,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  label: string;
  onSave: (value: string, reason: string) => void;
}) {
  const [value, setValue] = useState(fixTarget(label));
  const [reason, setReason] = useState(label.split("причина:")[1]?.trim() ?? "");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Исправить значение</DialogTitle>
        </DialogHeader>
        <p className="text-[13px] text-muted-foreground">{label.split(",")[0]}</p>
        <div className="space-y-1.5">
          <Label htmlFor="fix-value">Новое значение, ₽</Label>
          <Input
            id="fix-value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="tabular-nums"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fix-reason">Причина (обязательно)</Label>
          <Textarea
            id="fix-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            disabled={!value.trim() || !reason.trim()}
            onClick={() => onSave(value.trim(), reason.trim())}
          >
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
