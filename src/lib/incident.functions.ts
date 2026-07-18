import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Auto-incident reporter. Called by the client-side error monitor when it
 * detects a burst of critical errors (unhandled exceptions, repeated failed
 * health pings). Requires an authenticated session to prevent unauthenticated
 * abuse. If lockdown is already enabled this is a no-op.
 *
 * Cooldown: won't re-arm lockdown within 5 minutes of the previous auto-report
 * (identified by a `[auto]` prefix in lockdown_message).
 */
export const reportCriticalIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code?: string; detail?: string; source?: string }) => ({
    code: (input.code ?? "E-2001").slice(0, 16),
    detail: (input.detail ?? "").slice(0, 240),
    source: (input.source ?? "client-monitor").slice(0, 64),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const current = await supabaseAdmin
      .from("site_settings")
      .select("id, lockdown_enabled, lockdown_message, updated_at")
      .eq("id", true)
      .maybeSingle();

    if (current.error) {
      return { ok: false, reason: "read_failed", message: current.error.message };
    }

    const row = current.data as { lockdown_enabled?: boolean; lockdown_message?: string | null; updated_at?: string | null } | null;

    // Already locked — nothing to do.
    if (row?.lockdown_enabled) {
      return { ok: false, reason: "already_locked" };
    }

    // Cooldown: don't auto-trigger again within 5 minutes of the last auto entry.
    const lastAuto = row?.lockdown_message?.startsWith("[auto]");
    const lastTs = row?.updated_at ? new Date(row.updated_at).getTime() : 0;
    if (lastAuto && Date.now() - lastTs < 5 * 60_000) {
      return { ok: false, reason: "cooldown" };
    }

    const now = new Date().toISOString();
    const msg = `[auto] Aptiktas sistemos gedimas · ${data.source} · ${data.detail || "Kelios nesėkmingos užklausos per trumpą laiką."}`;

    const { error } = await supabaseAdmin
      .from("site_settings")
      .upsert(
        {
          id: true,
          lockdown_enabled: true,
          lockdown_code: data.code || "E-2001",
          lockdown_message: msg,
          updated_at: now,
          updated_by: context.userId,
        },
        { onConflict: "id" },
      );

    if (error) return { ok: false, reason: "write_failed", message: error.message };
    return { ok: true, code: data.code || "E-2001" };
  });
