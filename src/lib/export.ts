import type { Check } from "@/data/mock";

export const EXPORT_NOTE = "Синтетические данные. Прототип DocCheck";
const STATUS: Record<string, string> = { verified: "Подтверждено", discrepancy: "Расхождение", unverified: "Не проверено" };
const cell = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function checkToCsv(c: Check): string {
  const head = ["Показатель", "В отчёте", "По документам", "Δ", "Статус", "Категория", "Документ", "Страница", "bbox", "Источник значения"];
  const lines = [cell(EXPORT_NOTE), head.join(";")];
  for (const r of c.rows) {
    const base = [r.name, r.reported, r.expected, r.delta, STATUS[r.status], r.category];
    const origin = r.manual ? "вручную" : "система";
    const srcs = r.sources.length ? r.sources : [null];
    for (const s of srcs) {
      const d = s ? c.docs.find((x) => x.id === s.docId) : null;
      lines.push([...base, d?.title ?? s?.docId ?? null, s?.page ?? null, s ? s.bbox.join(",") : null, origin].map(cell).join(";"));
    }
  }
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

export const checkToJson = (c: Check) => JSON.stringify({ note: EXPORT_NOTE, ...c }, null, 2);

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
