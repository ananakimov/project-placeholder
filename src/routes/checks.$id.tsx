import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { CheckHeader } from "@/components/check/CheckHeader";
import { getCheck } from "@/data/mock";
import { useChecks } from "@/context/ChecksContext";

export const Route = createFileRoute("/checks/$id")({
  head: ({ params }) => {
    const t = getCheck(params.id)?.title ?? "Проверка не найдена";
    return { meta: [{ title: `${t} — DocCheck` }, { name: "description", content: `DocCheck: ${t}` }, { property: "og:title", content: `${t} — DocCheck` }, { property: "og:description", content: `DocCheck: ${t}` }] };
  },
  component: CheckLayout,
});

function CheckLayout() {
  const { id } = Route.useParams();
  const check = useChecks().getCheck(id);
  if (!check)
    return (
      <div className="py-16 text-center">
        <h1 className="font-serif text-[28px] font-semibold">Проверка не найдена</h1>
        <Link to="/checks" className="mt-3 inline-block text-sm text-primary underline">К списку проверок</Link>
      </div>
    );
  return (
    <div>
      <CheckHeader check={check} />
      <div className="mt-6"><Outlet /></div>
    </div>
  );
}
