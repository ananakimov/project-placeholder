import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import type { Check, Doc, Row, SourceRef } from "@/data/mock";
import { cn } from "@/lib/utils";
import { isKfz } from "@/data/demo-recheck";
import { SourceViewer } from "./SourceViewer";
import { fieldSource } from "./document-annotations";

type Evidence = { row: Row | undefined; sources: readonly SourceRef[]; index: number; request: number };

export function useSourceWorkspace(check: Check) {
  const [panelOpen, setPanelOpen] = useState(false);
  const reportId = check.docs.find(isKfz)?.id ?? "";
  const [docId, setDocId] = useState(reportId);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const request = useRef(0);
  const eye = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  function openEvidence(row: Row | undefined, sources: readonly SourceRef[], index: number, trigger: HTMLElement) {
    const source = sources[index];
    if (!source) return;
    returnFocus.current = trigger;
    setDocId(source.docId);
    setEvidence({ row, sources, index, request: ++request.current });
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

  return { panelOpen, docId, evidence, eye, openEvidence, openDocument, close, toggle, clearEvidence, selectDocument };
}

export function SourceWorkspace({ check, workspace }: {
  check: Check;
  workspace: ReturnType<typeof useSourceWorkspace>;
}) {
  const panelId = useId();
  const panel = useRef<HTMLElement>(null);
  const { docId, panelOpen, evidence, eye, toggle, selectDocument } = workspace;
  const docIndex = check.docs.findIndex((item) => item.id === docId);
  const doc = check.docs[docIndex];
  const source = evidence?.sources[evidence.index];
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
        <button type="button" aria-label="Предыдущий документ" disabled={docIndex <= 0}
          onClick={() => selectDocument(check.docs[docIndex - 1]!.id)}><ChevronLeft size={16} aria-hidden /></button>
        <select aria-label="Документы комплекта" title={doc?.title} value={docId} onChange={(event) => selectDocument(event.target.value)}>
          {!doc && <option value="" disabled>Выберите документ</option>}
          {check.docs.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
        <button type="button" aria-label="Следующий документ" disabled={docIndex >= check.docs.length - 1}
          onClick={() => selectDocument(check.docs[docIndex + 1]!.id)}><ChevronRight size={16} aria-hidden /></button>
      </div>}
      {doc ? (
        <SourceViewer doc={doc} source={source?.docId === docId ? source : null} request={evidence?.request ?? 0} />
      ) : <p className="source-empty-state">Исходный КФЗ отсутствует в комплекте.</p>}
    </section>
  </>;
}
