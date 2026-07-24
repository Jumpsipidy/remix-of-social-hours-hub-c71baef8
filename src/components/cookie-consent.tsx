import { useEffect } from "react";

/**
 * Loads Cookie-Script.com CMP. It handles the banner UI + GDPR consent storage.
 * Analytics / marketing scripts must check `window.CookieScript` categories
 * or listen for `CookieScriptLoaded` / `CookieScriptAcceptAll` events before firing.
 */
const CS_SRC = "//cdn.cookie-script.com/s/58e238b4912cfa5336785b6bd8263b6b.js";

export function CookieConsent() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.querySelector(`script[data-cs-loader="1"]`)) return;
    const s = document.createElement("script");
    s.type = "text/javascript";
    s.charset = "UTF-8";
    // Force https to avoid protocol-relative resolution issues on some hosts.
    s.src = `https:${CS_SRC}`;
    s.async = true;
    s.dataset.csLoader = "1";
    // Silently swallow load failures (adblock, DNS, offline). CMP is
    // non-critical — the app must not report it as a runtime error.
    s.onerror = () => {
      try { s.remove(); } catch { /* ignore */ }
      // eslint-disable-next-line no-console
      console.warn("[cookie-consent] CMP script failed to load — skipping banner.");
    };
    document.head.appendChild(s);
  }, []);
  return null;
}

/** Legacy helper kept for backwards compat with older imports. */
export function hasConsent(kind: "analytics" | "marketing"): boolean {
  try {
    const cs = (window as any).CookieScript?.instance?.currentState?.();
    if (!cs) return false;
    if (kind === "analytics") return !!cs.categories?.includes?.("performance");
    if (kind === "marketing") return !!cs.categories?.includes?.("targeting");
  } catch {}
  return false;
}
