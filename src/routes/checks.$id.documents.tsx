import { checkName } from "@/lib/check-name";
import { getCheck } from "@/data/mock";
import { createFileRoute } from "@tanstack/react-router";
import { CheckDocuments } from "@/pages/CheckDocuments";
import { CheckHeader } from "@/components/check/CheckHeader";
import { VersionControls } from "@/components/check/VersionControls";
import { useCheckVersion } from "./checks.$id";

export const Route = createFileRoute("/checks/$id/documents")({
  head: ({ params }) => ({ meta: [{ title: `Документы · ${checkName(getCheck(params.id))} — DocCheck` }, { name: "description", content: "Первичные документы и их источники — DocCheck" }, { property: "og:title", content: `Документы · ${checkName(getCheck(params.id))} — DocCheck` }, { property: "og:description", content: "Первичные документы и их источники — DocCheck" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => {
    const { base, selected } = useCheckVersion();
    return base && selected ? <CheckDocuments check={selected.result} version={selected.number} key={`${base.id}:${selected.number}`}
      renderHeader={(filters) => <CheckHeader check={selected.result} documentFilters={filters}
        versionControls={<VersionControls check={base} selected={selected} />} />} /> : null;
  },
});
