import { checkName } from "@/lib/check-name";
import { getCheck } from "@/data/mock";
import { createFileRoute } from "@tanstack/react-router";
import { CheckDetail } from "@/pages/CheckDetail";
import { useChecks } from "@/context/ChecksContext";

export const Route = createFileRoute("/checks/$id/conclusion")({
  head: ({ params }) => ({ meta: [{ title: `Вывод · ${checkName(getCheck(params.id))} — DocCheck` }, { name: "description", content: "Вывод по проверке КФЗ и подпись — DocCheck" }, { property: "og:title", content: `Вывод · ${checkName(getCheck(params.id))} — DocCheck` }, { property: "og:description", content: "Вывод по проверке КФЗ и подпись — DocCheck" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => {
    const { id } = Route.useParams();
    const check = useChecks().getCheck(id);
    return check ? <CheckDetail key={check.id} check={check} /> : null;
  },
});
