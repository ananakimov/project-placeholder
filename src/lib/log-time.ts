/** "13.11.2026 12:05" for now. */
export function nowStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
/** Sortable key "yyyymmddhhmm" from "dd.mm.yyyy hh:mm". */
export function stampKey(s: string): string {
  const [date = "", time = ""] = s.split(" ");
  const [dd = "", mm = "", yy = ""] = date.split(".");
  return `${yy}${mm}${dd}${time.replace(":", "")}`;
}
export type ActorType = "system" | "human" | "ai";
export const actorType = (actor: string): ActorType => (actor === "Система" ? "system" : actor === "ИИ" ? "ai" : "human");
