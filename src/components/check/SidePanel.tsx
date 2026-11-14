import { useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bookmark, ChevronLeft, ChevronRight, MousePointerClick } from "lucide-react";
import type { Check, Row, SourceRef } from "@/data/mock";
import { AiExplainPanel } from "./AiExplainPanel";
import { RULES, RULESET_VERSION, RULE_TOLERANCE } from "@/data/rules";
import { SourceViewer } from "./SourceViewer";
import { DocumentFields } from "./DocumentFields";
import { Money } from "@/components/Money";
import { StatusChip } from "@/components/StatusChip";
export type PanelTab = "source" | "why" | "rule";
type Props = {
  check: Check;
  row: Row | null;
  sourceIndex: number;
  onSourceChange?: ((index: number) => void) | undefined;
  focusedSource?: SourceRef | null;
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
};
export function SidePanel(props: Props) {
  if (!props.row)
    return (
      <div className="source-empty-state">
        <MousePointerClick size={30} />
        <strong>Выберите показатель</strong>
        <p>Здесь появится документ с подсвеченной суммой и объяснение результата.</p>
      </div>
    );
  return <SelectedPanel key={`${props.check.id}:${props.row.id}`} {...props} row={props.row} />;
}
function SelectedPanel({
  check,
  row,
  sourceIndex,
  onSourceChange,
  focusedSource,
  tab,
  onTab,
}: Props & { row: Row }) {
  const [localIndex, setLocalIndex] = useState(sourceIndex);
  const documentTabs = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setLocalIndex(sourceIndex);
  }, [sourceIndex]);
  const index = Math.min(
    onSourceChange ? sourceIndex : localIndex,
    Math.max(0, row.sources.length - 1),
  );
  const source = focusedSource ?? row.sources[index] ?? null;
  const doc = source ? (check.docs.find((d) => d.id === source.docId) ?? null) : null;
  const rule = RULES[row.ruleId];
  useEffect(() => {
    const list = documentTabs.current;
    const active = list?.querySelector<HTMLElement>('[data-state="active"]');
    if (!list || !active) return;
    list.scrollTo({ left: active.offsetLeft - list.offsetLeft - 8, behavior: "smooth" });
  }, [index, tab]);
  function choose(next: number) {
    setLocalIndex(next);
    onSourceChange?.(next);
    onTab("source");
  }
  const hasExplanation = row.status !== "verified";
  return (
    <Tabs
      value={tab === "why" && !hasExplanation ? "source" : tab}
      onValueChange={(v) => onTab(v as PanelTab)}
      className="evidence-panel"
    >
      <div className="evidence-header">
        <div className="evidence-heading">
          <h2 title={row.name}>{row.name}</h2>
          <StatusChip status={row.status} />
        </div>
        <div className="evidence-amounts">
          <div className="reported-readout">
            <small>В отчёте{row.unit ? `, ${row.unit}` : ", ₽"}</small>
            <strong>{row.unit ? row.reported : <Money value={row.reported} />}</strong>
          </div>
          <div className="expected-readout">
            <small>По документам, ₽</small>
            <strong>
              <Money value={row.expected} />
            </strong>
          </div>
          <div className="difference-readout" data-alert={row.status === "discrepancy"}>
            <small>Разница, ₽</small>
            <strong>
              <Money value={row.delta} />
            </strong>
          </div>
        </div>
      </div>
      <TabsList className="evidence-tabs">
        <TabsTrigger value="source">Источник</TabsTrigger>
        {hasExplanation && <TabsTrigger value="why">Объяснение и рекомендация</TabsTrigger>}
        <TabsTrigger value="rule">Правило проверки</TabsTrigger>
      </TabsList>
      <TabsContent value="source" className="evidence-source-content">
        <Tabs
          value={String(index)}
          onValueChange={(value) => choose(Number(value))}
          className="source-tabs"
        >
          {row.sources.length > 0 && (
            <div className="document-picker">
              <button
                aria-label="Предыдущий документ"
                disabled={index === 0}
                onClick={() => choose(index - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <TabsList
                ref={documentTabs}
                className="document-tabs"
                aria-label="Документы показателя"
              >
                {row.sources.map((s, i) => {
                  const title = check.docs.find((d) => d.id === s.docId)?.title ?? s.docId;
                  return (
                    <TabsTrigger
                      key={`${s.docId}-${i}`}
                      value={String(i)}
                      aria-label={`${title}, источник ${i + 1}`}
                      title={title}
                    >
                      <Bookmark size={15} fill="currentColor" strokeWidth={0} />
                      <span>{title}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              <button
                aria-label="Следующий документ"
                disabled={index >= row.sources.length - 1}
                onClick={() => choose(index + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
          <TabsContent value={String(index)} className="source-document-content">
            <div className="source-context">
              {row.sources.length > 1 && (
                <div className="aggregation-note">
                  <span className="aggregation-description">
                    Сумма показателя собрана из {row.sources.length} документов.
                  </span>
                  <span>
                    Документ {index + 1} / {row.sources.length}
                  </span>
                </div>
              )}
              <DocumentFields doc={doc} />
            </div>
            <SourceViewer row={row} source={source} doc={doc} onWhy={() => onTab("why")} />
          </TabsContent>
        </Tabs>
      </TabsContent>
      {hasExplanation && (
        <TabsContent value="why" className="evidence-text-content">
          <AiExplainPanel row={row} />
        </TabsContent>
      )}
      <TabsContent value="rule" className="evidence-text-content">
        <h3 className="mb-4 text-sm font-medium">Основание результата</h3>
        <dl className="evidence-rules">
          {[
            ["Правило", row.ruleId],
            ["Название", rule?.name ?? "—"],
            ["Условие", rule?.condition ?? "—"],
            ["Допуск", RULE_TOLERANCE],
            ["Пересчёт", row.reason],
            ["Версия", RULESET_VERSION],
          ].map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </TabsContent>
    </Tabs>
  );
}
