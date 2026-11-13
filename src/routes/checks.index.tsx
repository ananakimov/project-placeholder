import { createFileRoute } from "@tanstack/react-router";
import { Checks } from "@/pages/Checks";

export const Route = createFileRoute("/checks/")({
  head: () => ({ meta: [{ title: "Проверки — DocCheck" }, { name: "description", content: "Список проверок КФЗ" }, { property: "og:title", content: "Проверки — DocCheck" }, { property: "og:description", content: "Список проверок КФЗ" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => <Checks />,
});
