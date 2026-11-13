import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, rootRouteId } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { getRouter } from "@/router";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("keeps navigation and direct links under the GitHub Pages base path", () => {
    vi.stubEnv("BASE_URL", "/project-placeholder/");
    const router = getRouter();

    expect(router.buildLocation({ to: "/checks/new" }).href).toBe("/project-placeholder/checks/new");
    expect(router.buildLocation({ to: "/checks/$id", params: { id: "g" } }).href).toBe("/project-placeholder/checks/g");
    const history = createMemoryHistory({ initialEntries: ["/project-placeholder/checks/g/"] });
    expect(router.matchRoutes(router.parseLocation(history.location)).at(-1)?.routeId).toBe("/checks/$id/");
  });

  it("has no rules page", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/rules").at(-1)?.routeId).toBe(rootRouteId);
  });

  it.each(["/checks/g", "/checks/g/documents", "/checks/g/conclusion", "/checks/g/log"])("keeps %s available", (path) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes(path).at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
});
