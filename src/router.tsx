import type { ErrorComponentProps } from "@tanstack/react-router";
import * as Sentry from "@sentry/tanstackstart-react";
import { QueryClient } from "@tanstack/react-query";
import { createRouter, ErrorComponent } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { routeTree } from "./routeTree.gen";
import { FriendlyErrorScreen } from "@/components/friendly-error";

let silentRetries = 0;
/** Trumpalaikės klaidos (tinklas, sesija dar kraunasi) dažnai praeina po
 * sekundės — vieną kartą tyliai bandome iš naujo ir klaidos ekrano
 * nerodome, kad jis nemirksėtų ir neišnyktų. */
function DefaultError({ error, reset }: ErrorComponentProps) {
  const [visible, setVisible] = useState(silentRetries >= 1);
  useEffect(() => {
    if (silentRetries < 1) {
      silentRetries += 1;
      const t = setTimeout(() => { reset(); setVisible(true); }, 700);
      const r = setTimeout(() => { silentRetries = 0; }, 10_000);
      return () => { clearTimeout(t); clearTimeout(r); };
    }
    Sentry.captureException(error, { tags: { boundary: "router.default" } });
  }, [error]);
  if (!visible) return <div className="min-h-[60vh]" aria-busy="true" />;
  return <FriendlyErrorScreen error={error} onRetry={reset} source="router.default" />;
}

function DefaultPending() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pt-24 pb-10 sm:px-6" aria-busy="true" aria-label="Kraunama">
      <div className="sv-skeleton h-8 w-48 rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="sv-skeleton h-24 rounded-2xl bg-muted" />)}
      </div>
      <div className="sv-skeleton h-64 rounded-2xl bg-muted" />
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultError,
    defaultPendingComponent: DefaultPending,
    defaultPendingMs: 250,
    defaultPendingMinMs: 300,
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
