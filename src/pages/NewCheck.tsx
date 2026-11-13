import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, FileUp, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadFileList, fileExtension, demoFileBroken, type UploadFile } from "@/components/UploadFiles";
import { SAMPLE_REPORT, SAMPLE_DOCS } from "@/data/sample-files";
import { cn } from "@/lib/utils";

type FileGroup = "report" | "docs";
const RUN = ["Чтение файлов", "Извлечение реквизитов", "Связывание", "Расчёт", "Правила"];

export function NewCheck() {
  const navigate = useNavigate();
  const [report, setReport] = useState<UploadFile[]>([]);
  const [docs, setDocs] = useState<UploadFile[]>([]);
  const [errors, setErrors] = useState({ report: "", docs: "" });
  const [run, setRun] = useState<number | null>(null);
  const canStart = report.length > 0 && docs.length > 0;
  const brokenFiles = [...report, ...docs].filter((file) => demoFileBroken(file.name));
  useEffect(() => {
    if (run === null) return;
    const timers = RUN.map((_, i) => setTimeout(() => setRun(i + 1), (i + 1) * 500));
    timers.push(setTimeout(() => navigate({ to: "/checks/$id", params: { id: "g" } }), RUN.length * 500 + 300));
    return () => timers.forEach(clearTimeout);
  }, [run !== null, navigate]);

  const takeFiles = (incoming: FileList | null, group: FileGroup) => {
    if (!incoming) return;
    const all = Array.from(incoming);
    const allowed = group === "report" ? ["PDF"] : ["PDF", "DOCX", "XLSX", "XLS", "PNG"];
    const accepted = all.filter((file) => allowed.includes(fileExtension(file.name))).map(({ name, size }) => ({ name, size }));
    setErrors((previous) => ({ ...previous, [group]: accepted.length < all.length ? `Поддерживаются: ${allowed.join(", ")}. Остальные файлы не добавлены.` : "" }));
    if (group === "report") setReport((previous) => accepted.length ? accepted.slice(0, 1) : previous);
    else setDocs((previous) => [...previous, ...accepted]);
  };
  const sample = () => {
    setReport([SAMPLE_REPORT]);
    setDocs(SAMPLE_DOCS);
    setErrors({ report: "", docs: "" });
    setRun(0);
  };

  if (run !== null) return (
    <div className="upload-page">
      <h1>Проверка выполняется</h1>
      <section className="upload-card run-card">
        <h2>Подготовка к сверке</h2>
        <p className="text-sm text-muted-foreground">КФЗ: {report[0]?.name} · Первичных документов: {docs.length}</p>
        <div className="run-progress" role="progressbar" aria-label="Этапы проверки" aria-valuenow={run} aria-valuemin={0} aria-valuemax={RUN.length}>
          <span style={{ width: `${(run / RUN.length) * 100}%` }} />
        </div>
        <ul className="run-steps">
          {RUN.map((label, i) => <li key={label} data-done={i < run}>
            <span>{i < run ? <Check size={20} /> : i === run ? <Loader2 size={20} className="animate-spin" /> : i + 1}</span>{label}
          </li>)}
        </ul>
        {brokenFiles.map((file) => <p key={file.name} className="upload-file-error">Файл не открыт: {file.name}. Остальные шаги продолжаются.</p>)}
      </section>
    </div>
  );

  return (
    <div className="upload-page">
      <h1>Новая проверка</h1>
      <p className="upload-intro">Добавьте отчёт и подтверждающие документы для сверки.</p>
      <div className="mt-6 grid grid-cols-1 items-start gap-5 md:grid-cols-2">
        <UploadBlock group="report" files={report} error={errors.report} onFiles={takeFiles} onRemove={() => setReport([])} />
        <UploadBlock group="docs" files={docs} error={errors.docs} onFiles={takeFiles} onRemove={(index) => setDocs((previous) => previous.filter((_, i) => i !== index))} />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button disabled={!canStart} onClick={() => canStart && setRun(0)}>Запустить проверку <ArrowRight size={17} /></Button>
        <Button variant="outline" onClick={sample}>Загрузить пример</Button>
        {!canStart && <span className="text-[13px] text-muted-foreground">Добавьте КФЗ и первичные документы</span>}
      </div>
    </div>
  );
}

function UploadBlock({ group, files, error, onFiles, onRemove }: {
  group: FileGroup;
  files: UploadFile[];
  error: string;
  onFiles: (files: FileList | null, group: FileGroup) => void;
  onRemove: (index: number) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const report = group === "report";
  return (
    <section aria-label={report ? "КФЗ" : "Первичные документы"} className={cn("upload-card min-w-0 !p-5", over && "is-dragging")}
      onDragOver={(event) => { event.preventDefault(); setOver(true); }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOver(false); }}
      onDrop={(event) => { event.preventDefault(); setOver(false); onFiles(event.dataTransfer.files, group); }}>
      <header className="upload-card-header !mb-4">
        <div><h2>{report ? "КФЗ" : "Первичные документы"}</h2><p>{report ? "Один файл PDF" : "PDF, DOCX, XLS, XLSX, PNG"}</p></div>
      </header>
      <input ref={input} type="file" hidden aria-label={report ? "Выбрать отчёт" : "Выбрать первичные документы"} multiple={!report}
        accept={report ? ".pdf" : ".pdf,.docx,.xls,.xlsx,.png"}
        onChange={(event) => { onFiles(event.target.files, group); event.target.value = ""; }} />
      {!files.length ? <div className="upload-empty !min-h-0 !py-5">
        <FileUp size={28} strokeWidth={1.5} />
        <p>{report ? "Перетащите КФЗ сюда" : "Перетащите документы сюда"}</p>
        <Button variant="outline" onClick={() => input.current?.click()}>Выбрать файл{report ? "" : "ы"}</Button>
      </div> : <>
        <UploadFileList files={files} previewTick={null} onRemove={onRemove} compact />
        <div className="upload-list-actions !mt-3">
          <button onClick={() => input.current?.click()}><Plus size={16} />{report ? "Заменить КФЗ" : "Добавить документы"}</button>
          <span>Файлов: {files.length}</span>
        </div>
      </>}
      {error && <p className="upload-validation" role="alert">{error}</p>}
    </section>
  );
}
