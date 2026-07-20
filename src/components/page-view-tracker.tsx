import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activity-log";

/**
 * Logs a `page.view` row into `activity_log` on every route change.
 * - For signed-in users: uses logActivity (writes user_id).
 * - For anonymous visitors: writes an anon row with a stable session id so
 *   admins still see traffic volume without exposing identity.
 * Throttled to 1 event per unique path per 10 s to avoid double-counting on
 * fast client-side navigations.
 */
const SESSION_KEY = "sv_anon_session";
const THROTTLE_MS = 10_000;

function anonId(): string {
  try {
    const cur = localStorage.getItem(SESSION_KEY);
    if (cur) return cur;
    const id = `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return "anon_ephemeral";
  }
}

export function PageViewTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lastRef = useRef<{ path: string; at: number } | null>(null);

  useEffect(() => {
    if (!pathname) return;
    const now = Date.now();
    if (lastRef.current && lastRef.current.path === pathname && now - lastRef.current.at < THROTTLE_MS) {
      return;
    }
    lastRef.current = { path: pathname, at: now };

    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data.user?.id) {
          await logActivity("page.view", { entityType: "route", meta: { path: pathname } });
        } else {
          // Anonymous — RLS may block; ignore errors silently.
          await supabase.from("activity_log").insert({
            user_id: null,
            action: "page.view",
            entity_type: "route",
            entity_id: null,
            meta: { path: pathname, anon: anonId() },
          } as any);
        }
      } catch {
        // ignore
      }
    })();
  }, [pathname]);

  return null;
}
