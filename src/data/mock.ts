import { formatMoney } from "@/components/money-format";

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
  /** Служебная строка (арифметика/итог) — не входит в счётчики показателей. */
  service?: boolean;
  variants?: Record<string, RowVariant>;
  /** Единица измерения для нефинансовых показателей (значение — число, не деньги). */
  unit?: string;
  /** Вложенная строка («в т.ч.») — не входит в покрытие по деньгам. */
  nested?: boolean;
};
export type Doc = { id: string; title: string; type: string; number: string; date: string; contract: string; pages: number; state: "прочитан" | "дубль" | "вне периода" | "не прочитан" | "другой договор"; fields: { label: string; value: string; bbox: Bbox; page: number }[] };
export type LogEntry = { at: string; actor: string; action: string; object: string; before?: string; after?: string };
export type Check = {
  id: "a" | "b" | "c" | "g"; title: string; contract: string; period: string;
  reportRow?: string;
  conclusion: "Достоверен" | "Недостоверен" | "Подтвердить полностью нельзя";
  state: "Готово к разбору" | "Подписано" | "Нужна повторная подпись";
  rows: Row[]; docs: Doc[];
  coverage: { verifiedSum: string; discrepancySum: string; unverifiedSum: string; totalSum: string; verifiedPct: string; discrepancyPct: string; unverifiedPct: string };
  missing: string[]; log: LogEntry[];
  /** Порядок карточек на экране исключений: расхождения по убыванию |Δ|, затем непроверенные. */
  exceptionOrder: string[];
  /** Документы, исключённые правилами из расчёта (не являются расхождением, если статья сходится). */
  excluded: ExcludedDoc[];
};
export type ExcludedDoc = { docId: string; file: string; reason: "дубль" | "вне периода" | "другой договор"; amount: string; impact: string; field: "Номер" | "Дата" | "Договор"; ruleId: string };

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
function systemLog(date: string, title: string): LogEntry[] {
  return [
    { at: `${date} 09:12`, actor: "Система", action: "Загрузка пакета документов", object: title },
    { at: `${date} 09:14`, actor: "Система", action: "Извлечение реквизитов", object: title },
    { at: `${date} 09:15`, actor: "Система", action: "Запуск правил v1.0", object: title },
    { at: `${date} 09:16`, actor: "Система", action: "Фиксация отпечатка пакета", object: title, after: "sha256: 3f9a…c21 (синтетика)" },
  ];
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
  log: systemLog("12.11.2026", "Этап 2, договор СИН-2026/11"),
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
  id: "b", title: "Этап 2, договор СИН-2026/12", contract: B, period: PERIOD, conclusion: "Недостоверен", state: "Готово к разбору",
  docs: [bKfz, ...bVed, ...bVzn, bSp22, bSp27, bSp27c, bUpd0903, bUpd0811, ...bAr, bAo, bSv, bLc, bUpd0719],
  rows: [
    row({
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
    row({ id: "b-4", name: "Субподряд: этап 2.2", reported: "560000.00", expected: "280000.00", delta: "280000.00", status: "discrepancy", category: "дубль", ruleId: "R-DUP-01", reason: "Акт СП-27 учтён дважды: файл «Акт СП-27 (копия)» — дубль, в сумму не входит", sources: [src(bSp27, "280000.00")] }),
    row({ id: "b-5", name: "Материалы", reported: "96400.00", expected: "0.00", delta: "96400.00", status: "discrepancy", category: "период", ruleId: "R-PER-01", reason: "УПД № 0903-1 датирован 03.10.2026 — вне периода; в периоде подтверждено 0,00",
      sources: [{ docId: bUpd0903.id, page: 1, bbox: [0.12, 0.1, 0.2, 0.03], text: "от 03.10.2026", amount: "96400.00", matchType: "точное" }] }),
    row({ id: "b-6", name: "Оборудование", reported: "412000.00", expected: "412000.00", delta: "0.00", status: "verified", ruleId: "R-TOL-01", sources: [src(bUpd0811, "412000.00", "Всего к оплате")] }),
    row({ id: "b-7", name: "Аренда помещения", reported: "120000.00", expected: "120000.00", delta: "0.00", status: "verified", ruleId: "R-AGG-01", sources: bAr.map((d) => src(d, "40000.00")) }),
    row({ id: "b-8", name: "Командировки", reported: "48750.00", expected: "48570.00", delta: "180.00", status: "discrepancy", category: "сумма", ruleId: "R-TOL-01", reason: "Сумма авансового отчёта меньше суммы в отчёте", sources: [src(bAo, "48570.00")] }),
    row({ id: "b-9", name: "Услуги связи", reported: "9600.00", expected: "0.00", delta: "9600.00", status: "discrepancy", category: "договор/связь", ruleId: "R-KEY-01", reason: "В счёт-акте указан договор СИН-2026/09, а не СИН-2026/12",
      sources: [{ docId: bSv.id, page: 1, bbox: [0.14, 0.18, 0.36, 0.03], text: "Договор: СИН-2026/09", amount: "9600.00", matchType: "точное" }] }),
    row({ id: "b-10", name: "Лицензия ПО", reported: "64000.00", expected: "64000.00", delta: "0.00", status: "verified", ruleId: "R-TOL-01", sources: [src(bLc, "64000.00")] }),
    row({ id: "b-11", name: "Канцелярия", reported: "7245.60", expected: "7245.60", delta: "0.00", status: "verified", ruleId: "R-TOL-01", sources: [{ ...src(bUpd0719, "7245.60", "Всего к оплате"), matchType: "после нормализации" }] }),
    row({ id: "b-12", name: "Арифметика КФЗ: сумма строк = итог", reported: "3642495.60", expected: "3642495.60", delta: "0.00", status: "verified", ruleId: "R-ARI-01", service: true, reason: "Сумма строк равна итогу", sources: [src(bKfz, "3642495.60")] }),
    row({ id: "b-13", name: "Итого по этапу против документов", reported: "3642495.60", expected: "3251315.60", delta: "391180.00", status: "discrepancy", category: "сумма (следствие Б1, Б4, Б5, Б8, Б9)", ruleId: "R-COV-01", service: true, reason: "Следствие расхождений в строках Б1, Б4, Б5, Б8, Б9", sources: [src(bKfz, "3642495.60")] }),
  ],
  coverage: { verifiedSum: "1407745.60", discrepancySum: "2234750.00", unverifiedSum: "0.00", totalSum: "3642495.60", verifiedPct: "38.6", discrepancyPct: "61.4", unverifiedPct: "0.0" },
  missing: [],
  log: systemLog("12.11.2026", "Этап 2, договор СИН-2026/12"),
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
  id: "c", title: "Этап 2, договор СИН-2026/14", contract: C, period: PERIOD, conclusion: "Подтвердить полностью нельзя", state: "Готово к разбору",
  docs: [cKfz, ...cVed, ...cVzn, cSp31, cDog33, cUpd0822, cUpd0905, cAr07, cAr08, cAr09, cAr091, cSv],
  rows: [
    row({ id: "c-1", name: "Оплата труда", reported: "960000.00", expected: null, delta: null, status: "unverified", ruleId: "R-AGG-01", reason: "Пропущен документ: ведомость за сентябрь", partialNote: "найдено 720000.00 за 3 из 4 мес.", sources: cVed.map((d) => src(d, "240000.00")) }),
    row({ id: "c-2", name: "Страховые взносы", reported: "288000.00", expected: "288000.00", delta: "0.00", status: "verified", ruleId: "R-AGG-01", sources: cVzn.map((d) => src(d, "72000.00")) }),
    row({ id: "c-3", name: "Субподряд: этап 2.1", reported: "500000.00", expected: "500000.00", delta: "0.00", status: "verified", ruleId: "R-TOL-01", sources: [src(cSp31, "500000.00")] }),
    row({ id: "c-4", name: "Субподряд: этап 2.2", reported: "210000.00", expected: null, delta: null, status: "unverified", ruleId: "R-KEY-01", reason: "Пропущен документ: есть договор № СП-33, нет акта (договор не подтверждает факт затрат)", sources: [src(cDog33, "210000.00", "Цена договора")] }),
    row({ id: "c-5", name: "Материалы", reported: "133800.00", expected: null, delta: null, status: "unverified", ruleId: "R-COV-01", reason: "Документ не прочитан: «УПД 0822-7.png», качество ниже порога OCR", sources: [{ docId: cUpd0822.id, page: 1, bbox: [0.05, 0.05, 0.9, 0.9], text: "Файл не распознан", amount: null, matchType: "точное" }] }),
    row({ id: "c-6", name: "Оборудование", reported: "275000.00", expected: "275000.00", delta: "0.00", status: "verified", ruleId: "R-TOL-01", sources: [src(cUpd0905, "275000.00", "Всего к оплате")] }),
    row({
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
          patch: { status: "discrepancy", expected: "60000.00", delta: "30000.00", category: "договор/связь", manual: true, reason: "Связь выбрана вручную, проверена правилами" },
          checkPatch: { conclusion: "Недостоверен", coverage: { verifiedSum: "1069000.00", discrepancySum: "90000.00", unverifiedSum: "1326100.00", totalSum: "2485100.00", verifiedPct: "43.0", discrepancyPct: "3.6", unverifiedPct: "53.4" } },
        },
      },
    }),
    row({ id: "c-8", name: "Командировки", reported: "22300.00", expected: null, delta: null, status: "unverified", ruleId: "R-COV-01", reason: "Нет документа", sources: [] }),
    row({ id: "c-9", name: "Услуги связи", reported: "6000.00", expected: "6000.00", delta: "0.00", status: "verified", ruleId: "R-TOL-01", sources: [src(cSv, "6000.00")] }),
    row({ id: "c-10", name: "Арифметика КФЗ: сумма строк = итог", reported: "2485100.00", expected: "2485100.00", delta: "0.00", status: "verified", ruleId: "R-ARI-01", service: true, reason: "Сумма строк равна итогу", sources: [src(cKfz, "2485100.00")] }),
  ],
  coverage: { verifiedSum: "1069000.00", discrepancySum: "0.00", unverifiedSum: "1416100.00", totalSum: "2485100.00", verifiedPct: "43.0", discrepancyPct: "0.0", unverifiedPct: "57.0" },
  missing: ["Ведомость ЗП за сентябрь", "Акт по договору СП-33", "Читаемая копия УПД 0822-7", "Авансовый отчёт по командировкам", "Решение по акту аренды за сентябрь"],
  log: systemLog("13.11.2026", "Этап 2, договор СИН-2026/14"),
  excluded: [],
  exceptionOrder: ["c-1", "c-4", "c-5", "c-7", "c-8"],
};

// ================= Проверка g =================
const G = "СИН-2026/15";
const G_MONTHS = [["январь", "31.01.2026", "01"], ["февраль", "28.02.2026", "02"], ["март", "31.03.2026", "03"], ["апрель", "30.04.2026", "04"], ["май", "31.05.2026", "05"]] as const;
const gKfz = doc("g-kfz", "КФЗ, этап 3", "КФЗ", "КФЗ-3", "31.05.2026", G, "2715900.00", { bbox: [0.64, 0.88, 0.22, 0.03] });
const gVed = (["240000.00", "246000.00", "250000.00", "252000.00", "252000.00"]).map((a, i) => { const [m, d, mm] = G_MONTHS[i]!; return doc(`g-ved-${mm}`, `Ведомость ЗП, ${m} 2026`, "Расчётная ведомость", `ВЗ-${mm}`, d, G, a); });
const gVzn = (["72000.00", "73800.00", "75000.00", "75600.00", "75600.00"]).map((a, i) => { const [m, d, mm] = G_MONTHS[i]!; return doc(`g-vzn-${mm}`, `Расчёт страховых взносов, ${m} 2026`, "Расчёт взносов", `РВ-${mm}`, d, G, a, { bbox: [0.6, 0.64, 0.24, 0.03] }); });
const gTo31 = doc("g-to31", "Акт ТО-31", "Акт", "ТО-31", "28.01.2026", G, "118400.00", { bbox: [0.58, 0.55, 0.26, 0.03] });
const gTo48 = doc("g-to48", "Счёт-акт ТО-48", "Счёт-акт", "ТО-48", "25.02.2026", G, "96300.00", { bbox: [0.68, 0.62, 0.18, 0.03] });
const gKl7 = doc("g-kl7", "Служебная записка КЛ-7 (калибровка)", "Служебная записка", "КЛ-7", "16.03.2026", G, "84200.00", { bbox: [0.6, 0.48, 0.24, 0.03] });
const gUpd0426 = doc("g-upd0426", "УПД 0426-12 (аренда оборудования)", "УПД", "0426-12", "26.04.2026", G, "106200.00", { bbox: [0.7, 0.8, 0.18, 0.03] });
const gIa9 = doc("g-ia9", "Акт ИА-9", "Акт", "ИА-9", "31.01.2026", G, "164000.00", { bbox: [0.58, 0.55, 0.26, 0.03] });
const gAd12 = doc("g-ad12", "Акт АД-12", "Акт", "АД-12", "27.02.2026", G, "142500.00", { bbox: [0.58, 0.57, 0.26, 0.03] });
const gIt = doc("g-it0326", "Справка ИТ 03-26", "Справка", "ИТ 03-26", "31.03.2026", G, "128800.00", { bbox: [0.62, 0.6, 0.22, 0.03] });
const gSv = doc("g-sv0426", "Акт связи 0426 (PNG-скан)", "Акт", "0426", "30.04.2026", G, "117000.00", { bbox: [0.66, 0.66, 0.2, 0.03] });
const gUpr = doc("g-upr21", "УПД УПР-21", "УПД", "УПР-21", "29.05.2026", G, "136000.00", { bbox: [0.7, 0.82, 0.18, 0.03] });
const gAd12c = doc("g-ad12-copy", "Акт АД-12 (копия).pdf", "Акт", "АД-12", "27.02.2026", G, "142500.00", { state: "дубль", bbox: [0.58, 0.57, 0.26, 0.03] });
const gOr = doc("g-or0603", "Акт ОР-0603.pdf", "Акт", "ОР-0603", "03.06.2026", G, "57000.00", { state: "вне периода", dateBbox: [0.36, 0.06, 0.2, 0.03] });
const gAd31 = doc("g-ad31", "Акт АД-31 от 15.05.2026.pdf", "Акт", "АД-31", "15.05.2026", G, "64000.00", { state: "другой договор", contractShown: "СИН-2026/16", contractBbox: [0.12, 0.14, 0.36, 0.03] });

const checkG: Check = {
  id: "g", title: "Этап 3, договор СИН-2026/15", contract: G, period: "01.01.2026–31.05.2026", conclusion: "Недостоверен", state: "Готово к разбору",
  reportRow: "Этап 3, 2026 г.",
  docs: [gKfz, ...gVed, ...gVzn, gTo31, gTo48, gKl7, gUpd0426, gIa9, gAd12, gIt, gSv, gUpr, gAd12c, gOr, gAd31],
  rows: [
    row({ id: "g-1", name: "Затраты на оплату труда (0200)", reported: "1240000.00", expected: "1240000.00", delta: "0.00", status: "verified", ruleId: "R-AGG-01", sources: [src(gVed[0], "240000.00"), src(gVed[1], "246000.00"), src(gVed[2], "250000.00"), src(gVed[3], "252000.00"), src(gVed[4], "252000.00")] }),
    row({ id: "g-2", name: "Страховые взносы (0300)", reported: "372000.00", expected: "372000.00", delta: "0.00", status: "verified", ruleId: "R-AGG-01", sources: [src(gVzn[0], "72000.00"), src(gVzn[1], "73800.00"), src(gVzn[2], "75000.00"), src(gVzn[3], "75600.00"), src(gVzn[4], "75600.00")] }),
    row({ id: "g-3", name: "Общепроизводственные затраты (0800)", reported: "415600.00", expected: "405100.00", delta: "10500.00", status: "discrepancy", category: "сумма", ruleId: "R-AGG-01", reason: "Сумма четырёх документов 405 100,00 меньше суммы в отчёте 415 600,00",
      sources: [src(gTo31, "118400.00"), src(gTo48, "96300.00"), src(gKl7, "84200.00"), src(gUpd0426, "106200.00", "Всего к оплате")] }),
    row({ id: "g-4", name: "Общехозяйственные затраты (0900)", reported: "688300.00", expected: "688300.00", delta: "0.00", status: "verified", ruleId: "R-AGG-01", reason: "Сумма совпадает с документами; 3 документа исключены правилами R-DUP-01, R-PER-01, R-KEY-01",
      sources: [src(gIa9, "164000.00"), src(gAd12, "142500.00"), src(gIt, "128800.00"), { ...src(gSv, "117000.00"), matchType: "после нормализации" }, src(gUpr, "136000.00", "Всего к оплате")] }),
    row({ id: "g-5", name: "Трудоёмкость, чел.-ч", unit: "чел.-ч", reported: "1840", expected: null, delta: null, status: "unverified", ruleId: "R-COV-01", reason: "Нет подтверждающих документов", sources: [] }),
    row({ id: "g-6", name: "в т.ч. резерв отпусков (внутри 0200)", nested: true, reported: "96000.00", expected: null, delta: null, status: "unverified", ruleId: "R-COV-01", reason: "Нет отдельного подтверждающего документа", sources: [] }),
    row({ id: "g-7", name: "Итого по этапу против документов", reported: "2715900.00", expected: "2705400.00", delta: "10500.00", status: "discrepancy", category: "сумма (следствие g-3)", ruleId: "R-COV-01", service: true, reason: "Следствие расхождения в строке g-3", sources: [src(gKfz, "2715900.00")] }),
  ],
  coverage: { verifiedSum: "2300300.00", discrepancySum: "415600.00", unverifiedSum: "0.00", totalSum: "2715900.00", verifiedPct: "84.7", discrepancyPct: "15.3", unverifiedPct: "0.0" },
  missing: ["Расчёт трудоёмкости, чел.-ч", "Документ по резерву отпусков"],
  log: systemLog("13.11.2026", "Этап 3, договор СИН-2026/15"),
  excluded: [
    { docId: gAd12c.id, file: "Акт АД-12 (копия).pdf", reason: "дубль", amount: "142500.00", field: "Номер", ruleId: "R-DUP-01", impact: "Совпадает с Актом АД-12 от 27.02.2026: номер, дата, сумма. В сумму не включён, повторно не учтён" },
    { docId: gOr.id, file: "Акт ОР-0603.pdf", reason: "вне периода", amount: "57000.00", field: "Дата", ruleId: "R-PER-01", impact: "Дата 03.06.2026 позже периода 01.01–31.05.2026. В сумму не включён" },
    { docId: gAd31.id, file: "Акт АД-31 от 15.05.2026.pdf", reason: "другой договор", amount: "64000.00", field: "Договор", ruleId: "R-KEY-01", impact: "В документе договор СИН-2026/16, проверяется СИН-2026/15. В сумму не включён" },
  ],
  exceptionOrder: ["g-7", "g-3", "g-5", "g-6"],
};

export const checks: Check[] = [checkA, checkB, checkC, checkG];
export const getCheck = (id: string) => checks.find((c) => c.id === id);
/** Дата проверки — дата первой записи журнала. */
export const checkDate = (c: Check) => c.log[0]?.at.split(" ")[0] ?? "—";
