import { createFileRoute } from "@tanstack/react-router";
import { CheckLog } from "@/pages/CheckLog";
import { useChecks } from "@/context/ChecksContext";

export const Route = createFileRoute("/checks/$id/log")({
  head: ({ params }) => ({ meta: [{ title: `Журнал проверки · ${params.id} — DocCheck` }, { name: "description", content: "История действий по проверке КФЗ — DocCheck" }, { property: "og:title", content: `Журнал проверки · ${params.id} — DocCheck` }, { property: "og:description", content: "История действий по проверке КФЗ — DocCheck" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => {
    const { id } = Route.useParams();
    const check = useChecks().getCheck(id);
    return check ? <CheckLog check={check} /> : null;
  },
});
