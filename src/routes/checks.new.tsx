import { createFileRoute } from "@tanstack/react-router";
import { NewCheck } from "@/pages/NewCheck";

export const Route = createFileRoute("/checks/new")({
  head: () => ({ meta: [{ title: "Новая проверка — DocCheck" }, { name: "description", content: "DocCheck: Новая проверка" }, { property: "og:title", content: "Новая проверка — DocCheck" }, { property: "og:description", content: "DocCheck: Новая проверка" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: NewCheck,
});
