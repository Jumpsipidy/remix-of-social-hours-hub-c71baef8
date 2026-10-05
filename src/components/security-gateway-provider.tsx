import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isPreviewEnvironment, logActivity } from "@/lib/activity-log";
import { SecurityGatewayInternal } from "./security-gateway";
import { BOT_THRESHOLD, collectBotSignals } from "@/lib/bot-signals";

/**
 * Security gateway. Blocks the whole app (children are NOT rendered) when the
 * visit looks automated or malicious, until the visitor passes our own
 * "ar jūs ne robotas" check (and reCAPTCHA if that fails).
 */

type GatewayState = {
  isBlocked: boolean;
  isVerifying: boolean;
  reasons: string[];
  pass: () => void;
};

const GatewayContext = createContext<GatewayState | null>(null);

const SKETCHY_REFERRERS = ["sketchy-site.com", "spam-link.net", "bot-factory.org", "dark-web-link.com", "malicious-site.net"];
const SENSITIVE_PATHS = ["/admin"];
const SCANNER_PATH_HINTS = ["/wp-admin", "/wp-login", "/phpmyadmin", "/.env", "/.git", "/config.php", "/xmlrpc.php"];
const INJECTION_HINTS = [
  "phpmyadmin", "select ", "select+", "union ", "union+", "insert ", "drop ",
  "exec(", "eval(", "<script", "javascript:", "../", "onerror=", "pg_sleep", "information_schema",
];
const STORAGE_KEY = "sv_gateway_passed_v2";

export function SecurityGatewayProvider({ children }: { children: ReactNode }) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [reasons, setReasons] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const passedAt = Number(sessionStorage.getItem(STORAGE_KEY) || 0);
    if (passedAt && Date.now() - passedAt < 6 * 3600_000) { setIsVerifying(false); return; }

    const referrer = document.referrer.toLowerCase();
    const currentPath = window.location.pathname.toLowerCase();
    const why: string[] = [];
    if (SKETCHY_REFERRERS.some((r) => referrer.includes(r))) why.push("referrer");
    if (!referrer && (SENSITIVE_PATHS.some((p) => currentPath.startsWith(p)) || SCANNER_PATH_HINTS.some((p) => currentPath.startsWith(p)))) why.push("deeplink");
    const params = new URLSearchParams(window.location.search);
    if (Array.from(params.values()).some((v) => {
      let s = v; try { s = decodeURIComponent(v); } catch { /* keep raw */ }
      s = s.toLowerCase();
      return INJECTION_HINTS.some((p) => s.includes(p));
    })) why.push("params");

    // Automation fingerprint. Skipped in the editor preview so our own
    // automated tests can run there.
    if (!isPreviewEnvironment()) {
      const bot = collectBotSignals();
      if (bot.score >= BOT_THRESHOLD) why.push(...bot.reasons.map((r) => `bot:${r}`));
    }

    if (why.length) {
      void logActivity("security.sketchy_access", { meta: { referrer, path: currentPath, reasons: why } });
      setReasons(why);
      setIsBlocked(true);
    }
    setIsVerifying(false);
  }, []);

  const pass = () => {
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
    void logActivity("security.gateway_passed", { meta: { reasons } });
    setIsBlocked(false);
  };

  return (
    <GatewayContext.Provider value={{ isBlocked, isVerifying, reasons, pass }}>
      {/* While blocked, the app itself is not rendered at all — removing the
          overlay in DevTools reveals nothing. */}
      {isBlocked ? null : children}
      {isBlocked && <GatewaySlot />}
    </GatewayContext.Provider>
  );
}

function GatewaySlot() { return <SecurityGatewayInternal />; }

export function useSecurityGateway() {
  const ctx = useContext(GatewayContext);
  if (!ctx) throw new Error("useSecurityGateway must be used within SecurityGatewayProvider");
  return ctx;
}
