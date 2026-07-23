import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ERROR_ACTIONS = [
  "client.error",
  "supabase.error",
  "app.critical",
  "app.warning",
  "app.email_sent",
];

type ResolveInput = {
  fingerprint: string;
  resolvedInBuild?: string;
  note?: string;
  lastSeenAt?: string;
};

async function ensureAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("profiles")
    .select("role")
    .eq("id", context.userId)
    .maybeSingle();
  if ((data as { role?: string } | null)?.role !== "admin") {
    throw new Error("Reikia super admin teisių");
  }
}

/** Delete all error rows (super admin only). Uses service role to bypass RLS
 *  edge cases and to succeed even when the caller's JWT is close to expiring. */
export const clearAllErrors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error, count } = await supabaseAdmin
      .from("activity_log")
      .delete({ count: "exact" })
      .in("action", ERROR_ACTIONS);
    if (error) throw new Error(error.message);
    return { deleted: count ?? 0 };
  });

/** Delete a single error row by ID. */
export const deleteErrorRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("activity_log")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listResolvedErrorGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("resolved_error_groups")
      .select("fingerprint,resolved_at,resolved_in_build,note,last_seen_at")
      .order("resolved_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const markErrorGroupResolved = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: ResolveInput) => input)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const fingerprint = data.fingerprint?.trim();
    if (!fingerprint) throw new Error("Trūksta fingerprint");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = {
      fingerprint,
      resolved_by: context.userId,
      resolved_in_build: data.resolvedInBuild || "unknown",
      note: data.note ?? null,
      last_seen_at: data.lastSeenAt ?? null,
      resolved_at: new Date().toISOString(),
    };
    const { error } = await supabaseAdmin
      .from("resolved_error_groups")
      .upsert(row, { onConflict: "fingerprint" });
    if (error) throw new Error(error.message);
    return { ok: true, row };
  });

export const unresolveErrorGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { fingerprint: string }) => input)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const fingerprint = data.fingerprint?.trim();
    if (!fingerprint) throw new Error("Trūksta fingerprint");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("resolved_error_groups")
      .delete()
      .eq("fingerprint", fingerprint);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
