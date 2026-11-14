import { useRef, useState } from "react";
import { ArrowRight, FileUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadFileList, fileExtension, primaryFileTypes, primaryFileAccept, type UploadFile } from "@/components/UploadFiles";
import { useChecks } from "@/context/ChecksContext";
import { DemoHistory } from "@/components/check/DemoHistory";
import { cn } from "@/lib/utils";

type FileGroup = "report" | "docs";
export function NewCheck() {
  const [report, setReport] = useState<UploadFile[]>([]);
  const [docs, setDocs] = useState<UploadFile[]>([]);
  const [errors, setErrors] = useState({ report: "", docs: "" });
  const { demoQueue } = useChecks();
  const canStart = demoQueue.ready && report.length === 1 && docs.length > 0;

  function submit() {
    if (!canStart) return;
    demoQueue.enqueue(report.length + docs.length, [...report, ...docs].some((file) => file.size === 0));
    setReport([]);
    setDocs([]);
    setErrors({ report: "", docs: "" });
  }

  const takeFiles = (incoming: FileList | null, group: FileGroup) => {
    if (!incoming) return;
    const all = Array.from(incoming);
    const allowed = group === "report" ? ["PDF"] : primaryFileTypes;
    const accepted = all.filter((file) => allowed.includes(fileExtension(file.name))).map(({ name, size }) => ({ name, size }));
    setErrors((previous) => ({ ...previous, [group]: accepted.length < all.length ? `Поддерживаются: ${allowed.join(", ")}. Остальные файлы не добавлены.` : "" }));
    if (group === "report") setReport((previous) => accepted.length ? accepted.slice(0, 1) : previous);
    else setDocs((previous) => [...previous, ...accepted]);
  };
  return (
    <div className="upload-page">
      <h1>Новая проверка</h1>
      <p className="upload-intro">Добавьте КФЗ и первичные документы.</p>
      <div className="mt-6 grid grid-cols-1 items-start gap-5 md:grid-cols-2">
        <UploadBlock group="report" files={report} error={errors.report} onFiles={takeFiles} onRemove={() => setReport([])} />
        <UploadBlock group="docs" files={docs} error={errors.docs} onFiles={takeFiles} onRemove={(index) => setDocs((previous) => previous.filter((_, i) => i !== index))} />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button disabled={!canStart} onClick={submit}>Запустить проверку <ArrowRight size={17} /></Button>
        <Button variant="outline" disabled={!demoQueue.ready} onClick={demoQueue.enqueueSample}>Загрузить пример</Button>
      </div>
      <DemoHistory />
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
        <div><h2>{report ? "КФЗ" : "Первичные документы"}</h2><p>{report ? "Один файл PDF" : primaryFileTypes.join(", ")}</p></div>
      </header>
      <input ref={input} type="file" hidden aria-label={report ? "Выбрать отчёт" : "Выбрать первичные документы"} multiple={!report}
        accept={report ? ".pdf" : primaryFileAccept}
        onChange={(event) => { onFiles(event.target.files, group); event.target.value = ""; }} />
      {!files.length ? <div className="upload-empty !min-h-0 !py-5">
        <FileUp size={28} strokeWidth={1.5} />
        <p>{report ? "Перетащите КФЗ сюда" : "Перетащите документы сюда"}</p>
        <Button variant="outline" onClick={() => input.current?.click()}>Выбрать файл{report ? "" : "ы"}</Button>
      </div> : <>
        <UploadFileList files={files} onRemove={onRemove} />
        <div className="upload-list-actions !mt-3">
          <button onClick={() => input.current?.click()}><Plus size={16} />{report ? "Заменить КФЗ" : "Добавить документы"}</button>
          <span>Файлов: {files.length}</span>
        </div>
      </>}
      {error && <p className="upload-validation" role="alert">{error}</p>}
    </section>
  );
}
