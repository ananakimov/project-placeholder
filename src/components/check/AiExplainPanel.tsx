import { useEffect, useState } from "react";
import { Copy, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AiBadge } from "@/components/AiBadge";
import { aiAnswers, QUESTIONS, type AiAnswer, type AiRef, type QuestionId } from "@/data/aiAnswers";
import { useChecks } from "@/context/ChecksContext";
import { useRole } from "@/context/RoleContext";
import type { Check, Row } from "@/data/mock";

function useTypewriter(text: string, ms = 600) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setN(text.length);
      return;
    }
    setN(0);
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      setN(Math.round(k * text.length));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, ms]);
  return text.slice(0, n);
}

export function AiExplainPanel({
  check,
  row,
  onOpenRef,
}: {
  check: Check;
  row: Row;
  onOpenRef: (r: AiRef) => void;
}) {
  const [q, setQ] = useState<QuestionId | null>(null);
  const available = QUESTIONS.filter((x) => x.applies(row) && aiAnswers[row.id]?.[x.id]);
  const answer = q ? aiAnswers[row.id]?.[q] : undefined;
  useEffect(() => setQ(null), [row.id]);

  return (
    <div className="space-y-3">
      {available.length === 0 && (
        <p className="text-sm text-muted-foreground">Для этой строки подсказок нет.</p>
      )}
      {available.map((x) => (
        <Button
          key={x.id}
          variant="outline"
          className="w-full justify-start"
          aria-pressed={q === x.id}
          onClick={() => setQ(x.id)}
        >
          <Sparkles className="h-4 w-4 text-ai" /> {x.label}
        </Button>
      ))}
      {answer && q && (
        <AnswerCard
          key={`${row.id}-${q}`}
          check={check}
          row={row}
          answer={answer}
          onOpenRef={onOpenRef}
        />
      )}
    </div>
  );
}

function AnswerCard({
  check,
  row,
  answer,
  onOpenRef,
}: {
  check: Check;
  row: Row;
  answer: AiAnswer;
  onOpenRef: (r: AiRef) => void;
}) {
  const store = useChecks();
  const { role } = useRole();
  const shown = useTypewriter(answer.text);
  const done = shown.length === answer.text.length;
  return (
    <div className="space-y-2 pt-1">
      <div className="space-y-3 rounded-lg border border-ai/20 bg-ai-bg p-3">
        <div className="flex items-center gap-2">
          <AiBadge />
          <Badge variant="outline" className="font-mono">
            {row.ruleId}
          </Badge>
          {answer.hypothesis && (
            <span className="text-[11px] text-muted-foreground">гипотеза, статус не меняет</span>
          )}
        </div>
        <p className="min-h-[3em] text-[13px] leading-relaxed tabular-nums">{shown}</p>
        {done && answer.refs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {answer.refs.map((r) => (
              <button
                key={`${r.docId}-${r.page}`}
                onClick={() => onOpenRef(r)}
                className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-[12px] text-primary hover:underline"
              >
                <FileText className="h-3 w-3" /> {r.label}
              </button>
            ))}
          </div>
        )}
        {done && role === "Бухгалтер" && (
          <Button
            size="sm"
            variant="outline"
            className="bg-card"
            onClick={() => {
              const before = store.comments[row.id];
              store.addComment(row.id, answer.text);
              store.addLog(check.id, {
                actor: "ИИ",
                action: "ИИ-подсказка скопирована",
                object: row.name,
                before: before ?? "—",
                after: answer.text,
              });
              toast("Текст скопирован в комментарий");
            }}
          >
            <Copy className="h-3.5 w-3.5" /> Скопировать в комментарий
          </Button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        ИИ объясняет. Статус ставят правила. Подпись за вами.
      </p>
    </div>
  );
}
