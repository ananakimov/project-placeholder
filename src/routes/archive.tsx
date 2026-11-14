import { createFileRoute } from "@tanstack/react-router";
import { Checks } from "@/pages/Checks";

export const Route = createFileRoute("/archive")({
  head: () => ({ meta: [{ title: "Архив проверок — DocCheck" }] }),
  component: () => <Checks archive />,
});
