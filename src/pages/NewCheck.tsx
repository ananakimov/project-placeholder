import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, FileUp, Loader2, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  UploadFileList,
  fileExtension,
  demoFileBroken,
  type UploadFile,
} from "@/components/UploadFiles";
import { cn } from "@/lib/utils";

const SAMPLE_REPORT: UploadFile = { name: "КФЗ этап 3 СИН-2026-15.pdf", size: 418_000 };
const MONTHS = ["январь", "февраль", "март", "апрель", "май"];
const SAMPLE_DOCS: UploadFile[] = [
  ...MONTHS.map((m, i) => [`Ведомость ЗП ${m} 2026.xlsx`, 57_000 + i * 300] as const),
  ...MONTHS.map((m, i) => [`Расчёт страховых взносов ${m} 2026.xlsx`, 41_000 + i * 200] as const),
  ["Акт ТО-31.pdf", 182_000],
  ["Счёт-акт ТО-48.pdf", 96_400],
  ["Служебная записка КЛ-7.docx", 38_200],
  ["УПД 0426-12.pdf", 124_000],
  ["Акт ИА-9.pdf", 176_000],
  ["Акт АД-12.pdf", 168_000],
  ["Справка ИТ 03-26.docx", 42_500],
  ["Акт связи 0426.png", 1_640_000],
  ["УПД УПР-21.pdf", 131_000],
  ["Акт АД-12 (копия).pdf", 168_000],
  ["Акт ОР-0603.pdf", 154_000],
  ["Акт АД-31 от 15.05.2026.pdf", 161_000],
].map(([name, size]) => ({ name: name as string, size: size as number }));
const SAMPLE_DOCS_BROKEN: UploadFile[] = SAMPLE_DOCS.map((f) =>
  f.name === "Ведомость ЗП март 2026.xlsx"
    ? { ...f, name: "Ведомость ЗП март 2026 (повреждён).xlsx" }
    : f,
);

const STEPS = ["Отчёт (КФЗ)", "Первичные документы"];
const fileWord = (n: number) =>
  n % 10 === 1 && n % 100 !== 11
    ? "файл"
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
      ? "файла"
      : "файлов";
const RUN = ["Чтение файлов", "Извлечение реквизитов", "Связывание", "Расчёт", "Правила"];

export function NewCheck() {
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [report, setReport] = useState<UploadFile[]>([]);
  const [docs, setDocs] = useState<UploadFile[]>([]);
  const [over, setOver] = useState(false);
  const [error, setError] = useState("");
  const [previewTick, setPreviewTick] = useState<number | null>(null);
  const [run, setRun] = useState<number | null>(null);
  const files = step === 0 ? report : docs;
  const canStart = report.length > 0 && docs.length > 0;
  const brokenFiles = [...report, ...docs].filter((f) => demoFileBroken(f.name));
  useEffect(() => {
    if (previewTick === null) return;
    const timer = setInterval(
      () => setPreviewTick((tick) => (tick === null || tick >= 19 ? null : tick + 1)),
      250,
    );
    return () => clearInterval(timer);
  }, [previewTick === null]);
  useEffect(() => {
    if (run === null) return;
    const timers = RUN.map((_, i) => setTimeout(() => setRun(i + 1), (i + 1) * 500));
    timers.push(
      setTimeout(
        () => navigate({ to: "/checks/$id", params: { id: "g" } }),
        RUN.length * 500 + 300,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [run !== null, navigate]);

  const changeStep = (next: number) => {
    setStep(next);
    setError("");
    setPreviewTick(null);
  };
  const takeFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const all = Array.from(incoming);
    const allowed = step === 0 ? ["PDF"] : ["PDF", "DOCX", "XLSX", "XLS", "PNG"];
    const accepted = all
      .filter((file) => allowed.includes(fileExtension(file.name)))
      .map(({ name, size }) => ({ name, size }));
    setError(
      accepted.length < all.length
        ? `Поддерживаются: ${allowed.join(", ")}. Остальные файлы не добавлены.`
        : "",
    );
    if (step === 0) setReport((previous) => (accepted.length ? accepted.slice(0, 1) : previous));
    else setDocs((previous) => [...previous, ...accepted]);
    setPreviewTick(null);
  };
  const sample = (broken = false) => {
    setError("");
    if (step === 0) setReport([SAMPLE_REPORT]);
    else {
      setDocs(broken ? SAMPLE_DOCS_BROKEN : SAMPLE_DOCS);
      setPreviewTick(0);
    }
  };
  const start = () => {
    if (canStart) {
      setPreviewTick(null);
      setRun(0);
    }
  };

  if (run !== null)
    return (
      <div className="upload-page">
        <h1>Проверка выполняется</h1>
        <section className="upload-card run-card">
          <h2>Подготовка к сверке</h2>
          <div
            className="run-progress"
            role="progressbar"
            aria-label="Этапы проверки"
            aria-valuenow={run}
            aria-valuemin={0}
            aria-valuemax={RUN.length}
          >
            <span style={{ width: `${(run / RUN.length) * 100}%` }} />
          </div>
          <ul className="run-steps">
            {RUN.map((label, i) => (
              <li key={label} data-done={i < run}>
                <span>
                  {i < run ? (
                    <Check size={20} />
                  ) : i === run ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    i + 1
                  )}
                </span>
                {label}
              </li>
            ))}
          </ul>
          {brokenFiles.map((file) => (
            <p key={file.name} className="upload-file-error">
              Файл не открыт: {file.name}. Остальные шаги продолжаются.
            </p>
          ))}
        </section>
      </div>
    );

  return (
    <div className="upload-page">
      <h1>Новая проверка</h1>
      <p className="upload-intro">Добавьте отчёт и подтверждающие документы для сверки.</p>
      <ol className="upload-steps" aria-label="Шаги">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button onClick={() => changeStep(i)} aria-current={step === i ? "step" : undefined}>
              <span>
                {(i === 0 ? report.length : docs.length) > 0 && step !== i ? (
                  <Check size={16} />
                ) : (
                  i + 1
                )}
              </span>
              {label}
            </button>
            {i === 0 && <ArrowRight size={16} aria-hidden="true" />}
          </li>
        ))}
      </ol>
      <section
        className={cn("upload-card", over && "is-dragging")}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          takeFiles(event.dataTransfer.files);
        }}
      >
        <header className="upload-card-header">
          <div>
            <h2>Загрузка документов</h2>
            <p>
              {step === 0
                ? "Отчёт КФЗ · один файл PDF"
                : "Первичные документы · PDF, DOCX, XLS, XLSX, PNG"}
            </p>
          </div>
          <Button variant="ghost" onClick={() => sample()}>
            Загрузить пример
          </Button>
        </header>
        <input
          key={step}
          ref={input}
          type="file"
          hidden
          aria-label={step === 0 ? "Выбрать отчёт" : "Выбрать первичные документы"}
          multiple={step === 1}
          accept={step === 0 ? ".pdf" : ".pdf,.docx,.xls,.xlsx,.png"}
          onChange={(event) => {
            takeFiles(event.target.files);
            event.target.value = "";
          }}
        />
        {files.length === 0 ? (
          <div className="upload-empty">
            <div className="upload-empty-icon">
              <FileUp size={32} strokeWidth={1.5} />
            </div>
            <h3>{step === 0 ? "Перетащите отчёт сюда" : "Перетащите документы сюда"}</h3>
            <p>или выберите {step === 0 ? "файл" : "файлы"} на компьютере</p>
            <Button variant="outline" onClick={() => input.current?.click()}>
              Выбрать файл{step === 1 ? "ы" : ""}
            </Button>
          </div>
        ) : (
          <>
            <UploadFileList
              files={files}
              previewTick={previewTick}
              onRemove={(index) =>
                step === 0
                  ? setReport([])
                  : setDocs((previous) => previous.filter((_, i) => i !== index))
              }
            />
            <div className="upload-list-actions">
              <button onClick={() => input.current?.click()}>
                <Plus size={18} />
                {step === 0 ? "Заменить отчёт" : "Добавить документы"}
              </button>
              <span>
                {files.length} {fileWord(files.length)}
              </span>
              {step === 1 && (
                <button onClick={() => setPreviewTick(0)} disabled={previewTick !== null}>
                  <RotateCcw size={15} />
                  {previewTick !== null ? "Загрузка…" : "Показать загрузку"}
                </button>
              )}
            </div>
          </>
        )}
        {error && (
          <p className="upload-validation" role="alert">
            {error}
          </p>
        )}
        {step === 1 && (
          <footer className="upload-card-footer">
            <button onClick={() => sample(true)}>Пример с повреждённым файлом</button>
          </footer>
        )}
      </section>
      <div className="upload-navigation">
        <Button variant="outline" disabled={step === 0} onClick={() => changeStep(step - 1)}>
          Назад
        </Button>
        {step === 0 ? (
          <Button onClick={() => changeStep(1)} aria-label="Перейти к шагу «Первичные документы»">
            Первичные документы <ArrowRight size={17} />
          </Button>
        ) : (
          <div>
            {!canStart && <span>Добавьте отчёт и документы</span>}
            <Button disabled={!canStart} onClick={start}>
              Запустить проверку <ArrowRight size={17} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
