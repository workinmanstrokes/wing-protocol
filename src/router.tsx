import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  // Portal builds (Poki / CrazyGames) are served from an unknown CDN path inside an iframe, so the single "/"
  // route is matched from memory instead of location.pathname. Everywhere else: normal browser history.
  const portal = typeof window !== "undefined" && !!(window as Window & { PORTAL_BUILD?: string }).PORTAL_BUILD;
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    ...(portal ? { history: createMemoryHistory({ initialEntries: ["/"] }) } : {}),
  });
}
