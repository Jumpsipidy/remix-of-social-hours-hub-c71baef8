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
import { AdminAlertMonitor } from "@/components/admin-alert-monitor";
import { AdminErrorHud } from "@/components/admin-error-hud";
import { LovableOverlayBridge } from "@/components/lovable-overlay-bridge";
import { AnalyticsLoader } from "@/components/analytics-loader";
import { CelebrationStage } from "@/components/celebration-overlay";


import { PageViewTracker } from "@/components/page-view-tracker";
import { FriendlyErrorScreen } from "@/components/friendly-error";
import { WebVitalsReporter } from "@/components/web-vitals-reporter";

function NotFoundComponent() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    // Stale hashed assets from an older deploy are not broken links — never log.
    if (/^\/assets\//.test(path) || /\.(js|css|map|png|jpg|svg|ico|webp|woff2?)$/i.test(path)) return;
    // Log 404 to activity_log so admins can see broken links / missing routes.
    void import("@/lib/activity-log").then(({ insertActivityLogRow }) => {
      insertActivityLogRow({
        action: "route.404",
        meta: {
          path: path + window.location.search,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
        },
      }).catch(() => {});
    });
  }, []);
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
    <FriendlyErrorScreen
      error={error}
      onRetry={() => { router.invalidate(); reset(); }}
      source="root.boundary"
    />
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "theme-color", content: "#15102a" },
      { name: "application-name", content: "Socialinės Valandos" },
      { name: "apple-mobile-web-app-title", content: "Soc. Valandos" },
      { name: "author", content: "Socialinės Valandos" },
      { name: "publisher", content: "Socialinės Valandos" },
      { name: "language", content: "Lithuanian" },
      { httpEquiv: "content-language", content: "lt" },
      {
        name: "keywords",
        content:
          "socialinesvalandos, socialinesvalandos.dev, socialines valandos, socialinės valandos, socialiniu valandu centras, socialinės valandos mokiniams, savanorystė Lietuvoje, savanorystės valandos, mokinių savanorystė, savanorystė mokykloje, socialinių valandų apskaita, socialinių valandų sistema, socialinių valandų centras, Šeduvos gimnazija, socialinės valandos internetu, kur atlikti socialines valandas, kaip surinkti socialines valandas, klasės auklėtojas, mokyklos administravimas, savanorystės platforma",
      },

      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "googlebot", content: "index, follow" },
      { name: "bingbot", content: "index, follow" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "lt_LT" },
      { property: "og:site_name", content: "Socialinės Valandos" },
      { property: "og:image:alt", content: "Socialinės Valandos — moksleivių savanorystės platforma" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@socialinesvalandos" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://bacqlmhfokfnmoexijkj.supabase.co" },
      { rel: "preconnect", href: "https://bacqlmhfokfnmoexijkj.supabase.co", crossOrigin: "anonymous" },
      { rel: "preload", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap", as: "style" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "alternate", hrefLang: "lt", href: "https://socialinesvalandos.dev/" },
      { rel: "alternate", hrefLang: "x-default", href: "https://socialinesvalandos.dev/" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Socialinės Valandos",
          alternateName: "Soc. Valandos",
          url: "https://socialinesvalandos.dev/",
          inLanguage: "lt-LT",
          description:
            "Moksleivių socialinių (savanorystės) valandų valdymo platforma Lietuvos mokykloms — mokiniai rezervuoja valandas, organizacijos patvirtina, mokyklos auklėtojai ir direktoriai stebi progresą.",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://socialinesvalandos.dev/tasks?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Socialinės Valandos",
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web",
          inLanguage: "lt-LT",
          url: "https://socialinesvalandos.dev/",
          description:
            "SaaS platforma socialinių valandų apskaitai: rezervacijos, QR įsiregistravimai, PDF sertifikatai su parašu, klasės auklėtojo kabinetas, direktoriaus stebėsena.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
          audience: {
            "@type": "EducationalAudience",
            educationalRole: "student",
          },
          featureList: [
            "Rezervacijų valdymas",
            "QR įsiregistravimas",
            "PDF sertifikatai su parašu",
            "Klasės auklėtojo kabinetas",
            "Real-time pokalbiai",
            "Sukčiavimo aptikimas",
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Socialinės Valandos",
          alternateName: ["Socialinesvalandos", "Soc. Valandos", "Socialinių valandų centras"],
          url: "https://socialinesvalandos.dev/",
          logo: "https://socialinesvalandos.dev/favicon.ico",
          image: "https://socialinesvalandos.dev/og-preview.png",
          foundingDate: "2025",
          areaServed: { "@type": "Country", name: "Lithuania" },
          knowsLanguage: "lt",
          slogan: "Moksleivių savanorystės valandų platforma",
          description:
            "Lietuvos moksleiviams skirta oficiali socialinių (savanorystės) valandų platforma, jungianti mokinius, savanorystės organizacijas ir mokyklas. Naudojama Šeduvos gimnazijoje.",
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: "pagalba@socialinesvalandos.dev",
            areaServed: "LT",
            availableLanguage: ["Lithuanian"],
          },
          sameAs: [
            "https://socialinesvalandos.dev/",
            "https://socialinesvalandos.lovable.app/",
          ],
        }),
      },

      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Kas yra socialinės valandos?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Socialinės valandos — tai savanoriška, neatlyginama veikla, kurią moksleiviai atlieka bendruomenei. Lietuvoje 5–7 klasių mokiniams reikia surinkti 20 valandų, o 8+ klasėms — bent 8 valandas per mokslo metus.",
              },
            },
            {
              "@type": "Question",
              name: "Kur galima atlikti socialines valandas?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Socialinės Valandos platformoje mokiniai randa patvirtintas organizacijas ir bendruomenes, rezervuoja laiką ir gauna oficialius patvirtinimus tiesiai savo mokyklos administratoriui.",
              },
            },
            {
              "@type": "Question",
              name: "Kaip patvirtinamos surinktos valandos?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Organizacija patvirtina valandas per QR įsiregistravimą arba 6 skaitmenų kodą. Mokinys iškart gauna oficialų PDF sertifikatą su parašu, o klasės auklėtoja(s) matomas rezultatas realiu laiku.",
              },
            },
            {
              "@type": "Question",
              name: "Ar klasės auklėtoja gali stebėti savo klasės mokinius?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Taip. Kiekvienai klasei priskirtas mokyklos administratorius (auklėtoja) mato tik savo klasių mokinius, jų rezervacijas ir surinktas valandas. Direktorius mato visą mokyklą.",
              },
            },
          ],
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
        <CelebrationStage />

        <BugReportWidget />
        <CookieConsent />
        {import.meta.env.DEV && <MockTesterPanel />}
        <LockdownGate />
        <ErrorMonitor />
        <AdminAlertMonitor />
        <AdminErrorHud />
        <LovableOverlayBridge />

        <PageViewTracker />
        <WebVitalsReporter />
        <AnalyticsLoader />



      </AuthProvider>
    </QueryClientProvider>

  );
}
