import { createFileRoute } from "@tanstack/react-router";

/**
 * Public liveness check. Anonymous callers only learn that the app responds;
 * the database probe runs only when the caller presents HEALTH_CHECK_TOKEN
 * (Authorization: Bearer <token> or x-health-token), so strangers cannot use
 * this endpoint to trigger database requests.
 */
function hasValidToken(request: Request): boolean {
  const expected = process.env.HEALTH_CHECK_TOKEN;
  if (!expected || expected.length < 16) return false;
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const provided = bearer || (request.headers.get("x-health-token") ?? "").trim();
  return provided.length > 0 && provided === expected;
}

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const started = Date.now();
        const headers = {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, max-age=0",
        };

        if (!hasValidToken(request)) {
          return new Response(
            JSON.stringify({ ok: true, timestamp: new Date().toISOString() }),
            { status: 200, headers },
          );
        }

        let dbOk = false;
        let dbLatency = 0;
        try {
          const dbStart = Date.now();
          const supaUrl = process.env.SUPABASE_URL;
          const key = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (supaUrl && key) {
            const r = await fetch(`${supaUrl}/rest/v1/schools?select=id&limit=1`, {
              headers: { apikey: key },
              signal: AbortSignal.timeout(3000),
            });
            dbOk = r.ok;
            dbLatency = Date.now() - dbStart;
          }
        } catch {
          dbOk = false;
        }

        return new Response(
          JSON.stringify({
            ok: dbOk,
            db: dbOk,
            db_latency_ms: dbLatency,
            total_ms: Date.now() - started,
            timestamp: new Date().toISOString(),
          }),
          { status: dbOk ? 200 : 503, headers },
        );
      },
    },
  },
});
