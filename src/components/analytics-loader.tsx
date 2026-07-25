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
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { anonymize_ip: true });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  script.dataset.svAnalytics = "google";
  document.head.appendChild(script);
}

export function AnalyticsLoader() {
  useEffect(() => {
    loadGoogleAnalytics();
    const onConsent = () => loadGoogleAnalytics();
    window.addEventListener(CONSENT_CHANGED_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onConsent);
  }, []);

  return null;
}