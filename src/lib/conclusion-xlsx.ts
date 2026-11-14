import { strToU8, zipSync } from "fflate";
import type { Check, Doc } from "@/data/mock";
import { RULES, RULESET_VERSION } from "@/data/rules";
import { checkName } from "@/lib/check-name";
import { breakdownNotes, calculationText, indicatorStatus, rowExplanation, sourceCalculation } from "@/lib/check-explanation";

type Cell = string | number | null | undefined;
type Sheet = { name: string; rows: Cell[][]; widths: number[]; headers: number[] };
const spreadsheet = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const relationship = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const packageRelationship = "http://schemas.openxmlformats.org/package/2006/relationships";

function escapeXml(value: string) {
  return value.replace(/[^\t\n\r\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/gu, "")
    .replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);
}

function sheetXml({ rows, widths, headers }: Sheet) {
  return `<worksheet xmlns="${spreadsheet}"><cols>${widths.map((width, i) =>
    `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`).join("")}</cols><sheetData>${rows.map((row, i) =>
    `<row r="${i + 1}" ht="${rowHeight(row, widths)}" customHeight="1">${row.map((value, j) => {
      const address = String.fromCharCode(65 + j) + (i + 1);
      const style = headers.includes(i) ? 1 : typeof value === "number" && i > 4 ? 3 : 2;
      if (value == null) return `<c r="${address}" s="${style}"/>`;
      if (typeof value === "number") return `<c r="${address}" s="${style}"><v>${value}</v></c>`;
      return `<c r="${address}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
    }).join("")}</row>`).join("")}</sheetData></worksheet>`;
}

function rowHeight(row: Cell[], widths: number[]) {
  const lines = row.map((cell, i) => typeof cell === "string"
    ? cell.split("\n").reduce((total, line) => total + Math.max(1, Math.ceil(line.length / (widths[i]! * 0.8))), 0)
    : 1);
  return Math.min(409, Math.max(1, ...lines) * 15 + 7);
}

const styles = `<styleSheet xmlns="${spreadsheet}">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1C4649"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function workbook(sheets: Sheet[]) {
  const sheetIds = sheets.map((_, i) => i + 1);
  const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.";
  const fileContents = {
    "[Content_Types].xml": `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="${mime}sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="${mime}styles+xml"/>${sheetIds.map((id) => `<Override PartName="/xl/worksheets/sheet${id}.xml" ContentType="${mime}worksheet+xml"/>`).join("")}</Types>`,
    "_rels/.rels": `<Relationships xmlns="${packageRelationship}"><Relationship Id="rId1" Type="${relationship}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<workbook xmlns="${spreadsheet}" xmlns:r="${relationship}"><sheets>${sheets.map(({ name }, i) =>
      `<sheet name="${escapeXml(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<Relationships xmlns="${packageRelationship}">${sheetIds.map((id) =>
      `<Relationship Id="rId${id}" Type="${relationship}/worksheet" Target="worksheets/sheet${id}.xml"/>`).join("")}<Relationship Id="rIdStyles" Type="${relationship}/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": styles,
    ...Object.fromEntries(sheets.map((sheet, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(sheet)])),
  };
  return new Blob([zipSync(Object.fromEntries(Object.entries(fileContents).map(([path, xml]) => [path, strToU8(xml)])))],
    { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function fileName(doc: Doc | undefined) {
  return doc?.fileName ?? doc?.title;
}

function numericCell(value: string | null): Cell {
  if (value === null) return null;
  // Excel stores at most 15 significant digits. Keep longer amounts exact as text.
  return /^-?\d+(?:\.\d+)?$/.test(value) && value.replace(/[-.]/g, "").length <= 15 ? Number(value) : value;
}

export function conclusionWorkbook(check: Check, version: number, acceptedAt: number) {
  const docs = new Map(check.docs.map((doc) => [doc.id, doc]));
  const report = check.docs.find((doc) => doc.type === "КФЗ");
  const rows: Cell[][] = [
    ["Заключение о достоверности КФЗ", checkName(check), `Версия ${version}`, check.synthetic ? "Синтетические данные" : null],
    ["Проверяемая строка", check.reportRow, "Договор", check.contract, "Период", check.period],
    ["Файл КФЗ", fileName(report), "Дата проверки", check.date, "Принятие", new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(acceptedAt)],
    ["Заключение", check.conclusion],
    ["Показатель КФЗ", "Значение в КФЗ", "Ожидаемо по валидным документам", "Расхождение (КФЗ − документы)", "Статус", "Пояснение"],
    ...check.rows.map((row) => {
      const formula = calculationText(row, sourceCalculation(row, docs));
      return [row.name,
        numericCell(row.reported), numericCell(row.expected), numericCell(row.delta), indicatorStatus[row.status],
        [rowExplanation(row), formula, row.partialNote, ...(row.status === "verified" ? [] : [row.recommendation])].filter(Boolean).join("\n")];
    }),
  ];

  if (!check.rows.length) rows.push(["Показатели недоступны", null, null, null, null, "Для сверки нового КФЗ требуется серверное распознавание."]);
  const additional = rows.length + 1;
  rows.push([], ["Дополнительные проверки"]);
  for (const item of check.excluded) {
    rows.push([item.reason, item.file, null, null, "Исключён", item.impact]);
  }
  for (const doc of check.docs.filter((item) => item.state === "не прочитан")) {
    rows.push(["Ошибка чтения", fileName(doc), null, null, "Не прочитан",
      doc.demoUpload ? "Для файла требуется серверное распознавание." : "Не удалось прочитать данные файла."]);
  }
  for (const row of check.rows) {
    const notes = breakdownNotes(row.breakdown);
    if (notes.length) rows.push(["Детализация показателя", row.name, null, null, null, notes.join("\n")]);
  }

  return workbook([
    { name: "Заключение", rows, headers: [0, 4, additional], widths: [48, 42, 28, 27, 23, 74] },
    { name: "Источники", headers: [0], widths: [52, 52, 12, 52, 18, 26, 43, 37], rows: [
      ["Показатель КФЗ", "Файл", "Страница", "Фрагмент", "Слагаемое", "Роль источника", "Координаты (x, y, ширина, высота)", "Правило"],
      ...check.rows.flatMap((row) => {
        const addends = new Set(sourceCalculation(row, docs));
        return row.sources.map((source) => [row.name, fileName(docs.get(source.docId)) ?? source.docId,
          source.page, source.text, addends.has(source) ? numericCell(source.amount) : null,
          source.docId === report?.id ? "Значение в КФЗ" : addends.has(source) ? "Включён в расчёт" : "Источник проверки",
          source.bbox.join(", "), RULES[row.ruleId] ? `${RULES[row.ruleId]!.name} · ${RULESET_VERSION}` : row.ruleId]);
      }),
    ] },
  ]);
}
