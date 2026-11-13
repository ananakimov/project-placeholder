import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/checks/new" });
  },
  head: () => ({
    meta: [
      { title: "DocCheck" },
      { name: "description", content: "Сверка КФЗ с первичными документами" },
      { property: "og:title", content: "DocCheck" },
      { property: "og:description", content: "Сверка КФЗ с первичными документами" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
