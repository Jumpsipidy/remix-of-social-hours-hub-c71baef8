import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ERROR_ACTIONS = [
  "client.error",
  "supabase.error",
  "app.critical",
  "app.warning",
  "app.email_sent",
];

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
