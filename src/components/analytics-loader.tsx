import { useEffect } from "react";
import { hasConsent } from "@/components/cookie-consent";

const GA_ID = "G-4HRBLS0E3G";
const CONSENT_CHANGED_EVENT = "sv:consent-changed";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __svAnalyticsLoaded?: boolean;
  }
}

function loadGoogleAnalytics() {
  if (typeof window === "undefined") return;
  if (window.__svAnalyticsLoaded) return;
  if (!hasConsent("analytics")) return;

  window.__svAnalyticsLoaded = true;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = window.gtag ?? function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { anonymize_ip: true });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  script.dataset.svAnalytics = "google";
  // Reklamų blokatoriai dažnai blokuoja GTM — tai ne klaida, tyliai ignoruojam.
  script.onerror = () => { script.remove(); };
  document.head.appendChild(script);
}

export function AnalyticsLoader() {
  useEffect(() => {
    loadGoogleAnalytics();
    const onConsent = () => {
      const granted = hasConsent("analytics");
      (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = !granted;
      window.gtag?.("consent", "update", { analytics_storage: granted ? "granted" : "denied" });
      if (granted) loadGoogleAnalytics();
      else {
        document.querySelectorAll('script[data-sv-analytics="google"]').forEach((script) => script.remove());
        for (const cookie of document.cookie.split(";")) {
          const name = cookie.split("=")[0]?.trim();
          if (!name || !/^_ga(?:_|$)|^_gid$|^_gat/.test(name)) continue;
          document.cookie = `${name}=; Max-Age=0; path=/`;
          const parts = window.location.hostname.split(".");
          for (let index = 0; index < parts.length - 1; index++) document.cookie = `${name}=; Max-Age=0; path=/; domain=.${parts.slice(index).join(".")}`;
        }
      }
    };
    window.addEventListener(CONSENT_CHANGED_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onConsent);
  }, []);

  return null;
}