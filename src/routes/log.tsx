import { createFileRoute } from "@tanstack/react-router";
import { GlobalLog } from "@/pages/GlobalLog";

export const Route = createFileRoute("/log")({
  head: () => ({ meta: [{ title: "Журнал — DocCheck" }, { name: "description", content: "Журнал действий по всем проверкам" }, { property: "og:title", content: "Журнал — DocCheck" }, { property: "og:description", content: "Журнал действий по всем проверкам" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: GlobalLog,
});
