import { checkName } from "@/lib/check-name";
import { getCheck } from "@/data/mock";
import { createFileRoute } from "@tanstack/react-router";
import { CheckDetail } from "@/pages/CheckDetail";
import { useCheckVersion } from "./checks.$id";

export const Route = createFileRoute("/checks/$id/")({
  head: ({ params }) => ({ meta: [{ title: `Показатели · ${checkName(getCheck(params.id))} — DocCheck` }, { name: "description", content: "Показатели КФЗ, суммы по документам и источники — DocCheck" }, { property: "og:title", content: `Показатели · ${checkName(getCheck(params.id))} — DocCheck` }, { property: "og:description", content: "Показатели КФЗ, суммы по документам и источники — DocCheck" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => {
    const { selected } = useCheckVersion();
    return selected ? <CheckDetail check={selected.result} version={selected.number} /> : null;
  },
});
