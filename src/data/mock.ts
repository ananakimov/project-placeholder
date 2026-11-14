import { formatMoney } from "@/components/money-format";
import { SAMPLE_FILES } from "@/data/sample-files";
import { withSamplePreview } from "@/data/sample-document-previews";

export type Status = "verified" | "discrepancy" | "unverified";
export type Bbox = [number, number, number, number]; // x, y, w, h в долях 0–1
export type SourceRef = { docId: string; page: number; bbox: Bbox; text: string; amount: string | null; matchType: "точное" | "после нормализации" };
export type RowVariant = {
  label: string;
  patch: Partial<Row>;
  checkPatch?: { rows?: Record<string, Partial<Row>>; coverage?: Check["coverage"]; conclusion?: Check["conclusion"] };
};
export type Row = {
  id: string; name: string; reported: string; expected: string | null; delta: string | null; status: Status;
  category: string | null; reason: string; ruleId: string; sources: SourceRef[]; partialNote?: string | undefined; manual?: boolean;
  causes?: string[];
  evidenceDependencies?: string[];
  recommendation?: string;
  /** Служебная строка (арифметика/итог) — не входит в счётчики показателей. */
  service?: boolean;
  variants?: Record<string, RowVariant>;
  /** Единица измерения для нефинансовых показателей (значение — число, не деньги). */
  unit?: string;
  /** Вложенная строка («в т.ч.») — не входит в покрытие по деньгам. */
  nested?: boolean;
  /** Расшифровка колонок «в том числе» из КФЗ; не отдельные показатели покрытия. */
  breakdown?: Breakdown[];
};
export type Breakdown = { name: string; reported: string; note?: string; children?: Breakdown[] };
export type Doc = { id: string; demoUpload?: boolean; title: string; fileName?: string; type: string; number: string; date: string; contract: string; pages: number; previewPages?: { src: string; width: number; height: number }[]; state: "прочитан" | "дубль" | "вне периода" | "не прочитан" | "другой договор"; fields: { label: string; value: string; bbox: Bbox; page: number }[] };
export type Check = {
  id: "a" | "b" | "c" | "g" | `demo-${string}`; title: string; contract: string; period: string;
  reportRow?: string;
  kfzNumber: string;
  synthetic?: boolean;
  date: string;
  createdAt?: number;
  conclusion: "Достоверен" | "Недостоверен" | "Подтвердить полностью нельзя";
  state: "Готово к разбору" | "Подписано" | "Нужна повторная подпись";
  rows: Row[]; docs: Doc[];
  coverage: { verifiedSum: string; discrepancySum: string; unverifiedSum: string; totalSum: string; verifiedPct: string; discrepancyPct: string; unverifiedPct: string };
  missing: string[];
  /** Порядок карточек на экране исключений: расхождения по убыванию |Δ|, затем непроверенные. */
  exceptionOrder: string[];
  /** Документы, исключённые правилами из расчёта (не являются расхождением, если статья сходится). */
  excluded: ExcludedDoc[];
};
export type ExcludedDoc = { docId: string; rowIds?: string[]; file: string; reason: "дубль" | "вне периода" | "другой договор"; amount: string; impact: string; field: "Номер" | "Дата" | "Договор"; ruleId: string };

export const ORG = "АНО «Тестовый центр Синтез»";
const PERIOD = "01.06.2026–30.09.2026";
const TOTAL_BBOX: Bbox = [0.62, 0.78, 0.22, 0.03];

// ---- помощники для синтетики (только сборка объектов, никаких расчётов сумм) ----
function doc(
  id: string, title: string, type: string, number: string, date: string, contract: string,
  amount: string | null, o: { pages?: number; state?: Doc["state"]; bbox?: Bbox; page?: number; contractShown?: string; contractBbox?: Bbox; dateBbox?: Bbox } = {},
): Doc {
  const state = o.state ?? "прочитан";
  const fields: Doc["fields"] = state === "не прочитан" ? [] : [
    { label: "Номер", value: number, bbox: [0.12, 0.06, 0.2, 0.03], page: 1 },
    { label: "Дата", value: date, bbox: o.dateBbox ?? [0.36, 0.06, 0.16, 0.03], page: 1 },
    { label: "Договор", value: o.contractShown ?? contract, bbox: o.contractBbox ?? [0.12, 0.14, 0.36, 0.03], page: 1 },
  ];
  if (amount && state !== "не прочитан") fields.push({ label: "Сумма", value: formatMoney(amount), bbox: o.bbox ?? TOTAL_BBOX, page: o.page ?? 1 });
  return { id, title, type, number, date, contract: o.contractShown ?? contract, pages: o.pages ?? 1, state, fields };
}
function src(maybe: Doc | undefined, amount: string | null, label = "Итого"): SourceRef {
  const d = maybe as Doc;
  const f = d.fields.find((x) => x.label === "Сумма");
  return { docId: d.id, page: f?.page ?? 1, bbox: f?.bbox ?? TOTAL_BBOX, text: amount ? `${label}: ${formatMoney(amount)}` : d.title, amount, matchType: "точное" };
}
const MONTHS = [["июнь", "30.06.2026", "06"], ["июль", "31.07.2026", "07"], ["август", "31.08.2026", "08"], ["сентябрь", "30.09.2026", "09"]] as const;
function monthly(prefix: string, kind: "ved" | "vzn", contract: string, amounts: (string | null)[], bboxes: Partial<Record<number, Bbox>> = {}): Doc[] {
  return amounts.flatMap((a, i) => {
    if (a === null) return [];
    const [m, date, mm] = MONTHS[i]!;
    return kind === "ved"
      ? [doc(`${prefix}-ved-${mm}`, `Ведомость ЗП, ${m} 2026`, "Расчётная ведомость", `ВЗ-${mm}`, date, contract, a, { bbox: bboxes[i] ?? TOTAL_BBOX })]
      : [doc(`${prefix}-vzn-${mm}`, `Расчёт страховых взносов, ${m} 2026`, "Расчёт взносов", `РВ-${mm}`, date, contract, a, { bbox: bboxes[i] ?? [0.6, 0.64, 0.24, 0.03] })];
  });
}
const row = (r: Omit<Row, "category" | "reason"> & Partial<Pick<Row, "category" | "reason">>): Row => ({
  category: null, reason: r.status === "verified" ? "Сумма совпадает с документами" : "", ...r,
});

// ================= Проверка a =================
const A = "СИН-2026/11";
const aKfz = doc("a-kfz", "КФЗ, этап 2", "КФЗ", "КФЗ-2", "30.09.2026", A, "4186000.50", { bbox: [0.64, 0.88, 0.22, 0.03] });
const aVed = monthly("a", "ved", A, ["460000.00", "460000.00", "450000.00", "470000.00"]);
const aVzn = monthly("a", "vzn", A, ["138000.00", "138000.00", "135000.00", "141000.00"]);
const aSp14 = doc("a-sp14", "Акт № СП-14", "Акт", "СП-14", "30.07.2026", A, "600000.00", { bbox: [0.58, 0.55, 0.26, 0.03] });
const aSp19 = doc("a-sp19", "Акт № СП-19", "Акт", "СП-19", "29.09.2026", A, "400000.00", { bbox: [0.58, 0.57, 0.26, 0.03] });
const aUpd1 = doc("a-upd0712", "УПД № 0712-5", "УПД", "0712-5", "12.07.2026", A, "248600.00", { bbox: [0.7, 0.82, 0.18, 0.03] });
const aUpd2 = doc("a-upd0815", "УПД № 0815-2", "УПД", "0815-2", "15.08.2026", A, "315000.00", { bbox: [0.7, 0.8, 0.18, 0.03] });
const aAr = doc("a-arq3", "Сводный акт аренды № АР-Q3", "Акт аренды", "АР-Q3", "30.09.2026", A, "180000.00", { pages: 2, page: 2, bbox: [0.62, 0.4, 0.22, 0.03] });
const aAo = doc("a-ao31", "Авансовый отчёт № АО-31", "Авансовый отчёт", "АО-31", "21.08.2026", A, "37420.50", { bbox: [0.66, 0.71, 0.2, 0.03] });
const aSv = doc("a-c0907", "Счёт-акт № С-0907", "Счёт-акт", "С-0907", "07.09.2026", A, "12980.00", { bbox: [0.68, 0.62, 0.18, 0.03] });

const checkA: Check = {
  kfzNumber: "б/н", synthetic: true,
  reportRow: "2 этап, 2026 г.",
  id: "a", title: "Этап 2, договор СИН-2026/11", contract: A, period: PERIOD, conclusion: "Достоверен", state: "Готово к разбору",
  docs: [aKfz, ...aVed, ...aVzn, aSp14, aSp19, aUpd1, aUpd2, aAr, aAo, aSv],
  rows: [
    row({ id: "a-1", name: "Оплата труда", reported: "1840000.00", expected: "1840000.00", delta: "0.00", status: "verified", ruleId: "R-AGG-01", sources: [src(aVed[0], "460000.00"), src(aVed[1], "460000.00"), src(aVed[2], "450000.00"), src(aVed[3], "470000.00")] }),
    row({ id: "a-2", name: "Страховые взносы", reported: "552000.00", expected: "552000.00", delta: "0.00", status: "verified", ruleId: "R-AGG-01", sources: [src(aVzn[0], "138000.00"), src(aVzn[1], "138000.00"), src(aVzn[2], "135000.00"), src(aVzn[3], "141000.00")] }),
    row({ id: "a-3", name: "Субподряд: работы этапа 2.1", reported: "600000.00", expected: "600000.00", delta: "0.00", status: "verified", ruleId: "R-TOL-01", sources: [src(aSp14, "600000.00")] }),
    row({ id: "a-4", name: "Субподряд: работы этапа 2.2", reported: "400000.00", expected: "400000.00", delta: "0.00", status: "verified", ruleId: "R-TOL-01", sources: [src(aSp19, "400000.00")] }),
    row({ id: "a-5", name: "Материалы", reported: "248600.00", expected: "248600.00", delta: "0.00", status: "verified", ruleId: "R-TOL-01", sources: [src(aUpd1, "248600.00", "Всего к оплате")] }),
    row({ id: "a-6", name: "Оборудование", reported: "315000.00", expected: "315000.00", delta: "0.00", status: "verified", ruleId: "R-TOL-01", sources: [src(aUpd2, "315000.00", "Всего к оплате")] }),
    row({ id: "a-7", name: "Аренда помещения", reported: "180000.00", expected: "180000.00", delta: "0.00", status: "verified", ruleId: "R-AGG-01", reason: "Сводный акт: 4 × 45 000,00", sources: [src(aAr, "180000.00")] }),
    row({ id: "a-8", name: "Командировки", reported: "37420.50", expected: "37420.50", delta: "0.00", status: "verified", ruleId: "R-TOL-01", sources: [src(aAo, "37420.50")] }),
    row({ id: "a-9", name: "Услуги связи", reported: "12980.00", expected: "12980.00", delta: "0.00", status: "verified", ruleId: "R-TOL-01", sources: [src(aSv, "12980.00")] }),
    row({ id: "a-10", name: "Арифметика КФЗ: сумма строк = итог", reported: "4186000.50", expected: "4186000.50", delta: "0.00", status: "verified", ruleId: "R-ARI-01", service: true, reason: "Сумма строк равна итогу", sources: [src(aKfz, "4186000.50")] }),
  ],
  coverage: { verifiedSum: "4186000.50", discrepancySum: "0.00", unverifiedSum: "0.00", totalSum: "4186000.50", verifiedPct: "100.0", discrepancyPct: "0.0", unverifiedPct: "0.0" },
  missing: [],
  date: "12.11.2026",
  excluded: [],
  exceptionOrder: [],
};

// ================= Проверка b =================
const B = "СИН-2026/12";
const bKfz = doc("b-kfz", "КФЗ, этап 2", "КФЗ", "КФЗ-2", "30.09.2026", B, "3642495.60", { bbox: [0.64, 0.88, 0.22, 0.03] });
const bVed = monthly("b", "ved", B, ["380000.00", "380000.00", "375000.00", "380000.00"], { 2: [0.62, 0.78, 0.22, 0.03] });
const bVzn = monthly("b", "vzn", B, ["114000.00", "114000.00", "112500.00", "114000.00"]);
const bSp22 = doc("b-sp22", "Акт № СП-22", "Акт", "СП-22", "15.07.2026", B, "350000.00", { bbox: [0.58, 0.55, 0.26, 0.03] });
const bSp27 = doc("b-sp27", "Акт № СП-27", "Акт", "СП-27", "28.08.2026", B, "280000.00", { bbox: [0.58, 0.56, 0.26, 0.03] });
const bSp27c = doc("b-sp27-copy", "Акт СП-27 (копия)", "Акт", "СП-27", "28.08.2026", B, "280000.00", { state: "дубль", bbox: [0.58, 0.56, 0.26, 0.03] });
const bUpd0903 = doc("b-upd0903", "УПД № 0903-1", "УПД", "0903-1", "03.10.2026", B, "96400.00", { state: "вне периода", dateBbox: [0.12, 0.1, 0.2, 0.03], bbox: [0.7, 0.8, 0.18, 0.03] });
const bUpd0811 = doc("b-upd0811", "УПД № 0811-4", "УПД", "0811-4", "11.08.2026", B, "412000.00", { bbox: [0.7, 0.8, 0.18, 0.03] });
const bAr = MONTHS.slice(1).map(([m, date, mm]) => doc(`b-ar-${mm}`, `Акт аренды, ${m} 2026`, "Акт аренды", `АР-${mm}`, date, B, "40000.00", { bbox: [0.62, 0.42, 0.22, 0.03] }));
const bAo = doc("b-ao44", "Авансовый отчёт № АО-44", "Авансовый отчёт", "АО-44", "19.09.2026", B, "48570.00", { pages: 2, page: 2, bbox: [0.66, 0.34, 0.2, 0.03] });
const bSv = doc("b-c1108", "Счёт-акт № С-1108", "Счёт-акт", "С-1108", "08.09.2026", B, "9600.00", { contractShown: "СИН-2026/09", contractBbox: [0.14, 0.18, 0.36, 0.03], bbox: [0.68, 0.62, 0.18, 0.03] });
const bLc = doc("b-lc5", "Акт № ЛЦ-5", "Акт", "ЛЦ-5", "05.07.2026", B, "64000.00", { bbox: [0.6, 0.58, 0.24, 0.03] });
const bUpd0719 = doc("b-upd0719", "УПД № 0719-3", "УПД", "0719-3", "19.07.2026", B, "7245.60", { bbox: [0.7, 0.82, 0.18, 0.03] });

const checkB: Check = {
  kfzNumber: "б/н", synthetic: true,
  reportRow: "2 этап, 2026 г.",
  id: "b", title: "Этап 2, договор СИН-2026/12", contract: B, period: PERIOD, conclusion: "Недостоверен", state: "Готово к разбору",
  docs: [bKfz, ...bVed, ...bVzn, bSp22, bSp27, bSp27c, bUpd0903, bUpd0811, ...bAr, bAo, bSv, bLc, bUpd0719],
  rows: [
    row({
      causes: ["Больничные не попали в сальдо.", "Учтены выданные авансы.", "Фактические затраты ниже плановых.", "Ошибка переноса или распознавания суммы ведомости за август."],
      recommendation: "Сверьте ведомость за август с оригиналом и запросите пояснение или исправленную ведомость.",
      id: "b-1", name: "Оплата труда", reported: "1520000.00", expected: "1515000.00", delta: "5000.00", status: "discrepancy", category: "сумма", ruleId: "R-AGG-01",
      reason: "Сумма ведомостей меньше суммы в отчёте: август 375 000,00",
      sources: [src(bVed[0], "380000.00"), src(bVed[1], "380000.00"), src(bVed[2], "375000.00"), src(bVed[3], "380000.00")],
      variants: {
        fix: {
          label: "Август 375000.00 → 380000.00, причина: OCR, проверено по бумаге",
          patch: { status: "verified", expected: "1520000.00", delta: "0.00", category: null, manual: true, reason: "Пересчитано правилами после правки" },
          checkPatch: {
            rows: { "b-13": { delta: "386180.00", expected: "3256315.60" } },
            coverage: { verifiedSum: "2927745.60", discrepancySum: "714750.00", unverifiedSum: "0.00", totalSum: "3642495.60", verifiedPct: "80.4", discrepancyPct: "19.6", unverifiedPct: "0.0" },
          },
        },
      },
    }),
    row({ id: "b-2", name: "Страховые взносы", reported: "454500.00", expected: "454500.00", delta: "0.00", status: "verified", ruleId: "R-AGG-01", sources: [src(bVzn[0], "114000.00"), src(bVzn[1], "114000.00"), src(bVzn[2], "112500.00"), src(bVzn[3], "114000.00")] }),
    row({ id: "b-3", name: "Субподряд: этап 2.1", reported: "350000.00", expected: "350000.00", delta: "0.00", status: "verified", ruleId: "R-TOL-01", sources: [src(bSp22, "350000.00")] }),
    row({
      causes: ["Один и тот же акт СП-27 повторно учтён в отчёте.", "Копия акта принята за отдельный документ."],
      recommendation: "Проверьте реквизиты акта СП-27 и исключите повторный учёт.",
      id: "b-4", evidenceDependencies: [bSp27c.id], name: "Субподряд: этап 2.2", reported: "560000.00", expected: "280000.00", delta: "280000.00", status: "discrepancy", category: "дубль", ruleId: "R-DUP-01", reason: "Акт СП-27 учтён дважды: файл «Акт СП-27 (копия)» — дубль, в сумму не входит", sources: [src(bSp27, "280000.00")] }),
    row({
      causes: ["В отчёт включены затраты за пределами периода этапа.", "В пакет приложен документ за другой период."],
      recommendation: "Представьте подтверждающий документ за период этапа или уточните период отражения затрат.",
      id: "b-5", name: "Материалы", reported: "96400.00", expected: "0.00", delta: "96400.00", status: "discrepancy", category: "период", ruleId: "R-PER-01", reason: "УПД № 0903-1 датирован 03.10.2026 — вне периода; в периоде подтверждено 0,00",
      sources: [{ docId: bUpd0903.id, page: 1, bbox: [0.12, 0.1, 0.2, 0.03], text: "от 03.10.2026", amount: "96400.00", matchType: "точное" }] }),
    row({ id: "b-6", name: "Оборудование", reported: "412000.00", expected: "412000.00", delta: "0.00", status: "verified", ruleId: "R-TOL-01", sources: [src(bUpd0811, "412000.00", "Всего к оплате")] }),
    row({ id: "b-7", name: "Аренда помещения", reported: "120000.00", expected: "120000.00", delta: "0.00", status: "verified", ruleId: "R-AGG-01", sources: bAr.map((d) => src(d, "40000.00")) }),
    row({
      causes: ["Возможна перестановка цифр при переносе суммы: 48 750 и 48 570.", "Ошибка распознавания суммы авансового отчёта."],
      recommendation: "Сверьте сумму на странице 2 авансового отчёта АО-44 с оригиналом и уточните отчёт.",
      id: "b-8", name: "Командировки", reported: "48750.00", expected: "48570.00", delta: "180.00", status: "discrepancy", category: "сумма", ruleId: "R-TOL-01", reason: "Сумма авансового отчёта меньше суммы в отчёте", sources: [src(bAo, "48570.00")] }),
    row({
      causes: ["Приложен счёт-акт по другому договору.", "В реквизитах документа неверно указан договор."],
      recommendation: "Представьте документ по договору СИН-2026/12 или уточните реквизиты счёт-акта С-1108.",
      id: "b-9", name: "Услуги связи", reported: "9600.00", expected: "0.00", delta: "9600.00", status: "discrepancy", category: "договор/связь", ruleId: "R-KEY-01", reason: "В счёт-акте указан договор СИН-2026/09, а не СИН-2026/12",
      sources: [{ docId: bSv.id, page: 1, bbox: [0.14, 0.18, 0.36, 0.03], text: "Договор: СИН-2026/09", amount: "9600.00", matchType: "точное" }] }),
    row({ id: "b-10", name: "Лицензия ПО", reported: "64000.00", expected: "64000.00", delta: "0.00", status: "verified", ruleId: "R-TOL-01", sources: [src(bLc, "64000.00")] }),
    row({ id: "b-11", name: "Канцелярия", reported: "7245.60", expected: "7245.60", delta: "0.00", status: "verified", ruleId: "R-TOL-01", sources: [{ ...src(bUpd0719, "7245.60", "Всего к оплате"), matchType: "после нормализации" }] }),
    row({ id: "b-12", name: "Арифметика КФЗ: сумма строк = итог", reported: "3642495.60", expected: "3642495.60", delta: "0.00", status: "verified", ruleId: "R-ARI-01", service: true, reason: "Сумма строк равна итогу", sources: [src(bKfz, "3642495.60")] }),
    row({
      causes: ["В итог вошли суммы по повторяющимся или неподходящим документам.", "В отдельных статьях сумма отчёта отличается от подтверждённой."],
      recommendation: "Разберите строки с расхождениями и уточните итог отчёта по подтверждающим документам.",
      id: "b-13", name: "Итого по этапу против документов", reported: "3642495.60", expected: "3251315.60", delta: "391180.00", status: "discrepancy", category: "сумма (следствие Б1, Б4, Б5, Б8, Б9)", ruleId: "R-COV-01", service: true, reason: "Следствие расхождений в строках Б1, Б4, Б5, Б8, Б9", sources: [src(bKfz, "3642495.60")] }),
  ],
  coverage: { verifiedSum: "1407745.60", discrepancySum: "2234750.00", unverifiedSum: "0.00", totalSum: "3642495.60", verifiedPct: "38.6", discrepancyPct: "61.4", unverifiedPct: "0.0" },
  missing: [],
  date: "12.11.2026",
  excluded: [],
  exceptionOrder: ["b-13", "b-4", "b-5", "b-9", "b-1", "b-8"],
};

// ================= Проверка c =================
const C = "СИН-2026/14";
const cKfz = doc("c-kfz", "КФЗ, этап 2", "КФЗ", "КФЗ-2", "30.09.2026", C, "2485100.00", { bbox: [0.64, 0.88, 0.22, 0.03] });
const cVed = monthly("c", "ved", C, ["240000.00", "240000.00", "240000.00", null]);
const cVzn = monthly("c", "vzn", C, ["72000.00", "72000.00", "72000.00", "72000.00"]);
const cSp31 = doc("c-sp31", "Акт № СП-31", "Акт", "СП-31", "31.07.2026", C, "500000.00", { bbox: [0.58, 0.55, 0.26, 0.03] });
const cDog33 = doc("c-dog33", "Договор № СП-33", "Договор", "СП-33", "01.08.2026", C, "210000.00", { pages: 5, page: 3, bbox: [0.2, 0.46, 0.5, 0.03] });
const cUpd0822 = doc("c-upd0822", "УПД 0822-7.png", "УПД", "0822-7", "22.08.2026", C, null, { state: "не прочитан" });
const cUpd0905 = doc("c-upd0905", "УПД № 0905-1", "УПД", "0905-1", "05.09.2026", C, "275000.00", { bbox: [0.7, 0.8, 0.18, 0.03] });
const cAr07 = doc("c-ar07", "Акт аренды № АР-07", "Акт аренды", "АР-07", "31.07.2026", C, "30000.00", { bbox: [0.62, 0.42, 0.22, 0.03], contractShown: "А-7" });
const cAr08 = doc("c-ar08", "Акт аренды № АР-08", "Акт аренды", "АР-08", "31.08.2026", C, "30000.00", { bbox: [0.62, 0.42, 0.22, 0.03], contractShown: "А-7" });
const cAr09 = doc("c-ar09", "Акт аренды № АР-09", "Акт аренды", "АР-09", "30.09.2026", C, "30000.00", { bbox: [0.62, 0.42, 0.22, 0.03], contractShown: "А-7" });
const cAr091 = doc("c-ar09-1", "Акт аренды № АР-09/1", "Акт аренды", "АР-09/1", "30.09.2026", C, "30000.00", { bbox: [0.62, 0.42, 0.22, 0.03], contractShown: "А-7/1" });
const cSv = doc("c-c0911", "Счёт-акт № С-0911", "Счёт-акт", "С-0911", "11.09.2026", C, "6000.00", { bbox: [0.68, 0.62, 0.18, 0.03] });

const checkC: Check = {
  kfzNumber: "б/н", synthetic: true,
  reportRow: "2 этап, 2026 г.",
  id: "c", title: "Этап 2, договор СИН-2026/14", contract: C, period: PERIOD, conclusion: "Подтвердить полностью нельзя", state: "Готово к разбору",
  docs: [cKfz, ...cVed, ...cVzn, cSp31, cDog33, cUpd0822, cUpd0905, cAr07, cAr08, cAr09, cAr091, cSv],
  rows: [
    row({
      causes: ["В пакет не включена ведомость за сентябрь.", "Больничные не попали в сальдо.", "Учтены выданные авансы.", "Фактические затраты ниже плановых."],
      recommendation: "Представьте ведомость за сентябрь 2026 и сверьте начисления, больничные и авансы за период.",
      id: "c-1", name: "Оплата труда", reported: "960000.00", expected: null, delta: null, status: "unverified", ruleId: "R-AGG-01", reason: "Пропущен документ: ведомость за сентябрь", partialNote: "найдено 720000.00 за 3 из 4 мес.", sources: cVed.map((d) => src(d, "240000.00")) }),
    row({ id: "c-2", name: "Страховые взносы", reported: "288000.00", expected: "288000.00", delta: "0.00", status: "verified", ruleId: "R-AGG-01", sources: cVzn.map((d) => src(d, "72000.00")) }),
    row({ id: "c-3", name: "Субподряд: этап 2.1", reported: "500000.00", expected: "500000.00", delta: "0.00", status: "verified", ruleId: "R-TOL-01", sources: [src(cSp31, "500000.00")] }),
    row({
      causes: ["В пакет включён только договор без акта выполненных работ.", "Акт не приложен или ещё не оформлен."],
      recommendation: "Представьте акт выполненных работ по договору СП-33.",
      id: "c-4", name: "Субподряд: этап 2.2", reported: "210000.00", expected: null, delta: null, status: "unverified", ruleId: "R-KEY-01", reason: "Пропущен документ: есть договор № СП-33, нет акта (договор не подтверждает факт затрат)", sources: [src(cDog33, "210000.00", "Цена договора")] }),
    row({
      causes: ["Качество скана недостаточно для чтения реквизитов и суммы.", "Изображение документа может быть размыто или обрезано."],
      recommendation: "Представьте читаемую копию УПД № 0822-7.",
      id: "c-5", name: "Материалы", reported: "133800.00", expected: null, delta: null, status: "unverified", ruleId: "R-COV-01", reason: "Документ не прочитан: «УПД 0822-7.png», качество ниже порога OCR", sources: [{ docId: cUpd0822.id, page: 1, bbox: [0.05, 0.05, 0.9, 0.9], text: "Файл не распознан", amount: null, matchType: "точное" }] }),
    row({ id: "c-6", name: "Оборудование", reported: "275000.00", expected: "275000.00", delta: "0.00", status: "verified", ruleId: "R-TOL-01", sources: [src(cUpd0905, "275000.00", "Всего к оплате")] }),
    row({
      causes: ["За сентябрь приложены два акта по разным договорам.", "Не указано, какой акт относится к проверяемому этапу."],
      recommendation: "Раскройте строку аренды, сопоставьте акты за сентябрь и проверьте, какой договор относится к этапу.",
      id: "c-7", name: "Аренда помещения", reported: "90000.00", expected: null, delta: null, status: "unverified", ruleId: "R-KEY-01",
      reason: "Неоднозначная связь за сентябрь: 2 кандидата (АР-09 по договору А-7 и АР-09/1 по договору А-7/1)", partialNote: "найдено 60000.00 за 2 мес.",
      sources: [src(cAr07, "30000.00"), src(cAr08, "30000.00"), src(cAr09, "30000.00"), src(cAr091, "30000.00")],
      variants: {
        "pick-ar09": {
          label: "Выбран АР-09 (договор А-7)",
          patch: { status: "verified", expected: "90000.00", delta: "0.00", manual: true, partialNote: undefined, reason: "Связь выбрана вручную, проверена правилами" },
          checkPatch: { coverage: { verifiedSum: "1159000.00", discrepancySum: "0.00", unverifiedSum: "1326100.00", totalSum: "2485100.00", verifiedPct: "46.6", discrepancyPct: "0.0", unverifiedPct: "53.4" } },
        },
        "pick-ar09-1": {
          label: "Выбран АР-09/1 (договор А-7/1)",
          patch: { causes: ["Выбран акт АР-09/1 по договору А-7/1, который не подтверждает затраты по договору А-7."], recommendation: "Проверьте договор и выберите акт АР-09 либо представьте подтверждение связи с этапом.", status: "discrepancy", expected: "60000.00", delta: "30000.00", category: "договор/связь", manual: true, reason: "Связь выбрана вручную, проверена правилами" },
          checkPatch: { conclusion: "Недостоверен", coverage: { verifiedSum: "1069000.00", discrepancySum: "90000.00", unverifiedSum: "1326100.00", totalSum: "2485100.00", verifiedPct: "43.0", discrepancyPct: "3.6", unverifiedPct: "53.4" } },
        },
      },
    }),
    row({
      causes: ["В комплекте может не хватать документов о расходах на командировки.", "Подтверждающие документы ещё не представлены."],
      recommendation: "Представьте документы, подтверждающие расходы на командировки за период этапа.",
      id: "c-8", name: "Командировки", reported: "22300.00", expected: null, delta: null, status: "unverified", ruleId: "R-COV-01", reason: "Нет документа", sources: [] }),
    row({ id: "c-9", name: "Услуги связи", reported: "6000.00", expected: "6000.00", delta: "0.00", status: "verified", ruleId: "R-TOL-01", sources: [src(cSv, "6000.00")] }),
    row({ id: "c-10", name: "Арифметика КФЗ: сумма строк = итог", reported: "2485100.00", expected: "2485100.00", delta: "0.00", status: "verified", ruleId: "R-ARI-01", service: true, reason: "Сумма строк равна итогу", sources: [src(cKfz, "2485100.00")] }),
  ],
  coverage: { verifiedSum: "1069000.00", discrepancySum: "0.00", unverifiedSum: "1416100.00", totalSum: "2485100.00", verifiedPct: "43.0", discrepancyPct: "0.0", unverifiedPct: "57.0" },
  missing: ["Ведомость ЗП за сентябрь", "Акт по договору СП-33", "Читаемая копия УПД 0822-7", "Авансовый отчёт по командировкам", "Решение по акту аренды за сентябрь"],
  date: "13.11.2026",
  excluded: [],
  exceptionOrder: ["c-1", "c-4", "c-5", "c-7", "c-8"],
};

// ================= Проверка g =================
// Снимок приложенного синтетического набора: КФЗ № 3/7, только строка «3 этап, 2027 г.».
// Оригиналы — fixtures/synthetic-2027/input. Это подготовленные данные, не результат OCR.
const G = "SYN-27/04-018";
const G_MONTHS = [["Январь", "01"], ["Февраль", "02"], ["Март", "03"], ["Апрель", "04"], ["Май", "05"]] as const;
function sampleDoc(prefix: string, ...args: Parameters<typeof doc>): Doc {
  const file = SAMPLE_FILES.find((item) => item.name.startsWith(`${prefix}_`));
  if (!file) throw new Error(`Не найден исходный файл ${prefix}`);
  return withSamplePreview({ ...doc(...args), fileName: file.name }, prefix);
}
const gKfz = sampleDoc("01", "g-kfz", "Карточка учета фактических затрат № 3/7", "КФЗ", "3/7", "не указана", G, "7818300.00", { bbox: [0.64, 0.88, 0.22, 0.03] });
const gPayroll = ["900000.00", "950000.00", "1000000.00", "1050000.00", "1100000.00"];
const gInsurance = ["270000.00", "285000.00", "300000.00", "315000.00", "330000.00"];
// В ведомостях указан месяц, отдельной даты составления нет: день не придумываем.
const gVed = gPayroll.map((amount, i) => { const [month, mm] = G_MONTHS[i]!; return sampleDoc(`02_${mm}`, `g-ved-${mm}`, `Ведомость ЗП, ${month.toLowerCase()} 2027`, "Расчётная ведомость", `ЗП-${mm}/27`, `${month} 2027`, G, amount); });
const gVzn = gInsurance.map((amount, i) => { const [month, mm] = G_MONTHS[i]!; return sampleDoc(`03_${mm}`, `g-vzn-${mm}`, `Расчёт страховых взносов, ${month.toLowerCase()} 2027`, "Расчёт взносов", `СВ-${mm}/27`, `${month} 2027`, G, amount, { bbox: [0.6, 0.64, 0.24, 0.03] }); });
const gAct284 = sampleDoc("04", "g-act284", "Акт № 284", "Акт", "284", "28.01.2027", G, "186000.00", { bbox: [0.58, 0.55, 0.26, 0.03] });
const gAct397 = sampleDoc("05", "g-act397", "Счёт-акт № 397", "Счёт-акт", "397", "25.02.2027", G, "94000.00", { bbox: [0.68, 0.62, 0.18, 0.03] });
const gKl84 = sampleDoc("06", "g-kl84", "Служебная записка КЛ-84", "Служебная записка", "КЛ-84", "10.04.2027", G, "73500.00", { bbox: [0.6, 0.48, 0.24, 0.03] });
const gUpd0527 = sampleDoc("07", "g-upd0527", "УПД № 0527-92", "УПД", "0527-92", "22.05.2027", G, "246500.00", { bbox: [0.7, 0.8, 0.18, 0.03] });
const gIa62 = sampleDoc("08", "g-ia62", "Акт № ИА-62", "Акт", "ИА-62", "31.01.2027", G, "128000.00", { bbox: [0.58, 0.55, 0.26, 0.03] });
const gAdm48 = sampleDoc("09", "g-adm48", "Акт № ADM-48", "Акт", "ADM-48", "27.02.2027", G, "142000.00", { bbox: [0.58, 0.57, 0.26, 0.03] });
const gAdm48copy = sampleDoc("10", "g-adm48-copy", "Акт ADM-48 (копия)", "Акт", "ADM-48", "27.02.2027", G, "142000.00", { state: "дубль", bbox: [0.58, 0.57, 0.26, 0.03] });
const gIt = sampleDoc("11", "g-it0327", "Справка ИТ 03-27", "Справка", "ИТ 03-27", "Март 2027", G, "97500.00", { bbox: [0.62, 0.6, 0.22, 0.03] });
const gSv = sampleDoc("12", "g-sv0427", "Акт связи СВ-0427 (PNG-скан)", "Акт", "СВ-0427", "29.04.2027", G, "52500.00", { bbox: [0.66, 0.66, 0.2, 0.03] });
const gUpr = sampleDoc("13", "g-upr83", "УПД № УПР-83", "УПД", "УПР-83", "29.05.2027", G, "180000.00", { bbox: [0.7, 0.82, 0.18, 0.03] });
const gOrg = sampleDoc("14", "g-org0604", "Акт № ОРГ-0604", "Акт", "ОРГ-0604", "04.06.2027", G, "117000.00", { state: "вне периода", dateBbox: [0.36, 0.06, 0.2, 0.03] });
const gAdm96 = sampleDoc("15", "g-adm96", "Акт № ADM-96", "Акт", "ADM-96", "15.05.2027", "SYN-27/04-019", "255000.00", { state: "другой договор", contractBbox: [0.12, 0.14, 0.36, 0.03] });

const checkG: Check = {
  kfzNumber: "3/7", synthetic: true,
  id: "g", title: "КФЗ № 3/7 · 3 этап, 2027 г.", contract: G, period: "01.01.2027–31.05.2027", conclusion: "Недостоверен", state: "Готово к разбору",
  reportRow: "3 этап, 2027 г.",
  docs: [gKfz, ...gVed, ...gVzn, gAct284, gAct397, gKl84, gUpd0527, gIa62, gAdm48, gAdm48copy, gIt, gSv, gUpr, gOrg, gAdm96],
  rows: [
    row({
      id: "g-5", name: "Трудоемкость (человеко-месяц)", unit: "человеко-месяц", reported: "32.50", expected: null, delta: null, status: "unverified", category: "нет подтверждающих документов", ruleId: "R-COV-01", sources: [],
      reason: "Трудоемкость 32,50 человеко-месяца не подтверждена отдельным расчётом.",
      causes: ["Табели или расчёт трудоёмкости не включены в пакет.", "Ведомости подтверждают суммы, но не трудоёмкость в человеко-месяцах."],
      recommendation: "Представьте табели и расчёт трудоёмкости за январь–май 2027 года.",
    }),
    row({
      id: "g-8", name: "Материальные затраты", reported: "128500.00", expected: null, delta: null, status: "unverified", category: "нет подтверждающих документов", ruleId: "R-COV-01", sources: [],
      reason: "В КФЗ указано 128 500,00 ₽ материальных затрат; подтверждающих документов в пакете нет.",
      causes: ["Первичные документы по материальным затратам не приложены."],
      recommendation: "Представьте первичные документы на материальные затраты за отчётный период.",
    }),
    row({
      id: "g-1", name: "Затраты на оплату труда - всего (Статья калькуляции 0200)", reported: "5000000.00", expected: "5000000.00", delta: "0.00", status: "verified", ruleId: "R-AGG-01", sources: gVed.map((document, i) => src(document, gPayroll[i]!)),
      breakdown: [
        { name: "1. Заработная плата и взносы. Счет 211 - заработная плата (Оборотно-сальдовая ведомость)", reported: "5000000.00", children: [
          { name: "основная заработная плата", reported: "4300000.00", note: "Сумма основной зарплаты в пяти ведомостях: 4 300 000,00 ₽." },
          { name: "дополнительная заработная плата", reported: "700000.00", note: "В ведомостях дополнительная зарплата и резерв указаны совместно; отдельное распределение не подтверждено." },
        ] },
        { name: "2. Резерв отпусков и страховые взносы резерва отпусков. Счет 211 (Оборотно-сальдовая ведомость)", reported: "0.00", note: "Значение в КФЗ. Отдельного расчёта резерва в пакете нет; ноль в отчёте не означает подтверждение.", children: [
          { name: "дополнительная заработная плата", reported: "0.00" },
        ] },
      ],
    }),
    row({
      id: "g-2", name: "Страховые взносы на обязательное социальное страхование (Статья калькуляции 0300)", reported: "1514800.00", expected: "1500000.00", delta: "14800.00", status: "discrepancy", category: "сумма", ruleId: "R-AGG-01", sources: gVzn.map((document, i) => src(document, gInsurance[i]!)),
      reason: "В КФЗ 1 514 800,00 ₽, в пяти расчётах взносов 1 500 000,00 ₽. Отчёт завышен на 14 800,00 ₽.",
      causes: ["В отчёте может быть ошибка суммы или распределения начислений.", "Больничные не попали в сальдо.", "Учтены выданные авансы.", "Фактические затраты ниже плановых."],
      recommendation: "Сверьте начисления по ведомостям и обоснуйте 14 800,00 ₽ либо уточните сумму статьи 0300.",
      breakdown: [
        { name: "1. Заработная плата и взносы. Счет 213 - взносы (Оборотно-сальдовая ведомость)", reported: "1514800.00", note: "Детализация по основной и дополнительной зарплате отдельно документами не подтверждена.", children: [
          { name: "основная заработная плата", reported: "1290000.00" },
          { name: "дополнительная заработная плата", reported: "224800.00" },
        ] },
        { name: "2. Резерв отпусков и страховые взносы резерва отпусков. Счет 213 (Оборотно-сальдовая ведомость)", reported: "0.00", note: "Значение в КФЗ; отдельного расчёта резерва нет.", children: [
          { name: "дополнительная заработная плата", reported: "0.00" },
        ] },
      ],
    }),
    row({
      id: "g-3", name: "Общепроизводственные затраты (Статья калькуляции 0800)", reported: "575000.00", expected: "600000.00", delta: "-25000.00", status: "discrepancy", category: "сумма", ruleId: "R-AGG-01",
      reason: "В КФЗ 575 000,00 ₽, сумма четырёх документов 600 000,00 ₽. Отчёт занижен на 25 000,00 ₽.",
      causes: ["Часть подтверждённых затрат могла не попасть в КФЗ.", "Сумма статьи могла быть перенесена в отчёт с ошибкой."],
      recommendation: "Сверьте четыре первичных документа с КФЗ и уточните сумму статьи 0800.",
      sources: [src(gAct284, "186000.00"), src(gAct397, "94000.00"), src(gKl84, "73500.00"), src(gUpd0527, "246500.00", "Всего к оплате")],
    }),
    row({
      id: "g-4", name: "Общехозяйственные затраты (Статья калькуляции 0900)", reported: "600000.00", expected: "600000.00", delta: "0.00", status: "verified", ruleId: "R-AGG-01",
      reason: "Пять документов подтверждают 600 000,00 ₽; дубль, документ за июнь и документ по другому договору исключены.",
      sources: [src(gIa62, "128000.00"), src(gAdm48, "142000.00"), src(gIt, "97500.00"), src(gSv, "52500.00"), { ...src(gUpr, "180000.00", "Всего к оплате"), matchType: "после нормализации" }],
    }),
    row({
      id: "g-7", name: "Итого", reported: "7818300.00", expected: null, delta: null, status: "unverified", service: true, category: "неполное подтверждение", ruleId: "R-COV-01",
      reason: "Итог строки «3 этап, 2027 г.» нельзя подтвердить полностью: нет документов на материальные затраты, есть расхождения по 0300 и 0800.",
      partialNote: "По представленным документам подтверждается часть затрат на 7 700 000,00 ₽; полной суммы нет.",
      causes: ["Материальные затраты не обеспечены первичными документами.", "По статьям 0300 и 0800 обнаружены расхождения."],
      recommendation: "Представьте документы по материальным затратам, уточните статьи 0300 и 0800 и перепроверьте итог.",
      sources: [src(gKfz, "7818300.00", "Итого, 3 этап, 2027 г.")],
    }),
  ],
  coverage: { verifiedSum: "5600000.00", discrepancySum: "2089800.00", unverifiedSum: "128500.00", totalSum: "7818300.00", verifiedPct: "71.63", discrepancyPct: "26.73", unverifiedPct: "1.64" },
  missing: ["Табели и расчёт трудоёмкости за январь–май 2027 года", "Первичные документы по материальным затратам на 128 500,00 ₽", "Отдельная детализация взносов и расчёт резерва отпусков"],
  date: "13.11.2026",
  excluded: [
    { docId: gAdm48copy.id, rowIds: ["g-4"], file: gAdm48copy.fileName!, reason: "дубль", amount: "142000.00", field: "Номер", ruleId: "R-DUP-01", impact: "Файл совпадает байт в байт с актом ADM-48 от 27.02.2027. Повторно в сумму не включён." },
    { docId: gOrg.id, rowIds: ["g-4"], file: gOrg.fileName!, reason: "вне периода", amount: "117000.00", field: "Дата", ruleId: "R-PER-01", impact: "Услуги за июнь 2027 года вне периода 01.01–31.05.2027. В сумму не включены." },
    { docId: gAdm96.id, rowIds: ["g-4"], file: gAdm96.fileName!, reason: "другой договор", amount: "255000.00", field: "Договор", ruleId: "R-KEY-01", impact: "В документе договор SYN-27/04-019, проверяется SYN-27/04-018. В сумму не включён." },
  ],
  exceptionOrder: ["g-3", "g-2", "g-5", "g-8", "g-7"],
};

export const checks: Check[] = [checkA, checkB, checkC, checkG];
export const getCheck = (id: string) => checks.find((c) => c.id === id);
