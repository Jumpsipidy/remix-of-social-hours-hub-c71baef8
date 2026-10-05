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
    /Minified React error #(418|419|421|422|423|425|520)|react\.dev\/errors\/(418|419|421|422|423|425|520)|Hydration failed|server rendered HTML didn't match|There was an error while hydrating|Text content does not match server-rendered HTML/i.test(
      message,
    ) ||
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
          const body = (await request.json()) as { items?: Item[]; access_token?: unknown };
          const items = Array.isArray(body?.items) ? body.items.slice(0, 50) : [];
          if (items.length === 0) return new Response("empty", { status: 204 });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Only signed-in users may submit; identity comes from the verified token.
          const token = typeof body?.access_token === "string" ? body.access_token : "";
          if (!token || token.split(".").length !== 3) return new Response("unauthorized", { status: 401 });
          const { data: authData } = await supabaseAdmin.auth.getUser(token);
          const uid = authData?.user?.id;
          if (!uid) return new Response("unauthorized", { status: 401 });
          const ALLOWED = new Set(["client.error", "supabase.error"]);

          const rows = items
            .map((it) => it.row)
            .filter((r): r is NonNullable<typeof r> => !!r && typeof r.action === "string" && ALLOWED.has(r.action))
            .filter((r) => !isTelemetryRow(r))
            .map((r) => ({
              user_id: uid,
              action: String(r.action).slice(0, 100),
              meta: {
                ...(JSON.stringify(r.meta ?? {}).length <= 8000 ? (r.meta ?? {}) : { truncated: true }),
                _beacon: true,
                _received_at: new Date().toISOString(),
              } as any,
            }));

          if (rows.length === 0) return new Response("no valid rows", { status: 400 });

          const { error } = await supabaseAdmin.from("activity_log").insert(rows as any);
          if (error) {
            return new Response(JSON.stringify({ error: "insert failed" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ inserted: rows.length }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: "bad request" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
