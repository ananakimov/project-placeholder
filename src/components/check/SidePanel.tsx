import { useEffect, useRef } from "react";
import { Bookmark, ChevronLeft, ChevronRight } from "lucide-react";
import type { Check, Row, SourceRef } from "@/data/mock";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentFields } from "./DocumentFields";
import { SourceViewer } from "./SourceViewer";

export function SidePanel({ check, row, sources, sourceIndex, onSourceChange }: {
  check: Check;
  row: Row;
  sources: readonly SourceRef[];
  sourceIndex: number;
  onSourceChange: (index: number) => void;
}) {
  const documentTabs = useRef<HTMLDivElement>(null);
  const source = sources[sourceIndex] ?? null;
  const doc = check.docs.find((item) => item.id === source?.docId) ?? null;

  useEffect(() => {
    const list = documentTabs.current;
    const active = list?.querySelector<HTMLElement>('[data-state="active"]');
    if (list && active) list.scrollTo({ left: active.offsetLeft - list.offsetLeft - 8 });
  }, [sourceIndex, sources]);

  return (
    <div className="source-tabs">
      <h3 className="source-document-title" title={doc?.title}>{doc?.title ?? "Источник документа"}</h3>
      {sources.length > 1 && (
        <Tabs value={String(sourceIndex)} onValueChange={(value) => onSourceChange(Number(value))}>
          <div className="document-picker">
            <button type="button" aria-label="Предыдущий документ" disabled={sourceIndex === 0}
              onClick={() => onSourceChange(sourceIndex - 1)}><ChevronLeft size={16} /></button>
            <TabsList ref={documentTabs} className="document-tabs" aria-label="Документы показателя">
              {sources.map((item, index) => {
                const title = check.docs.find((file) => file.id === item.docId)?.title ?? item.docId;
                return <TabsTrigger key={`${item.docId}:${index}`} value={String(index)}
                  aria-label={`${title}, источник ${index + 1}`} title={title}>
                  <Bookmark size={14} aria-hidden="true" /><span>{title}</span>
                </TabsTrigger>;
              })}
            </TabsList>
            <button type="button" aria-label="Следующий документ" disabled={sourceIndex >= sources.length - 1}
              onClick={() => onSourceChange(sourceIndex + 1)}><ChevronRight size={16} /></button>
          </div>
        </Tabs>
      )}
      <div className="source-context">
        <DocumentFields doc={doc} />
        {sources.length > 1 && <small className="ml-auto shrink-0 text-muted-foreground">
          {sourceIndex + 1} / {sources.length}
        </small>}
      </div>
      <div className="source-document-content">
        <SourceViewer row={row} source={source} doc={doc} />
      </div>
    </div>
  );
}
