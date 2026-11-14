import { Check, X } from "lucide-react";
import { FileTypeIcon } from "./FileTypeIcon";

export type UploadFile = { name: string; size: number };
export const fileExtension = (name: string) => name.split(".").pop()?.toUpperCase() ?? "";
export const primaryFileTypes = ["PDF", "DOCX", "XLS", "XLSX", "PNG", "ZIP", "RAR", "7Z"];
export const primaryFileAccept = primaryFileTypes.map((extension) => `.${extension.toLowerCase()}`).join(",");


function sizeLabel(bytes: number) {
  return bytes >= 1048576
    ? `${(bytes / 1048576).toFixed(1).replace(".", ",")} МБ`
    : `${Math.max(1, Math.round(bytes / 1024))} КБ`;
}

export function UploadFileList({ files, onRemove }: { files: UploadFile[]; onRemove: (index: number) => void }) {
  return <ul className="upload-file-list !max-h-56 !gap-2" aria-label="Добавленные файлы">
    {files.map((file, index) => <li key={`${file.name}-${index}`}
      className="upload-file-row !min-h-0 !gap-2 !p-2 [&_.file-type-icon]:!h-8 [&_.file-type-icon]:!w-8">
      <FileTypeIcon extension={fileExtension(file.name)} />
      <div className="upload-file-info">
        <strong className="!text-sm" title={file.name}>{file.name}</strong>
        <span className="!text-xs">{sizeLabel(file.size)}</span>
      </div>
      <div className="upload-file-status !gap-1">
        <Check className="upload-complete-icon !h-5 !w-5" strokeWidth={2.5} aria-label="Файл добавлен" />
      </div>
      <button type="button" className="upload-remove" aria-label={`Убрать ${file.name}`} title="Убрать файл" onClick={() => onRemove(index)}>
        <X size={18} />
      </button>
    </li>)}
  </ul>;
}
