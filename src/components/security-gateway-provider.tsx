import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isPreviewEnvironment } from "@/lib/activity-log";

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
  "bot-factory.org"
];

const STORAGE_KEY = "sv_gateway_passed_v1";

export function SecurityGatewayProvider({ children }: { children: ReactNode }) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    // 1. Check if already passed in this session
    if (sessionStorage.getItem(STORAGE_KEY) === "1") {
      setIsBlocked(false);
      setIsVerifying(false);
      return;
    }

    // 2. Detect high-risk context
    const referrer = typeof document !== "undefined" ? document.referrer : "";
    const isSketchy = SKETCHY_REFERRERS.some(r => referrer.includes(referrer));
    
    // 3. Optional: block preview envs if desired, but user asked for "sketchy web links"
    // For now, only trigger if sketchy referrer OR no referrer + direct hit to sensitive paths (hypothetical)
    if (isSketchy) {
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
