import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { withLoadingDeadline } from "@/lib/loading-control";
import { isPublicStatsFunction } from "@/lib/login-result";

/** Public counters must not wait on an unrelated session-storage refresh. */
export const attachSessionForFunctions = createMiddleware({ type: "function" }).client(
  async ({ next, serverFnMeta, headers }) => {
    // Explicit marker survives opaque production function IDs. It never grants
    // access: protected handlers still require and validate a bearer token.
    if (new Headers(headers).get("x-public-stats") === "1" || isPublicStatsFunction(serverFnMeta?.id ?? "")) return next();
    // Server middleware still validates the token and denies protected reads.
    const { data, error } = await withLoadingDeadline(supabase.auth.getSession(), 15000);
    if (error) throw error;
    const token = data.session?.access_token;
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);