import { useRef, useState } from "react";
import { FilePlus2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fileExtension } from "@/components/UploadFiles";
import { isKfz } from "@/data/demo-recheck";
import type { Doc } from "@/data/mock";

type FileAction = { mode: "add" } | { mode: "replace"; id: string };

export function EditPackage({ docs, disabled, submit }: {
  docs: readonly Doc[];
  disabled: boolean;
  submit: (docs: readonly Doc[]) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Doc[]>([]);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const action = useRef<FileAction>({ mode: "add" });
  const original = new Set(docs.map((doc) => doc.id));
  const changed = draft.length !== docs.length || draft.some((doc) => !original.has(doc.id));

  function choose(actionType: FileAction) {
    action.current = actionType;
    input.current?.click();
  }

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const valid = Array.from(files).filter((file) => ["PDF", "PNG", "DOCX", "XLSX", "XLS"].includes(fileExtension(file.name)));
    setError(valid.length !== files.length ? "Поддерживаются PDF, PNG, DOCX, XLSX и XLS." : "");
    if (!valid.length) return;
    const additions: Doc[] = valid.map((file) => ({
      id: crypto.randomUUID(), title: file.name, fileName: file.name, type: fileExtension(file.name),
      number: "", date: "", contract: "", pages: 0, fields: [], state: "не прочитан", demoUpload: true,
    }));
    const current = action.current;
    setDraft((previous) => current.mode === "add"
      ? [...previous, ...additions]
      : previous.map((doc) => doc.id === current.id ? additions[0]! : doc));
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (next) { setDraft([...docs]); setError(""); }
      setOpen(next);
    }}>
      <DialogTrigger asChild><Button type="button" variant="outline" size="sm" disabled={disabled}>
        <Pencil size={16} aria-hidden="true" /> Изменить комплект
      </Button></DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-[min(42rem,calc(100%-1.5rem))] overflow-y-auto rounded-lg">
        <DialogTitle>Изменить комплект</DialogTitle>
        <DialogDescription>
          Демо-проверка использует сохранённые данные примера. Для добавленных файлов сохраняются названия и тип.
          Распознавание новых файлов и кеш OCR требуют серверной обработки.
        </DialogDescription>
        <input ref={input} type="file" aria-label="Файлы комплекта" hidden multiple accept=".pdf,.png,.docx,.xlsx,.xls"
          onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
        <ul aria-label="Состав комплекта" className="max-h-[45dvh] divide-y overflow-y-auto rounded-md border">
          {draft.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 break-words">{doc.title}</span>
              {isKfz(doc) ? <small className="text-muted-foreground">КФЗ</small> : (
                <span className="flex gap-1">
                  <Button type="button" size="icon" variant="ghost" title="Заменить" aria-label={`Заменить ${doc.title}`}
                    onClick={() => choose({ mode: "replace", id: doc.id })}><Pencil size={15} /></Button>
                  <Button type="button" size="icon" variant="ghost" title="Исключить" aria-label={`Исключить ${doc.title}`}
                    onClick={() => setDraft((previous) => previous.filter((item) => item.id !== doc.id))}><Trash2 size={15} /></Button>
                </span>
              )}
            </li>
          ))}
        </ul>
        <Button type="button" size="sm" variant="outline" className="justify-self-start"
          onClick={() => choose({ mode: "add" })}><FilePlus2 size={16} /> Добавить документ</Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" disabled={!changed} onClick={() => {
            if (submit(draft)) setOpen(false);
            else setError("Не удалось сохранить новую версию. Проверьте хранилище браузера и состояние проверки.");
          }}>Запустить повторную проверку</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
