import type { ErrorComponentProps } from "@tanstack/react-router";
import * as Sentry from "@sentry/tanstackstart-react";
import { QueryClient } from "@tanstack/react-query";
import { createRouter, ErrorComponent } from "@tanstack/react-router";
import { useEffect } from "react";
import { routeTree } from "./routeTree.gen";
import { FriendlyErrorScreen } from "@/components/friendly-error";

function DefaultError({ error, reset }: ErrorComponentProps) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { boundary: "router.default" } });
  }, [error]);
  return <FriendlyErrorScreen error={error} onRetry={reset} source="router.default" />;
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultError,
    defaultNotFoundComponent: () => (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-3xl font-bold">404</h1>
          <p className="text-sm text-muted-foreground">Puslapis nerastas.</p>
          <a href="/" className="inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Į pradžią</a>
        </div>
      </div>
    ),
  });

  if (!router.isServer) {
    Sentry.addIntegration(Sentry.tanstackRouterBrowserTracingIntegration(router));
  }

  return router;
};

// Silence unused import warning in non-dev bundles
void ErrorComponent;
