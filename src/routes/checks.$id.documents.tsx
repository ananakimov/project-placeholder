import { createFileRoute } from "@tanstack/react-router";
import { CheckDocuments } from "@/pages/CheckDocuments";
import { useChecks } from "@/context/ChecksContext";

export const Route = createFileRoute("/checks/$id/documents")({
  head: ({ params }) => ({ meta: [{ title: `Документы · ${params.id} — DocCheck` }, { name: "description", content: "Первичные документы и их источники — DocCheck" }, { property: "og:title", content: `Документы · ${params.id} — DocCheck` }, { property: "og:description", content: "Первичные документы и их источники — DocCheck" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => {
    const { id } = Route.useParams();
    const check = useChecks().getCheck(id);
    return check ? <CheckDocuments check={check} /> : null;
  },
});
