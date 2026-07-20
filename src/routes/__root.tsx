import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "../components/ui/sonner";
import { MockTesterPanel } from "../components/mock-tester-panel";
import { BugReportWidget } from "../components/bug-report-widget";
import { CookieConsent } from "../components/cookie-consent";
import { AuthProvider } from "@/hooks/use-auth";
import { LockdownGate } from "@/components/lockdown-gate";
import { ErrorMonitor } from "@/components/error-monitor";
import { PageViewTracker } from "@/components/page-view-tracker";

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
      { name: "keywords", content: "socialinės valandos, savanorystė mokiniams, Šeduvos gimnazija, mokinių savanorystė, socialinių valandų apskaita" },
      { name: "robots", content: "index, follow" },
      { name: "theme-color", content: "#15102a" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "lt_LT" },
      { property: "og:site_name", content: "Socialinės Valandos" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap" },
      { rel: "stylesheet", href: appCss },
    ],
    scripts: [
      { src: "https://www.googletagmanager.com/gtag/js?id=G-4HRBLS0E3G", async: true },
      {
        children: "window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-4HRBLS0E3G');",
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Socialinės Valandos",
          url: "https://socialinesvalandos.lovable.app/",
          inLanguage: "lt-LT",
          description: "Moksleivių savanorystės valandų valdymo platforma Lietuvos mokykloms.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Socialinės Valandos",
          url: "https://socialinesvalandos.lovable.app/",
          description: "Platforma jungianti moksleivius, savanorystės organizacijas ir mokyklas socialinių valandų apskaitai.",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="lt" className="dark" style={{ colorScheme: "dark", backgroundColor: "#0a0819" }}>
      <head>
        <HeadContent />
      </head>
      <body style={{ backgroundColor: "#0a0819", color: "#f5f3ff" }}>
        {children}
        <Scripts />
      </body>
    </html>
  );
}


function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    // App is dark-only. Clear any stale light-theme preference from earlier builds.
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    try { localStorage.removeItem("theme"); } catch {}
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster />
        <BugReportWidget />
        <CookieConsent />
        <MockTesterPanel />
        <LockdownGate />
        <ErrorMonitor />
        <PageViewTracker />
      </AuthProvider>
    </QueryClientProvider>

  );
}
