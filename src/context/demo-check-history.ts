import { useEffect, useState } from "react";
import type { Check, Doc } from "@/data/mock";
import { isKfz, recheckDemo } from "@/data/demo-recheck";

const STORAGE_KEY = "doccheck.demo-check-history.v1";

export type DemoCheckVersion = {
  number: number;
  parentVersion?: number;
  createdAt: number;
  readyAt: number;
  acceptedAt: number | null;
  result: Check;
};

type History = Record<string, DemoCheckVersion[]>;

function readHistory(): History | undefined {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const value: unknown = JSON.parse(stored);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([id, versions]) =>
      Array.isArray(versions) && versions.length > 0 && versions.every((version, index) =>
        version?.number === index + 1 && Number.isFinite(version.createdAt) &&
        (version.parentVersion === undefined || (Number.isInteger(version.parentVersion) &&
          version.parentVersion > 0 && version.parentVersion < version.number)) &&
        Number.isFinite(version.readyAt) && (version.acceptedAt === null || Number.isFinite(version.acceptedAt)) &&
        version.result?.id === id && Array.isArray(version.result.rows) && Array.isArray(version.result.docs),
      ),
    ));
  } catch {
    return undefined;
  }
}

function initialVersion(check: Check): DemoCheckVersion {
  const [day, month, year] = check.date.split(".").map(Number);
  const createdAt = check.createdAt ?? Date.UTC(year!, month! - 1, day!);
  return { number: 1, createdAt, readyAt: createdAt, acceptedAt: null, result: check };
}

export function useDemoCheckHistory() {
  const [history, setHistory] = useState<History>({});
  const [now, setNow] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function sync() {
      setHistory(readHistory() ?? {});
      setNow(Date.now());
    }
    sync();
    setReady(true);
    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY || event.key === null) sync();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const pending = Object.values(history).flat().some((version) => version.readyAt > now);
  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [pending]);

  function update(check: Check, edit: (versions: DemoCheckVersion[], time: number) => DemoCheckVersion[] | null) {
    if (!ready || !check.synthetic) return false;
    const time = Date.now();
    const current = readHistory();
    if (!current) return false;
    const versions = edit(current[check.id] ?? [initialVersion(check)], time);
    if (!versions) return false;
    const next = { ...current, [check.id]: versions };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      return false;
    }
    setHistory(next);
    setNow(time);
    return true;
  }

  function versions(check: Check) {
    return history[check.id] ?? [initialVersion(check)];
  }

  function current(check: Check) {
    return versions(check).filter((version) => version.number === 1 || version.readyAt <= now).at(-1)!;
  }

  function accept(check: Check, number: number) {
    return update(check, (previous, time) => {
      const version = previous.find((item) => item.number === number);
      if (!version || version.readyAt > time || version.acceptedAt !== null) return null;
      return previous.map((item) => item.number === number ? { ...item, acceptedAt: time } : item);
    });
  }

  function recheck(check: Check, from: number, docs: readonly Doc[]) {
    return update(check, (previous, time) => {
      const version = previous.find((item) => item.number === from);
      if (!version || version.readyAt > time || previous.some((item) => item.readyAt > time)) return null;
      const report = version.result.docs.find(isKfz);
      if (!report || docs.filter(isKfz).length !== 1 || !docs.some((doc) => doc.id === report.id) ||
          new Set(docs.map((doc) => doc.id)).size !== docs.length) return null;
      const oldIds = new Set(version.result.docs.map((doc) => doc.id));
      if (docs.length === oldIds.size && docs.every((doc) => oldIds.has(doc.id))) return null;
      const result = recheckDemo(version.result, docs);
      result.date = new Intl.DateTimeFormat("ru-RU", { timeZone: "UTC" }).format(time);
      return [...previous, { number: previous.length + 1, parentVersion: from,
        createdAt: time, readyAt: time + 4_000, acceptedAt: null, result }];
    });
  }

  return { ready, now, versions, current, accept, recheck };
}

export type DemoCheckHistory = ReturnType<typeof useDemoCheckHistory>;
