import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeIncidentCode } from "@/lib/incident-code";

/**
 * Super-admin only: find the exact client error behind an incident code
 * ("SC-123456") that a user reported.
 */
export const lookupIncident = createServerFn({ method: "POST" })
  .validator((input: { code: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: me } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", context.userId)
      .maybeSingle();
    if ((me as any)?.role !== "admin") throw new Error("Reikia administratoriaus teisių");

    const code = normalizeIncidentCode(data.code);
    if (!code) throw new Error("Netinkamas formatas. Naudok SC-######");

    // Ensure we are comparing the right meta field.
    // The activity_log table uses a JSONB column 'meta'.
    // We look for rows where meta->>'incident_code' matches exactly.
    const { data: rows, error } = await supabaseAdmin
      .from("activity_log")
      .select("id, action, user_id, created_at, meta")
      .eq("meta->>incident_code", code)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);

    const list = rows ?? [];
    if (list.length === 0) return { code, found: false as const, events: [] };

    const userIds = Array.from(new Set(list.map((r: any) => r.user_id).filter(Boolean)));
    let profiles: Record<string, any> = {};
    if (userIds.length) {
      const { data: ps } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, role, organization_name")
        .in("id", userIds as string[]);
      for (const p of ps ?? []) profiles[(p as any).id] = p;
    }

    return {
      code,
      found: true as const,
      events: list.map((r: any) => ({
        id: r.id,
        action: r.action,
        created_at: r.created_at,
        meta: r.meta ?? {},
        user: r.user_id ? (profiles[r.user_id] ?? { id: r.user_id }) : null,
      })),
    };
  });
