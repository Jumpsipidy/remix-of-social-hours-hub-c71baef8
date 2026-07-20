import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { deviceMeta } from "@/lib/device-meta";
import { insertActivityLogRow } from "@/lib/activity-log";

/**
 * Logs a `page.view` row into `activity_log` on every route change with rich
 * device metadata (device kind, browser, OS, screen size, viewport, language,
 * timezone, referrer host, session id).
 *
 * Admin console paths (`/admin/*`) are intentionally skipped — the analytics
 * dashboard reports admin traffic as a single "super admin" bucket instead.
 * Throttled per unique path to avoid double-counting on fast SPA transitions.
 */
const THROTTLE_MS = 8_000;

export function PageViewTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lastRef = useRef<{ path: string; at: number } | null>(null);

  useEffect(() => {
    if (!pathname) return;
    // Skip admin console — analytics show it as an aggregated "super admin" bucket.
    if (pathname.startsWith("/admin")) return;

    const now = Date.now();
    if (lastRef.current && lastRef.current.path === pathname && now - lastRef.current.at < THROTTLE_MS) {
      return;
    }
    lastRef.current = { path: pathname, at: now };

    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const meta = deviceMeta({ path: pathname });
        await insertActivityLogRow({
          user_id: data.user?.id ?? null,
          action: "page.view",
          entity_type: "route",
          meta,
        });
      } catch {
        // ignore — analytics is best-effort
      }
    })();
  }, [pathname]);

  return null;
}
