import type { ErrorComponentProps } from "@tanstack/react-router";
import * as Sentry from "@sentry/tanstackstart-react";
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
import { SecurityGatewayProvider } from "@/components/security-gateway-provider";
import { SecurityGatewayInternal } from "@/components/security-gateway";
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

import { NotFoundScreen } from "@/components/not-found-screen";

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
  return <NotFoundScreen path={typeof window !== "undefined" ? window.location.pathname : undefined} />;
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    Sentry.captureException(error, { tags: { boundary: "root.boundary" } });
  }, [error]);
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
      { name: "theme-color", content: "#0a0819" },
      { name: "application-name", content: "Socialinės Valandos" },
      { name: "apple-mobile-web-app-title", content: "Soc. Valandos" },
      { name: "author", content: "Socialinės Valandos (VšĮ Savanorystės Inovacijos)" },
      { name: "publisher", content: "Šeduvos gimnazija" },

      { name: "language", content: "Lithuanian" },
      { httpEquiv: "content-language", content: "lt" },
      {
        name: "keywords",
        content:
          "socialines valandos, socialinės valandos, socialinesvalandos, socialinesvalandos.dev, socialiniu valandu centras, socialinių valandų centras, savanorystės sistema, socialinės valandos mokiniams, savanorystė Lietuvoje, savanorystės valandos, mokinių savanorystė, savanorystė mokykloje, socialinių valandų apskaita, socialinių valandų sistema, Šeduvos gimnazija, socialinės valandos internetu, savanorystės platforma, savanoriška veikla, savanoriauk, jauno žmogaus savanorystė, savanorystė Šeduvoje, savanorystės valandų centras, kur rinkti socialines valandas, socialines valandas seduvos gimnazija, socialinių valandų centras lietuva",
      },

      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "googlebot", content: "index, follow, max-snippet:-1, max-image-preview:large" },
      { name: "bingbot", content: "index, follow" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "lt_LT" },
      { property: "og:site_name", content: "Socialinės Valandos" },
      { property: "og:image:alt", content: "Socialinės Valandos — oficiali moksleivių savanorystės platforma" },
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
      { rel: "icon", type: "image/png", href: "/favicon.png?v=8" },
      { rel: "apple-touch-icon", href: "/favicon.png?v=8" },
      { rel: "shortcut icon", href: "/favicon.ico?v=8" },

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
          logo: "https://socialinesvalandos.dev/favicon.png?v=8",
          image: "https://socialinesvalandos.dev/favicon.png?v=8",
          foundingDate: "2025",
          areaServed: { "@type": "Country", name: "Lithuania" },
          knowsLanguage: "lt",
          slogan: "Moksleivių savanorystės valandų platforma",
          description:
            "Lietuvos moksleiviams skirta oficiali socialinių (savanorystės) valandų platforma, jungianti mokinius, savanorystės organizacijas ir mokyklas. Naudojama Šeduvos gimnazijoje ir atvira visai Lietuvai.",

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
    <html lang="lt" className="dark" style={{ colorScheme: "dark", backgroundColor: "oklch(0.13 0.015 250)" }}>
      <head>
        <HeadContent />
      </head>
      <body style={{ backgroundColor: "oklch(0.13 0.015 250)", color: "oklch(0.96 0.006 250)" }}>
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
    // Slaptažodžio atkūrimo laiškas kartais grąžina į pagrindinį puslapį su
    // #access_token…&type=recovery. Nukreipiam į tikrą atkūrimo puslapį.
    const { hash, search, pathname } = window.location;
    const isRecovery = /type=recovery/.test(hash) || /type=recovery/.test(search);
    if (isRecovery && pathname !== "/update-password") {
      window.location.replace(`/update-password${search}${hash}`);
    }
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SecurityGatewayProvider>
          <SecurityGatewayInternal />
          {/* Be „mode=wait" — kitaip senas puslapis išnyksta anksčiau nei
              atsiranda naujas ir matosi juodas blyksnis. */}
          <div className="flex-1 flex flex-col">
            <Outlet />
          </div>

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
        </SecurityGatewayProvider>
      </AuthProvider>
    </QueryClientProvider>

  );
}
