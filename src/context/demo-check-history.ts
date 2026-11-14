import { useEffect, useRef, useState } from "react";
import type { Check } from "@/data/mock";

const STORAGE_KEY = "doccheck.demo-check-history.v1";

export type DemoCheckVersion = {
  number: number;
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
      Array.isArray(versions) && versions.length > 0 && versions.every((version) =>
        Number.isSafeInteger(version?.number) && Number.isFinite(version.createdAt) &&
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
  const createdAt = Date.UTC(year!, month! - 1, day!);
  return { number: 1, createdAt, readyAt: createdAt, acceptedAt: null, result: check };
}

export function useDemoCheckHistory() {
  const [history, setHistory] = useState<History>({});
  const [now, setNow] = useState(0);
  const [ready, setReady] = useState(false);
  const memory = useRef<History | null>(null);

  useEffect(() => {
    function sync() {
      if (memory.current === null) setHistory(readHistory() ?? {});
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
    const current = memory.current ?? readHistory() ?? history;
    const versions = edit(current[check.id] ?? [initialVersion(check)], time);
    if (!versions) return false;
    const next = { ...current, [check.id]: versions };
    if (memory.current === null) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        memory.current = next;
      }
    } else {
      memory.current = next;
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

  return { ready, now, versions, current, accept, update };
}

export type DemoCheckHistory = ReturnType<typeof useDemoCheckHistory>;
