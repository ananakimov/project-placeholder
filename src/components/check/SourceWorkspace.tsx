import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import type { Check, Doc, Row, SourceRef } from "@/data/mock";
import { cn } from "@/lib/utils";
import { isKfz } from "@/data/demo-recheck";
import { DocumentFields } from "./DocumentFields";
import { SidePanel } from "./SidePanel";
import { SourceViewer } from "./SourceViewer";
import { fieldSource } from "./document-annotations";

type Evidence = { row: Row | undefined; sources: readonly SourceRef[]; index: number };

export function useSourceWorkspace(check: Check) {
  const [panelOpen, setPanelOpen] = useState(false);
  const reportId = check.docs.find(isKfz)?.id ?? "";
  const [docId, setDocId] = useState(reportId);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const eye = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  function openEvidence(row: Row | undefined, sources: readonly SourceRef[], index: number, trigger: HTMLElement) {
    const source = sources[index];
    if (!source) return;
    returnFocus.current = trigger;
    setDocId(source.docId);
    setEvidence({ row, sources, index });
    setPanelOpen(true);
    requestAnimationFrame(() => eye.current?.focus({ preventScroll: true }));
  }

  function openDocument(doc: Doc, trigger: HTMLElement) {
    const row = check.rows.find((item) => item.sources.some((source) => source.docId === doc.id));
    const excluded = check.excluded.find((item) => item.docId === doc.id);
    const excludedField = doc.fields.find((field) => field.label === excluded?.field);
    const field = excludedField ?? doc.fields.find((item) => item.label === "Сумма") ?? doc.fields[0];
    const source = (excludedField && fieldSource(doc, excludedField))
      ?? row?.sources.find((item) => item.docId === doc.id)
      ?? (field && fieldSource(doc, field));
    const relatedRow = row ?? check.rows.find((item) => excluded?.rowIds?.includes(item.id));
    if (source) {
      openEvidence(relatedRow, [source], 0, trigger);
      return;
    }
    returnFocus.current = trigger;
    setEvidence(null);
    setDocId(doc.id);
    setPanelOpen(true);
    requestAnimationFrame(() => eye.current?.focus({ preventScroll: true }));
  }

  function close() {
    setPanelOpen(false);
    requestAnimationFrame(() => {
      const trigger = returnFocus.current;
      if (trigger?.isConnected) trigger.focus({ preventScroll: !window.matchMedia?.("(max-width: 700px)").matches });
      else eye.current?.focus({ preventScroll: true });
    });
  }

  function toggle() {
    if (panelOpen) {
      close();
    } else {
      returnFocus.current = eye.current;
      setPanelOpen(true);
    }
  }

  const clearEvidence = useCallback(() => {
    setEvidence(null);
    setDocId(reportId);
    setPanelOpen(false);
  }, [reportId]);

  function selectDocument(nextId: string) {
    setDocId(nextId);
    setEvidence((previous) => {
      if (!previous || previous.sources[previous.index]?.docId === nextId) return previous;
      const index = previous.sources.findIndex((source) => source.docId === nextId);
      return index < 0 ? previous : { ...previous, index };
    });
  }

  function selectSource(index: number) {
    const source = evidence?.sources[index];
    if (!evidence || !source) return;
    setDocId(source.docId);
    setEvidence({ ...evidence, index });
  }

  return { panelOpen, docId, evidence, eye, openEvidence, openDocument, close, toggle, clearEvidence, selectDocument, selectSource };
}

export function SourceWorkspace({ check, workspace }: {
  check: Check;
  workspace: ReturnType<typeof useSourceWorkspace>;
}) {
  const panelId = useId();
  const panel = useRef<HTMLElement>(null);
  const { docId, panelOpen, evidence, eye, toggle, selectDocument, selectSource } = workspace;
  const docIndex = check.docs.findIndex((item) => item.id === docId);
  const doc = check.docs[docIndex];
  const activeEvidence = evidence?.sources[evidence.index]?.docId === docId ? evidence : null;
  const indicatorNavigation = (activeEvidence?.sources.length ?? 0) > 1;
  const PaneIcon = panelOpen ? Eye : EyeOff;

  useEffect(() => {
    if (panelOpen && window.matchMedia?.("(max-width: 700px)")?.matches) {
      panel.current?.scrollIntoView?.({ block: "start" });
    }
  }, [panelOpen]);

  return <>
    <aside className="source-workspace-rail" aria-label="Управление источником" data-print-hide>
      <button ref={eye} type="button" className={cn("nav-item source-workspace-toggle", panelOpen && "active")}
        aria-label={panelOpen ? "Скрыть источник документа" : "Показать источник документа"}
        title={panelOpen ? "Скрыть источник" : "Открыть источник"}
        aria-expanded={panelOpen} aria-controls={panelId} onClick={toggle}>
        <PaneIcon size={21} aria-hidden="true" />
      </button>
    </aside>
    <section ref={panel} id={panelId} aria-label="Источник документа" data-print-hide
      className="source-workspace-panel compact-source" inert={!panelOpen} aria-hidden={!panelOpen}>
      {check.docs.length > 0 && <div className="source-document-select">
        {!indicatorNavigation && <button type="button" aria-label="Предыдущий документ" disabled={docIndex <= 0}
          onClick={() => selectDocument(check.docs[docIndex - 1]!.id)}><ChevronLeft size={16} aria-hidden /></button>}
        <select aria-label="Документы комплекта" value={docId} onChange={(event) => selectDocument(event.target.value)}>
          {!doc && <option value="" disabled>Выберите документ</option>}
          {check.docs.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
        {!indicatorNavigation && <button type="button" aria-label="Следующий документ" disabled={docIndex >= check.docs.length - 1}
          onClick={() => selectDocument(check.docs[docIndex + 1]!.id)}><ChevronRight size={16} aria-hidden /></button>}
      </div>}
      {activeEvidence ? (
        <SidePanel check={check} row={activeEvidence.row} sources={activeEvidence.sources}
          sourceIndex={activeEvidence.index} onSourceChange={selectSource} />
      ) : doc ? (
        <div className="source-tabs">
          <h3 className="source-document-title" title={doc.title}>{doc.title}</h3>
          <div className="source-context"><DocumentFields doc={doc} /></div>
          <div className="source-document-content">
            <SourceViewer source={null} doc={doc} />
          </div>
        </div>
      ) : <p className="source-empty-state">Исходный КФЗ отсутствует в комплекте.</p>}
    </section>
  </>;
}
