import { AlertCircle, Check, X } from "lucide-react";
import { FileTypeIcon } from "./FileTypeIcon";

export type UploadFile = { name: string; size: number };
export const fileExtension = (name: string) => name.split(".").pop()?.toUpperCase() ?? "";
export const demoFileBroken = (name: string) => name.toLowerCase().includes("повреждён");
const sizeLabel = (bytes: number) =>
  bytes >= 1048576
    ? `${(bytes / 1048576).toFixed(1).replace(".", ",")} МБ`
    : `${Math.max(1, Math.round(bytes / 1024))} КБ`;

export function UploadProgress({ value }: { value: number }) {
  const progress = Math.max(0, Math.min(100, value));
  return (
    <svg
      className="upload-progress-ring"
      viewBox="0 0 48 48"
      role="progressbar"
      aria-label="Загрузка файла"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
    >
      <circle className="ring-track" cx="24" cy="24" r="20" fill="none" strokeWidth="6" />
      <circle
        className="ring-value"
        cx="24"
        cy="24"
        r="20"
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        pathLength="100"
        strokeDasharray={`${progress} 100`}
        transform="rotate(-90 24 24)"
      />
    </svg>
  );
}

export function UploadFileList({
  files,
  onRemove,
  previewTick,
}: {
  files: UploadFile[];
  onRemove: (index: number) => void;
  previewTick: number | null;
}) {
  if (!files.length) return null;
  return (
    <ul className="upload-file-list" aria-label="Добавленные файлы">
      {files.map((file, i) => {
        const error = demoFileBroken(file.name);
        const progress =
          previewTick === null || i < 2
            ? 100
            : Math.min(100, (i === 2 ? 72 : 24) + previewTick * 4);
        return (
          <li className="upload-file-row" key={`${file.name}-${i}`} data-error={error || undefined}>
            <FileTypeIcon extension={fileExtension(file.name)} />
            <div className="upload-file-info">
              <strong title={file.name}>{file.name}</strong>
              <span>
                {sizeLabel(file.size)}
                {error && <span className="upload-file-error"> · Файл не открыт</span>}
              </span>
            </div>
            <div className="upload-file-status">
              {error ? (
                <AlertCircle className="upload-error-icon" aria-label="Ошибка чтения примера" />
              ) : (
                <>
                  <span className="upload-percent">
                    {progress}
                    <small>%</small>
                  </span>
                  {progress === 100 ? (
                    <Check
                      className="upload-complete-icon"
                      strokeWidth={2.5}
                      aria-label="Файл добавлен"
                    />
                  ) : (
                    <UploadProgress value={progress} />
                  )}
                </>
              )}
            </div>
            <button
              className="upload-remove"
              onClick={() => onRemove(i)}
              aria-label={`Убрать ${file.name}`}
              title="Убрать файл"
            >
              <X size={18} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
