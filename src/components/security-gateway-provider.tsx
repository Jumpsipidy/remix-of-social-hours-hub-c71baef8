import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isPreviewEnvironment, logActivity } from "@/lib/activity-log";
import { SecurityGatewayInternal } from "./security-gateway";
import { BOT_THRESHOLD, collectBotSignals } from "@/lib/bot-signals";
import { checkGatePass } from "@/lib/bot-gate.functions";

/**
 * Security gateway. Blocks the whole app (children are NOT rendered) when the
 * visit looks automated or malicious, until the visitor passes our own
 * "ar jūs ne robotas" check (and reCAPTCHA if that fails).
 */

type GatewayState = {
  isBlocked: boolean;
  isVerifying: boolean;
  reasons: string[];
  pass: (token?: string) => void;
};

const GatewayContext = createContext<GatewayState | null>(null);

const SKETCHY_REFERRERS = ["sketchy-site.com", "spam-link.net", "bot-factory.org", "dark-web-link.com", "malicious-site.net"];
const SENSITIVE_PATHS = ["/admin"];
const SCANNER_PATH_HINTS = ["/wp-admin", "/wp-login", "/phpmyadmin", "/.env", "/.git", "/config.php", "/xmlrpc.php"];
const INJECTION_HINTS = [
  "phpmyadmin", "select ", "select+", "union ", "union+", "insert ", "drop ",
  "exec(", "eval(", "<script", "javascript:", "../", "onerror=", "pg_sleep", "information_schema",
];
const STORAGE_KEY = "sv_gateway_pass_v3";

export function SecurityGatewayProvider({ children }: { children: ReactNode }) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [reasons, setReasons] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    // Testavimui: ?patikra=testas visada parodo robotų patikrą.
    const forceTest = new URLSearchParams(window.location.search).get("patikra") === "testas";

    const runChecks = () => {
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
      if (forceTest) why.push("manual-test");
      if (cancelled) return;
      if (why.length) {
        void logActivity("security.sketchy_access", { meta: { referrer, path: currentPath, reasons: why } });
        setReasons(why);
        setIsBlocked(true);
      }
      setIsVerifying(false);
    };

    const token = forceTest ? null : sessionStorage.getItem(STORAGE_KEY);
    if (!token) { runChecks(); return; }
    // A stored pass is only trusted after the server confirms its signature.
    void checkGatePass({ data: { token } })
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setIsVerifying(false);
        else { sessionStorage.removeItem(STORAGE_KEY); runChecks(); }
      })
      .catch(() => { if (!cancelled) runChecks(); });
    return () => { cancelled = true; };
  }, []);

  const pass = (token?: string) => {
    if (token) sessionStorage.setItem(STORAGE_KEY, token);
    void logActivity("security.sketchy_access", { meta: { passed: true, reasons } });
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
