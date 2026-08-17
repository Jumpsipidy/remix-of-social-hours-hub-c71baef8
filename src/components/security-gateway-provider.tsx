import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isPreviewEnvironment, logActivity } from "@/lib/activity-log";

/**
 * High-risk gateway that triggers a mandatory Captcha if the visitor 
 * comes from a sketchy source or matches high-risk patterns.
 */

type GatewayState = {
  isBlocked: boolean;
  isVerifying: boolean;
  pass: () => void;
};

const GatewayContext = createContext<GatewayState | null>(null);

const SKETCHY_REFERRERS = [
  "sketchy-site.com",
  "spam-link.net",
  "bot-factory.org",
  "dark-web-link.com",
  "malicious-site.net"
];

const SENSITIVE_PATHS = [
  "/admin",
  "/login",
  "/register"
];

const STORAGE_KEY = "sv_gateway_passed_v1";

export function SecurityGatewayProvider({ children }: { children: ReactNode }) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Check if already passed in this session
    if (sessionStorage.getItem(STORAGE_KEY) === "1") {
      setIsBlocked(false);
      setIsVerifying(false);
      return;
    }

    // 2. Heuristic check for "sketchy" activity
    const referrer = document.referrer.toLowerCase();
    const currentPath = window.location.pathname.toLowerCase();
    
    const isSketchyReferrer = SKETCHY_REFERRERS.some(r => referrer.includes(r));
    const isSketchyDeepLink = !referrer && SENSITIVE_PATHS.some(p => currentPath.startsWith(p));
    
    // Check for weird query params often used by bots/scanners
    const queryParams = new URLSearchParams(window.location.search);
    const hasSketchyParams = ["phpmyadmin", "select+", "union+", "exec", "eval"].some(p => 
      Array.from(queryParams.values()).some(v => v.toLowerCase().includes(p))
    );

    if (isSketchyReferrer || isSketchyDeepLink || hasSketchyParams) {
      console.warn("[security-gateway] Sketchy activity detected:", { isSketchyReferrer, isSketchyDeepLink, hasSketchyParams });
      void logActivity("security.sketchy_access", { 
        meta: { 
          referrer, 
          path: currentPath, 
          reason: isSketchyReferrer ? "referrer" : isSketchyDeepLink ? "deeplink" : "params" 
        } 
      });
      setIsBlocked(true);
    }
    
    setIsVerifying(false);
  }, []);

  const pass = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setIsBlocked(false);
  };

  return (
    <GatewayContext.Provider value={{ isBlocked, isVerifying, pass }}>
      {children}
    </GatewayContext.Provider>
  );
}

export function useSecurityGateway() {
  const ctx = useContext(GatewayContext);
  if (!ctx) throw new Error("useSecurityGateway must be used within SecurityGatewayProvider");
  return ctx;
}
