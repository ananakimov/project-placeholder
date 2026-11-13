import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { checks as baseChecks, type Check } from "@/data/mock";

export const CURRENT_USER = "Иванова А. С.";
type Signature = { by: string; at: string } | null;
type PerCheck<T> = Record<string, T>;

function signatureStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Наложение заранее посчитанных вариантов на исходную проверку. Ничего не пересчитывает. */
export function applyVariants(base: Check, applied: Record<string, string>): Check {
  let c: Check = { ...base, rows: base.rows.map((r) => ({ ...r })) };
  for (const [rowId, key] of Object.entries(applied)) {
    const baseRow = base.rows.find((r) => r.id === rowId);
    const v = baseRow?.variants?.[key];
    if (!v) continue;
    c.rows = c.rows.map((r) => (r.id === rowId ? { ...r, ...v.patch } : r));
    const cp = v.checkPatch;
    if (cp?.rows) c.rows = c.rows.map((r) => (cp.rows![r.id] ? { ...r, ...cp.rows![r.id] } : r));
    if (cp?.coverage) c = { ...c, coverage: cp.coverage };
    if (cp?.conclusion) c = { ...c, conclusion: cp.conclusion };
  }
  return c;
}

type Ctx = {
  checks: Check[];
  getCheck: (id: string) => Check | undefined;
  applied: PerCheck<Record<string, string>>;
  reviewed: PerCheck<Set<string>>;
  comments: Record<string, string>;
  flagged: Set<string>;
  signature: PerCheck<Signature>;
  applyVariant: (checkId: string, rowId: string, key: string) => void;
  markReviewed: (checkId: string, rowId: string) => void;
  addComment: (rowId: string, text: string) => void;
  toggleFlag: (rowId: string) => void;
  explanations: Record<string, string>;
  setExplanation: (checkId: string, text: string) => void;
  sign: (checkId: string) => void;
  resetSignature: (checkId: string) => void;
};
const C = createContext<Ctx | null>(null);

export function ChecksProvider({ children }: { children: ReactNode }) {
  const [applied, setApplied] = useState<PerCheck<Record<string, string>>>({});
  const [reviewed, setReviewed] = useState<PerCheck<Set<string>>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [signature, setSignature] = useState<PerCheck<Signature>>({});
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [resign, setResign] = useState<Set<string>>(new Set());

  const checks = useMemo(
    () =>
      baseChecks.map((b) => {
        const c = applyVariants(b, applied[b.id] ?? {});
        const state: Check["state"] = signature[b.id] ? "Подписано" : resign.has(b.id) ? "Нужна повторная подпись" : b.state;
        return { ...c, state };
      }),
    [applied, signature, resign],
  );

  const value: Ctx = {
    checks,
    getCheck: (id) => checks.find((c) => c.id === id),
    applied, reviewed, comments, flagged, signature,
    applyVariant: (checkId, rowId, key) => {
      setApplied((p) => ({ ...p, [checkId]: { ...(p[checkId] ?? {}), [rowId]: key } }));
      if (signature[checkId]) {
        setSignature((p) => ({ ...p, [checkId]: null }));
        setResign((p) => new Set(p).add(checkId));
      }
    },
    markReviewed: (checkId, rowId) => setReviewed((p) => ({ ...p, [checkId]: new Set(p[checkId] ?? []).add(rowId) })),
    addComment: (rowId, text) => setComments((p) => ({ ...p, [rowId]: text })),
    toggleFlag: (rowId) => setFlagged((p) => { const n = new Set(p); n.has(rowId) ? n.delete(rowId) : n.add(rowId); return n; }),
    explanations,
    setExplanation: (checkId, text) => setExplanations((p) => ({ ...p, [checkId]: text })),
    sign: (checkId) => {
      setSignature((p) => ({ ...p, [checkId]: { by: CURRENT_USER, at: signatureStamp() } }));
      setResign((p) => { const n = new Set(p); n.delete(checkId); return n; });
    },
    resetSignature: (checkId) => setSignature((p) => ({ ...p, [checkId]: null })),
  };
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useChecks() {
  const v = useContext(C);
  if (!v) throw new Error("useChecks must be used inside ChecksProvider");
  return v;
}
