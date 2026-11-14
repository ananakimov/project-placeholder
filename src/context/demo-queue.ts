import { useEffect, useRef, useState } from "react";
import { getCheck, type Check } from "@/data/mock";
import { isDemoRun } from "@/lib/check-location";

const STORAGE_KEY = "doccheck.demo-queue.v1";
const UPLOAD_MS = 850;
const MIN_WAIT_MS = 650;

const stages = [
  { label: "Загрузка файлов", start: 0, end: 12 },
  { label: "В очереди", start: 12, end: 12 },
  { label: "Чтение документов", start: 12, end: 44, duration: 1_900 },
  { label: "Извлечение данных", start: 44, end: 73, duration: 2_300 },
  { label: "Сопоставление с КФЗ", start: 73, end: 91, duration: 1_600 },
  { label: "Подготовка заключения", start: 91, end: 100, duration: 1_200 },
] as const;
const processing = stages.slice(2).filter((stage) => "duration" in stage);
const PROCESS_MS = processing.reduce((total, stage) => total + stage.duration, 0);

interface DemoJob {
  id: string;
  createdAt: number;
  startsAt: number;
  documents: number;
  kind?: "sample" | "manual";
  emptyFile?: boolean;
  result?: Check;
}

function readJobs(): DemoJob[] | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((job): job is DemoJob =>
      job !== null && typeof job === "object" && typeof job.id === "string" &&
      Number.isSafeInteger(job.createdAt) && Math.abs(job.createdAt) <= 8.64e15 &&
      Number.isSafeInteger(job.startsAt) && job.startsAt >= job.createdAt &&
      Number.isSafeInteger(job.documents) && job.documents > 0 &&
      (job.kind === undefined || job.kind === "manual" || (job.kind === "sample" && isDemoRun(job.id) &&
        job.result?.id === job.id && typeof job.result.kfzNumber === "string" &&
        Array.isArray(job.result.docs) && Array.isArray(job.result.rows))),
    );
  } catch {
    return null;
  }
}

function finishesAt(job: DemoJob) {
  return job.kind === "sample" ? job.startsAt + PROCESS_MS : job.createdAt + UPLOAD_MS;
}

function statusAt(job: DemoJob, now: number) {
  const upload = stages[0];
  const waiting = stages[1];
  const elapsed = now - job.createdAt;
  if (elapsed < UPLOAD_MS) {
    return {
      status: upload.label, progress: Math.floor(Math.max(0, elapsed) / UPLOAD_MS * upload.end),
      processed: 0, stage: 0, complete: false, failed: false,
    };
  }
  if (job.kind !== "sample") {
    return {
      status: job.emptyFile ? "Ошибка добавления" : "Требуется серверная сверка",
      progress: null, processed: 0, stage: -1, complete: true, failed: !!job.emptyFile,
    };
  }
  if (now < job.startsAt) {
    return { status: waiting.label, progress: waiting.start, processed: 0, stage: 1, complete: false, failed: false };
  }
  let remaining = now - job.startsAt;
  for (const [index, step] of processing.entries()) {
    if (remaining < step.duration) {
      const fraction = remaining / step.duration;
      const progress = Math.floor(step.start + (step.end - step.start) * fraction);
      const processed = index < 2 ? Math.floor(job.documents * (index + fraction) / 2) : job.documents;
      return { status: step.label, progress, processed, stage: index + 2, complete: false, failed: false };
    }
    remaining -= step.duration;
  }
  return { status: "Готово", progress: 100, processed: job.documents, stage: stages.length, complete: true, failed: false };
}

export type DemoJobEntry = DemoJob & ReturnType<typeof statusAt>;
export const DEMO_STAGES = stages.map(({ label }) => label);

function makeId() {
  const random = globalThis.crypto.randomUUID?.() ??
    Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)), (value) => value.toString(16)).join("-");
  return `demo-${random}` as const;
}

export function useDemoQueue() {
  const [jobs, setJobs] = useState<DemoJob[]>([]);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);
  const [storageError, setStorageError] = useState(false);
  const currentJobs = useRef<DemoJob[]>([]);
  const inMemory = useRef(false);

  useEffect(() => {
    function sync() {
      currentJobs.current = readJobs() ?? [];
      setJobs(currentJobs.current);
      setNow(Date.now());
    }
    sync();
    setReady(true);
    function onStorage(event: StorageEvent) {
      if (!inMemory.current && (event.key === STORAGE_KEY || event.key === null)) sync();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const running = jobs.some((job) => now < finishesAt(job));
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 150);
    return () => clearInterval(timer);
  }, [running]);

  function addJob(kind: "sample" | "manual", documents: number, emptyFile = false) {
    const createdAt = Date.now();
    const id = makeId();
    const previous = inMemory.current ? currentJobs.current : readJobs() ?? currentJobs.current;
    const startsAt = kind === "sample"
      ? Math.max(createdAt + UPLOAD_MS + MIN_WAIT_MS, ...previous.filter((job) => job.kind === "sample").map(finishesAt))
      : createdAt;
    const fixture = kind === "sample" ? getCheck("g") : undefined;
    if (kind === "sample" && !fixture) return;
    const result = fixture ? {
      ...fixture, id, createdAt, date: new Intl.DateTimeFormat("ru-RU", { timeZone: "UTC" }).format(createdAt),
    } : undefined;
    const next = [{
      id, createdAt, startsAt, documents: fixture?.docs.length ?? documents, kind,
      ...(result && { result }), ...(emptyFile && { emptyFile }),
    }, ...previous];
    if (!inMemory.current) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        inMemory.current = true;
        setStorageError(true);
      }
    }
    currentJobs.current = next;
    setNow(createdAt);
    setJobs(next);
  }

  const entries = jobs.map((job) => ({ ...job, ...statusAt(job, now) }));
  const results = jobs.flatMap((job) =>
    job.kind === "sample" && now >= finishesAt(job) && job.result ? [job.result] : [],
  );

  return {
    entries, results, ready, storageError,
    enqueue: (documents: number, emptyFile: boolean) => addJob("manual", documents, emptyFile),
    enqueueSample: () => addJob("sample", 0),
  };
}

export type DemoQueue = ReturnType<typeof useDemoQueue>;
