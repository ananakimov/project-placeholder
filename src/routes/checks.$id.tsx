import { type CheckSearch, checkLocation, isDemoRun } from "@/lib/check-location";
import { checkName } from "@/lib/check-name";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { CheckHeader } from "@/components/check/CheckHeader";
import { VersionControls } from "@/components/check/VersionControls";
import { getCheck } from "@/data/mock";
import { useChecks } from "@/context/ChecksContext";

export const Route = createFileRoute("/checks/$id")({
  validateSearch: (search: Record<string, unknown>): CheckSearch => {
    const raw = search["version"];
    const version = typeof raw === "string" || typeof raw === "number" ? Number(raw) : NaN;
    return {
      ...(Number.isSafeInteger(version) && version > 0 ? { version } : {}),
      ...(isDemoRun(search["run"]) ? { run: search["run"] } : {}),
    };
  },
  head: ({ params }) => {
    const title = checkName(getCheck(params.id));
    return { meta: [{ title: `${title} — DocCheck` }, { name: "description", content: `DocCheck: ${title}` }, { property: "og:title", content: `${title} — DocCheck` }, { property: "og:description", content: `DocCheck: ${title}` }] };
  },
  component: CheckLayout,
});

export function useCheckVersion() {
  const { id } = Route.useParams();
  const { version, run } = Route.useSearch();
  const store = useChecks();
  const base = store.getCheck(id === "g" && run ? run : id);
  if (!base) return { base, selected: undefined, ready: store.checkHistory.ready && store.demoQueue.ready };
  const { checkHistory } = store;
  const selected = version === undefined ? checkHistory.current(base) : checkHistory.versions(base).find(
    (item) => item.number === version && (item.number === 1 || item.readyAt <= checkHistory.now),
  );
  return { base, selected, ready: checkHistory.ready };
}

function CheckLayout() {
  const { base, selected, ready } = useCheckVersion();
  if (!base && !ready) return <p className="py-12 text-center text-muted-foreground">Загрузка проверки…</p>;
  if (!base)
    return (
      <div className="py-16 text-center">
        <h1 className="font-serif text-[28px] font-semibold">Проверка не найдена</h1>
        <Link to="/checks" className="mt-3 inline-block text-sm text-primary underline">К списку проверок</Link>
      </div>
    );
  if (!selected)
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-semibold">{ready ? "Версия недоступна в этом браузере" : "Загрузка версии…"}</h1>
        {ready && <Link to="/checks/$id" {...checkLocation(base.id)}
          className="mt-3 inline-block text-sm text-primary underline">Открыть текущую версию</Link>}
      </div>
    );
  return (
    <div>
      <CheckHeader check={selected.result} accepted={selected.acceptedAt !== null}
        versionControls={<VersionControls check={base} selected={selected} />} />
      <div className="mt-5"><Outlet /></div>
    </div>
  );
}
