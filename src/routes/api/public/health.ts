import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const started = Date.now();
        let dbOk = false;
        let dbLatency = 0;

        try {
          const dbStart = Date.now();
          const supaUrl = process.env.SUPABASE_URL;
          const key = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (supaUrl && key) {
            const r = await fetch(`${supaUrl}/rest/v1/schools?select=id&limit=1`, {
              headers: { apikey: key, Authorization: `Bearer ${key}` },
              signal: AbortSignal.timeout(3000),
            });
            dbOk = r.ok;
            dbLatency = Date.now() - dbStart;
          }
        } catch {
          dbOk = false;
        }

        const body = {
          ok: dbOk,
          db: dbOk,
          db_latency_ms: dbLatency,
          total_ms: Date.now() - started,
          timestamp: new Date().toISOString(),
        };

        return new Response(JSON.stringify(body), {
          status: dbOk ? 200 : 503,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, max-age=0",
          },
        });
      },
    },
  },
});
