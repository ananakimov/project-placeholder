import { Bookmark, CalendarDays, ChevronDown, FileQuestion, Play } from "lucide-react";
import type { Doc, SourceRef } from "@/data/mock";
import { annotationKind, fieldSource, isSourceField } from "./document-annotations";

export function DocumentFields({
  doc,
  source,
  onLocate,
}: {
  doc: Doc | null;
  source: SourceRef | null;
  onLocate: (source: SourceRef) => void;
}) {
  if (!doc || !doc.fields.length)
    return (
      <div className="source-empty-state">
        <FileQuestion size={30} />
        <strong>Поля недоступны</strong>
        <p>
          {doc
            ? "Для этого документа нет распознанных полей."
            : "Выберите показатель с документом-источником."}
        </p>
      </div>
    );

  return (
    <div className="extracted-fields" key={doc.id}>
      <div className="extracted-fields-heading">
        <div>
          <h3>Извлечённые поля</h3>
          <p>{doc.title}</p>
        </div>
        <span className="record-count">{doc.fields.length}</span>
      </div>
      {[
        { title: "Реквизиты документа", fields: doc.fields.filter((f) => f.label !== "Сумма") },
        { title: "Финансовые данные", fields: doc.fields.filter((f) => f.label === "Сумма") },
      ]
        .filter((group) => group.fields.length)
        .map((group) => (
          <details className="extracted-group" key={group.title} open>
            <summary>
              {group.title}
              <ChevronDown size={20} />
            </summary>
            <div className="extracted-group-fields">
              {group.fields.map((field, i) => {
                const id = `extracted-${doc.id}-${field.label}-${i}`;
                const active = !!source && isSourceField(field, source);
                const money = field.label === "Сумма";
                return (
                  <div className="extracted-field" key={id}>
                    <div className="extracted-field-label">
                      <label htmlFor={id}>{field.label}</label>
                      <span>Стр. {field.page}</span>
                    </div>
                    <div
                      className="extracted-field-control"
                      data-active={active}
                      data-kind={annotationKind(field.label)}
                    >
                      {field.label === "Дата" && <CalendarDays size={19} />}
                      {money && <span className="field-currency">₽</span>}
                      <input id={id} value={field.value} readOnly title={field.value} />
                      <button
                        className={money ? "field-bookmark" : "field-source-link"}
                        aria-label={`Показать поле «${field.label}» в документе`}
                        aria-pressed={active}
                        title={`Перейти к источнику · стр. ${field.page}`}
                        onClick={() => onLocate(fieldSource(doc, field))}
                      >
                        {money ? (
                          <Bookmark size={22} fill="currentColor" strokeWidth={0} />
                        ) : (
                          <Play size={11} fill="currentColor" strokeWidth={0} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        ))}
      <p className="extracted-fields-hint">
        <Bookmark size={15} />
        Нажмите на маркер поля, чтобы увидеть его в документе.
      </p>
    </div>
  );
}
