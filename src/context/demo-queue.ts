import { useEffect, useState } from "react";

const STORAGE_KEY = "doccheck.demo-queue.v1";
const DURATION_MS = 5_000;

interface DemoJob {
  id: string;
  createdAt: number;
  startsAt: number;
  documents: number;
}

function readJobs(): DemoJob[] | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((job): job is DemoJob =>
      job !== null && typeof job === "object" && typeof job.id === "string" &&
      Number.isSafeInteger(job.createdAt) && Math.abs(job.createdAt) <= 8.64e15 &&
      Number.isSafeInteger(job.startsAt) &&
      job.startsAt >= job.createdAt && Number.isSafeInteger(job.documents) && job.documents > 0,
    );
  } catch {
    return null;
  }
}

export function useDemoQueue() {
  const [jobs, setJobs] = useState<DemoJob[]>([]);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    function sync() {
      setJobs(readJobs() ?? []);
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

  const running = jobs.some(({ startsAt }) => now < startsAt + DURATION_MS);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [running]);

  function enqueue(documents: number) {
    const createdAt = Date.now();
    const id = globalThis.crypto.randomUUID?.() ??
      Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)), (value) => value.toString(16)).join("-");
    const previous = readJobs() ?? jobs;
    const startsAt = Math.max(createdAt, ...previous.map((job) => job.startsAt + DURATION_MS));
    const next = [{ id, createdAt, startsAt, documents }, ...previous].slice(0, 50);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // The demo continues in memory if the browser blocks storage.
    }
    setNow(createdAt);
    setJobs(next);
  }

  const entries = jobs.map((job) => ({
    ...job,
    status: now < job.startsAt ? "В очереди" :
      now < job.startsAt + DURATION_MS ? "Имитация обработки" : "Демо завершено",
  }));
  return { entries, enqueue, ready };
}

export type DemoQueue = ReturnType<typeof useDemoQueue>;
