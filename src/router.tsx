import { QueryClient } from "@tanstack/react-query";
import { createRouter, ErrorComponent } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function DefaultError({ error, reset }: { error: Error; reset: () => void }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold">Įvyko klaida</h1>
        <p className="text-sm text-muted-foreground break-words">{msg || "Nežinoma klaida."}</p>
        <div className="flex justify-center gap-2 pt-2">
          <button
            onClick={() => reset()}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Bandyti dar kartą
          </button>
          <a
            href="/"
            className="rounded-full border border-border px-5 py-2 text-sm font-semibold"
          >
            Į pradžią
          </a>
        </div>
        {import.meta.env.DEV && error?.stack && (
          <pre className="mt-4 max-h-64 overflow-auto rounded bg-muted p-3 text-left text-[11px] text-muted-foreground">{error.stack}</pre>
        )}
      </div>
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

  return router;
};

// Silence unused import warning in non-dev bundles
void ErrorComponent;
