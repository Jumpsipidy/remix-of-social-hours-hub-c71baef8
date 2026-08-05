import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { reportCriticalIncident } from "@/lib/incident.functions";
import { useAuth } from "@/hooks/use-auth";
import { installGlobalErrorLogging, logClientError } from "@/lib/error-log";
import { installBreadcrumbs, pushBreadcrumb } from "@/lib/user-breadcrumbs";
import { installStaleDeployGuard } from "@/lib/stale-deploy-guard";


/**
 * Client-side automatic error monitor.
 *
 * Listens to `window.error` and `unhandledrejection` events.
 *
 * When the failure threshold is exceeded within a rolling window, it fires a
 * single authenticated report to the server which auto-enables lockdown for
 * every visitor (including admins — bypass via jumpsipidy + 7851).
 *
 * The report server function has its own cooldown so this can't spam.
 */
const CRITICAL_WINDOW_MS = 60_000;
const CRITICAL_THRESHOLD = 4; // burst of runtime errors

// Console noise / third-party junk we should not treat as critical
const IGNORED = [
  "ResizeObserver loop",
  "Non-Error promise rejection captured",
  "Failed to fetch dynamically imported module",
  "cancelled",
  "AbortError",
  "NetworkError when attempting to fetch resource",
  // React hydration/SSR-mismatch family — cosmetic, self-healing.
  "Minified React error #418",
  "Minified React error #419",
  "Minified React error #421",
  "Minified React error #422",
  "Minified React error #423",
  "Minified React error #425",
  "Minified React error #520",
  "react.dev/errors/",
  "Hydration failed",
  "server rendered HTML didn't match",
  "There was an error while hydrating",
  "Text content does not match server-rendered HTML",
];

export function ErrorMonitor() {
  const { isAuthenticated } = useAuth();
  const report = useServerFn(reportCriticalIncident);
  const reportedRef = useRef(false);
  const eventsRef = useRef<number[]>([]);

  // Install global error logging on every mount (works even without auth —
  // anon-safe inserts are dropped by RLS but console output still fires).
  useEffect(() => {
    installStaleDeployGuard();
    installGlobalErrorLogging();

    installBreadcrumbs(({ label, count }) => {
      // Rage-click: user hammered same element — likely a broken button.
      pushBreadcrumb({ kind: "custom", label: `auto-report rage-click x${count}` });
      void logClientError(new Error(`Rage click detected: ${label} (${count}x)`), {
        source: "rage-click",
        extra: { count, label },
      });
    });
  }, []);

  useEffect(() => {
    // Only actively monitor when someone is signed in — auto-report requires auth
    // and unauthenticated visitors can't write to lockdown regardless.
    if (!isAuthenticated) return;


    const shouldIgnore = (msg: unknown) => {
      const s = String(msg ?? "");
      return IGNORED.some((needle) => s.includes(needle));
    };

    const fire = async (code: string, detail: string, source: string) => {
      if (reportedRef.current) return;
      reportedRef.current = true;
      try {
        await report({ data: { code, detail: detail.slice(0, 240), source } });
      } catch {
        // Server rejected (cooldown / already locked / auth expired) — reset so
        // we can try again next time it's genuinely bad.
        setTimeout(() => {
          reportedRef.current = false;
        }, 60_000);
      }
    };

    const pushEvent = (detail: string) => {
      const now = Date.now();
      const arr = eventsRef.current;
      arr.push(now);
      // trim to window
      while (arr.length && arr[0] < now - CRITICAL_WINDOW_MS) arr.shift();
      if (arr.length >= CRITICAL_THRESHOLD) {
        fire("E-2001", `Aptikta ${arr.length} klaidų per <60s: ${detail}`, "runtime");
      }
    };

    const onError = (e: ErrorEvent) => {
      if (shouldIgnore(e.message) || shouldIgnore(e.error?.message)) return;
      pushEvent(e.message || "unknown error");
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason as unknown;
      const msg = reason instanceof Error ? reason.message : String(reason ?? "");
      if (shouldIgnore(msg)) return;
      pushEvent(msg || "unhandled rejection");
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [isAuthenticated, report]);

  return null;
}
