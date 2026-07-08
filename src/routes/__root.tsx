import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "../components/ui/sonner";
import { MockTesterPanel } from "../components/mock-tester-panel";
import { BugReportWidget } from "../components/bug-report-widget";
import { CookieConsent } from "../components/cookie-consent";
import { AuthProvider } from "@/hooks/use-auth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Puslapis nerastas</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ieškomas puslapis neegzistuoja arba buvo perkeltas.
        </p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Į pradžią
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Puslapis neužsikrovė
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Kažkas nutiko. Bandyk atnaujinti arba grįžti į pradžią.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Bandyti dar
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
            Į pradžią
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Socialinės Valandos — moksleivių savanorystės platforma" },
      { name: "description", content: "Moderni platforma Lietuvos mokyklų moksleiviams atlikti socialines valandas patikimose organizacijose." },
      { name: "keywords", content: "socialinės valandos, savanorystė mokiniams, Šeduvos gimnazija, mokinių savanorystė, socialinių valandų apskaita" },
      { name: "robots", content: "index, follow" },
      { name: "theme-color", content: "#15102a" },
      { property: "og:title", content: "Socialinės Valandos" },
      { property: "og:description", content: "Moksleivių savanorystės valandų valdymo platforma." },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "lt_LT" },
      { property: "og:site_name", content: "Socialinės Valandos" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "canonical", href: "https://socialines-valandos.lt/" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@500;600;700;800&display=swap" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="lt">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster />
        <BugReportWidget />
        <MockTesterPanel />
      </AuthProvider>
    </QueryClientProvider>
  );
}
