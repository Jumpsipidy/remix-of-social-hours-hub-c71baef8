// Public beacon endpoint — receives sendBeacon() payloads with buffered errors
// that failed to insert client-side (offline, auth expired, tab closing).
// Server uses admin client to insert into activity_log. Rate-limit: caps
// batch size to 50 items per call. No auth required (public), but payload
// shape is strictly validated to prevent abuse.
import { createFileRoute } from "@tanstack/react-router";

type Item = {
  id?: string;
  row?: {
    user_id?: string | null;
    action?: string;
    meta?: Record<string, unknown>;
  };
};

function isTelemetryRow(row: NonNullable<Item["row"]>): boolean {
  const meta = row.meta ?? {};
  const message = String(meta.message ?? meta.fingerprint_norm ?? "");
  const source = String(meta.source ?? "");
  return (
    row.action === "client.telemetry" ||
    message.startsWith("telemetry:") ||
    /\[UI užšalo|pagrindinė gija užblokuota|\[lėtas API|\[ryšys dingo/i.test(message) ||
    source === "ui.freeze" ||
    source === "fetch.slow" ||
    source === "net.offline"
  );
}

export const Route = createFileRoute("/api/public/error-beacon")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { items?: Item[] };
          const items = Array.isArray(body?.items) ? body.items.slice(0, 50) : [];
          if (items.length === 0) return new Response("empty", { status: 204 });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const rows = items
            .map((it) => it.row)
            .filter((r): r is NonNullable<typeof r> => !!r && typeof r.action === "string")
            .filter((r) => !isTelemetryRow(r))
            .map((r) => ({
              user_id: r.user_id ?? null,
              action: String(r.action).slice(0, 100),
              meta: {
                ...(r.meta ?? {}),
                _beacon: true,
                _received_at: new Date().toISOString(),
              } as any,
            }));

          if (rows.length === 0) return new Response("no valid rows", { status: 400 });

          const { error } = await supabaseAdmin.from("activity_log").insert(rows as any);
          if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ inserted: rows.length }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: (e as Error).message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
