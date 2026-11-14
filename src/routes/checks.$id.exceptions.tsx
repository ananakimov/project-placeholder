import { checkName } from "@/lib/check-name";
import { getCheck } from "@/data/mock";
import { createFileRoute } from "@tanstack/react-router";
import { CheckDetail } from "@/pages/CheckDetail";
import { useChecks } from "@/context/ChecksContext";

export const Route = createFileRoute("/checks/$id/exceptions")({
  head: ({ params }) => ({ meta: [{ title: `Исключения · ${checkName(getCheck(params.id))} — DocCheck` }, { name: "description", content: "Разбор расхождений и непроверенных строк — DocCheck" }, { property: "og:title", content: `Исключения · ${checkName(getCheck(params.id))} — DocCheck` }, { property: "og:description", content: "Разбор расхождений и непроверенных строк — DocCheck" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => {
    const { id } = Route.useParams();
    const check = useChecks().getCheck(id);
    return check ? <CheckDetail check={check} /> : null;
  },
});
