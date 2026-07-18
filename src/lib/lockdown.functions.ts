import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeLockdownSettings, requireAdminClient } from "./lockdown.server";

const SETTINGS_COLUMNS = "id, lockdown_enabled, lockdown_message, updated_at, updated_by";

export const adminGetLockdownSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await requireAdminClient(context);
    const { data, error } = await supabaseAdmin
      .from("site_settings")
      .select(SETTINGS_COLUMNS)
      .eq("id", true)
      .maybeSingle();

    if (error) throw new Error(`Lockdown nustatymai nepasiekiami: ${error.message}`);
    if (data) return { settings: normalizeLockdownSettings(data) };

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("site_settings")
      .upsert({ id: true, lockdown_enabled: false }, { onConflict: "id" })
      .select(SETTINGS_COLUMNS)
      .single();

    if (insertError) throw new Error(`Nepavyko sukurti Lockdown nustatymų: ${insertError.message}`);
    return { settings: normalizeLockdownSettings(inserted) };
  });

export const adminUpdateLockdownSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lockdown_enabled?: boolean; lockdown_message?: string | null }) => input)
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await requireAdminClient(context);
    const patch: Record<string, unknown> = {
      id: true,
      updated_at: new Date().toISOString(),
      updated_by: context.userId,
    };

    if (typeof data.lockdown_enabled === "boolean") patch.lockdown_enabled = data.lockdown_enabled;
    if ("lockdown_message" in data) {
      const trimmed = (data.lockdown_message ?? "").trim();
      patch.lockdown_message = trimmed.length ? trimmed : null;
    }

    const { data: updated, error } = await supabaseAdmin
      .from("site_settings")
      .upsert(patch, { onConflict: "id" })
      .select(SETTINGS_COLUMNS)
      .single();

    if (error) throw new Error(`Nepavyko išsaugoti Lockdown nustatymų: ${error.message}`);
    return { settings: normalizeLockdownSettings(updated) };
  });

export const adminRunLockdownHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await requireAdminClient(context);
    const checks: Array<{ label: string; ok: boolean; detail: string }> = [];

    const settings = await supabaseAdmin.from("site_settings").select("id", { count: "exact", head: true });
    checks.push({
      label: "Lockdown lentelė",
      ok: !settings.error,
      detail: settings.error ? settings.error.message : `${settings.count ?? 0} nustatymų įrašas`,
    });

    const profile = await supabaseAdmin.from("profiles").select("id, role").eq("id", context.userId).maybeSingle();
    checks.push({
      label: "Super Admin profilis",
      ok: !profile.error && (profile.data as any)?.role === "admin",
      detail: profile.error ? profile.error.message : `rolė: ${(profile.data as any)?.role ?? "nerasta"}`,
    });

    const authUser = await supabaseAdmin.auth.admin.getUserById(context.userId);
    checks.push({
      label: "Autentifikacija",
      ok: !authUser.error && Boolean(authUser.data.user),
      detail: authUser.error ? authUser.error.message : "vartotojo sesija galioja",
    });

    const adminClient = supabaseAdmin as any;
    const tableChecks = await Promise.all(
      ["profiles", "reservations", "tasks", "messages", "schools"].map(async (table) => {
        const result = await adminClient.from(table).select("id", { count: "exact", head: true });
        return {
          label: table,
          ok: !result.error,
          detail: result.error ? result.error.message : `${result.count ?? 0} įrašų`,
        };
      }),
    );

    return {
      generated_at: new Date().toISOString(),
      checks: [...checks, ...tableChecks],
    };
  });