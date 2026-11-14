import { useEffect, useRef, useState } from "react";
import {
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
  Check,
  Crosshair,
  Eye,
  EyeOff,
  FileQuestion,
  Info,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import type { Bbox, Doc, Row, SourceRef } from "@/data/mock";
import { formatMoney } from "@/components/money-format";
import {
  annotationKind,
  annotationTypes,
  isSourceField,
  type AnnotationKind,
} from "./document-annotations";
const pct = (b: Bbox) => ({
  left: `${b[0] * 100}%`,
  top: `${b[1] * 100}%`,
  width: `${b[2] * 100}%`,
  height: `${b[3] * 100}%`,
});
export function SourceViewer({
  row,
  source,
  doc,
}: {
  row?: Row;
  source: SourceRef | null;
  doc: Doc | null;
}) {
  if (doc?.demoUpload)
    return <div className="source-empty-state">
      <FileQuestion size={34} />
      <strong>Файл не распознан</strong>
      <p>Для этого файла сохранено имя. Оригинал и подтверждающий фрагмент появятся после серверной обработки.</p>
    </div>;
  if (!doc)
    return (
      <div className="source-empty-state">
        <FileQuestion size={34} />
        <strong>Нет подтверждающего документа</strong>
      </div>
    );
  return <Viewer key={`${row?.id ?? "document"}:${doc.id}`} source={source} doc={doc} />;
}
function Viewer({ source, doc }: { source: SourceRef | null; doc: Doc }) {
  const [page, setPage] = useState(source?.page ?? 1);
  const [zoom, setZoom] = useState(100);
  const [highlight, setHighlight] = useState(true);
  const [enabledKinds, setEnabledKinds] = useState(
    () => new Set<AnnotationKind>(annotationTypes.map((type) => type.kind)),
  );
  const [locate, setLocate] = useState(0);
  const [loadedImage, setLoadedImage] = useState<string | null>(null);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLDivElement>(null);
  const readable = doc.state !== "не прочитан";
  const pageImage = doc.previewPages?.[page - 1];
  const imageFailed = Boolean(pageImage && failedImage === pageImage.src);
  const pageReady = !pageImage || (loadedImage === pageImage.src && !imageFailed);
  const sourceField = source && doc.fields.find((field) => isSourceField(field, source));
  const sourceAmount = sourceField && annotationKind(sourceField.label) !== "money" ? null : source?.amount;
  const sourceKind = sourceField
    ? annotationKind(sourceField.label)
    : source?.amount
      ? "money"
      : "number";
  const showMark =
    readable && pageReady && source !== null && page === source.page && highlight && enabledKinds.has(sourceKind);
  useEffect(() => {
    if (!source) return;
    setPage(source.page);
    setHighlight(true);
    setEnabledKinds((previous) =>
      previous.has(sourceKind) ? previous : new Set([...previous, sourceKind]),
    );
    setLocate((n) => n + 1);
  }, [source, sourceKind]);
  useEffect(() => {
    const box = viewport.current;
    const el = mark.current;
    if (!showMark || !box || !el) return;
    const centerSource = () => {
      const r = el.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      box.scrollTo({
        top: box.scrollTop + r.top - b.top - (box.clientHeight - r.height) / 2,
        left: Math.max(0, box.scrollLeft + r.left - b.left - (box.clientWidth - r.width) / 2),
        behavior: "instant",
      });
    };
    centerSource();
    // Center the fragment after the pane or rendered page changes size.
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(centerSource);
    observer.observe(box);
    if (el.parentElement) observer.observe(el.parentElement);
    return () => observer.disconnect();
  }, [page, zoom, showMark, locate, source]);
  const locateSource = () => {
    if (!source) return;
    setPage(source.page);
    setHighlight(true);
    setEnabledKinds((previous) => new Set([...previous, sourceKind]));
    setLocate((n) => n + 1);
  };
  const fields = doc.fields.filter((f) => f.page === page);
  const amount = fields.find((f) => f.label === "Сумма");
  const amountY = amount?.bbox[1] ?? 0.76;
  return (
    <div className="document-viewer">
      {doc.state !== "прочитан" && (
        <div className="document-warning">
          {readable ? <Info size={15} /> : <AlertOctagon size={15} />}
          <span>
            {doc.state === "не прочитан"
              ? "Файл не распознан. Подсветка недоступна."
              : doc.state === "дубль"
                ? "Дубликат: не учитывается повторно."
                : doc.state === "вне периода"
                  ? "Дата вне периода проверки: документ исключён."
                  : "Документ относится к другому договору."}
          </span>
        </div>
      )}
      <div className="document-controls">
        <fieldset className="annotation-legend" disabled={!readable}>
          <legend>Извлечённые данные</legend>
          <div>
            {annotationTypes.map(({ kind, label }) => (
              <label key={kind} data-kind={kind}>
                <input
                  type="checkbox"
                  aria-label={`Подсветка: ${label}`}
                  checked={highlight && enabledKinds.has(kind)}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setHighlight(true);
                    setEnabledKinds((previous) => {
                      const next = highlight ? new Set(previous) : new Set<AnnotationKind>();
                      if (checked) next.add(kind);
                      else next.delete(kind);
                      return next;
                    });
                  }}
                />
                <span className="annotation-checkbox">
                  <Check size={12} strokeWidth={2.5} />
                </span>
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="document-toolbar">
          <div className="page-controls">
            <button
              aria-label="Предыдущая страница"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={15} />
            </button>
            <span aria-live="polite">
              Стр. {page} / {doc.pages}
            </span>
            <button
              aria-label="Следующая страница"
              disabled={page >= doc.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="zoom-controls">
            <button
              aria-label="Уменьшить масштаб"
              disabled={zoom <= 75}
              onClick={() => setZoom((z) => z - 25)}
            >
              <Minus size={14} />
            </button>
            <span aria-label="Масштаб документа">{zoom}%</span>
            <button
              aria-label="Увеличить масштаб"
              disabled={zoom >= 175}
              onClick={() => setZoom((z) => z + 25)}
            >
              <Plus size={14} />
            </button>
            <button
              aria-label="Сбросить масштаб"
              title="По ширине"
              disabled={zoom === 100}
              onClick={() => setZoom(100)}
            >
              <RotateCcw size={13} />
            </button>
          </div>
          <button
            aria-label={highlight ? "Скрыть подсветку" : "Показать подсветку"}
            title="Подсветка"
            aria-pressed={highlight}
            disabled={!readable}
            onClick={() => setHighlight((h) => !h)}
          >
            {highlight ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
        </div>
      </div>
      <div
        className="document-viewport"
        ref={viewport}
        tabIndex={0}
        aria-label={`Просмотр документа: ${doc.title}`}
      >
        <div
          className="document-sheet"
          style={{
            width: `${zoom}%`,
            ...(pageImage ? { aspectRatio: `${pageImage.width} / ${pageImage.height}` } : {}),
          }}
          aria-label={`Страница ${page} документа ${doc.title}`}
        >
          {imageFailed ? (
            <div className="paper-unreadable" role="alert">
              <AlertOctagon size={35} />
              <strong>Не удалось загрузить страницу</strong>
              <p>Проверьте соединение и попробуйте ещё раз.</p>
              <button
                onClick={() => {
                  setFailedImage(null);
                  setLoadedImage(null);
                }}
              >
                Повторить загрузку
              </button>
            </div>
          ) : readable ? (
            <>
              {pageImage ? (
                <img
                  key={pageImage.src}
                  className="document-page-image"
                  src={pageImage.src}
                  alt={`${doc.fileName ?? doc.title}, страница ${page}`}
                  width={pageImage.width}
                  height={pageImage.height}
                  draggable={false}
                  onLoad={() => setLoadedImage(pageImage.src)}
                  onError={() => setFailedImage(pageImage.src)}
                />
              ) : (
                <>
                  <div className="paper-eyebrow">
                    ПЕРВИЧНЫЙ ДОКУМЕНТ <span>№ {doc.number}</span>
                  </div>
                  {fields
                    .filter((f) => f.label !== "Сумма")
                    .map((f) => (
                      <div key={`${f.label}-${f.page}`} className="paper-field" style={pct(f.bbox)}>
                        <small>{f.label}</small>
                        <span>{f.value}</span>
                      </div>
                    ))}
                  <div className="paper-title">
                    {doc.type}
                    <small>{doc.title}</small>
                  </div>
                  {amountY > 0.5 && (
                    <div className="paper-context">
                      <p>
                        Документ № {doc.number} от {doc.date}
                      </p>
                      <p>Основание: договор {doc.contract}</p>
                      <div className="paper-rule" />
                    </div>
                  )}
                  {amount && (
                    <>
                      <div className="paper-table-heading" style={{ top: `${amountY * 100 - 7}%` }}>
                        <span>Наименование</span>
                        <span>Сумма, ₽</span>
                      </div>
                      <div
                        className="paper-item-name"
                        style={{
                          top: `${amountY * 100}%`,
                          width: `${(amount.bbox[0] - 0.17) * 100}%`,
                        }}
                      >
                        {doc.title}
                      </div>
                      <div className="paper-amount" style={pct(amount.bbox)}>
                        {amount.value}
                      </div>
                      {amountY <= 0.82 && (
                        <div className="paper-total-line" style={{ top: `${amountY * 100 + 6}%` }}>
                          <span>Сумма в документе</span>
                          <strong>{amount.value} ₽</strong>
                        </div>
                      )}
                    </>
                  )}
                  {!amount && source && (
                    <div className="paper-no-amount">
                      На этой странице нет суммы из выбранной ссылки.
                      <button onClick={locateSource}>
                        Перейти к источнику · стр. {source.page}
                      </button>
                    </div>
                  )}
                  <div className="paper-footer">
                    <span>№ {doc.number}</span>
                    <span>
                      {page} / {doc.pages}
                    </span>
                  </div>
                </>
              )}
              {pageReady &&
                highlight &&
                fields
                  .filter((field) => enabledKinds.has(annotationKind(field.label)))
                  .map((field) => {
                    const active = source !== null && isSourceField(field, source);
                    return (
                      <div
                        key={`${field.label}-${field.page}`}
                        ref={active ? mark : undefined}
                        className="source-highlight"
                        data-kind={annotationKind(field.label)}
                        data-active={active}
                        style={pct(field.bbox)}
                        aria-label={
                          active && source
                            ? `Подсвеченный фрагмент: ${source.text}`
                            : `Распознанное поле: ${field.label}: ${field.value}`
                        }
                      >
                        <span className="highlight-corner" />
                        <span className="highlight-corner" />
                      </div>
                    );
                  })}
              {source && showMark && !sourceField && (
                <div
                  ref={mark}
                  className="source-highlight"
                  data-kind={sourceKind}
                  data-active="true"
                  style={pct(source.bbox)}
                  aria-label={`Подсвеченный фрагмент: ${source.text}`}
                >
                  <span className="highlight-corner" />
                  <span className="highlight-corner" />
                </div>
              )}
            </>
          ) : (
            <div className="paper-unreadable">
              <AlertOctagon size={35} />
              <strong>Не удалось прочитать файл</strong>
              <p>Нужна читаемая копия документа.</p>
            </div>
          )}
        </div>
      </div>
      {source && <div className="document-source-footer">
        <div>
          <small>
            {sourceAmount ? "Сумма в выбранном документе" : "Выбранный фрагмент"} · стр.{" "}
            {source.page}
          </small>
          <strong>{sourceAmount ? `${formatMoney(sourceAmount)} ₽` : source.text}</strong>
        </div>
        <button
          onClick={locateSource}
          disabled={!readable}
          title="Перейти к подсвеченному фрагменту"
        >
          <Crosshair size={16} />
          {sourceAmount ? "К сумме" : "К фрагменту"}
        </button>
      </div>}
    </div>
  );
}
