import { checkName } from "@/lib/check-name";
import { getCheck } from "@/data/mock";
import { createFileRoute } from "@tanstack/react-router";
import { CheckDocuments } from "@/pages/CheckDocuments";
import { useCheckVersion } from "./checks.$id";

export const Route = createFileRoute("/checks/$id/documents")({
  head: ({ params }) => ({ meta: [{ title: `Документы · ${checkName(getCheck(params.id))} — DocCheck` }, { name: "description", content: "Первичные документы и их источники — DocCheck" }, { property: "og:title", content: `Документы · ${checkName(getCheck(params.id))} — DocCheck` }, { property: "og:description", content: "Первичные документы и их источники — DocCheck" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => {
    const { selected } = useCheckVersion();
    return selected ? <CheckDocuments check={selected.result} version={selected.number} key={selected.number} /> : null;
  },
});
