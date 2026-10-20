import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Super Admin licensed actions. Destructive operations are never executed
 * directly: the browser creates a ticket here, the user confirms on
 * auth.socialinesvalandos.dev (password/OTP + licence key SVC-####-####-#,
 * checked only on that site), and the operation runs in runLicensedAdminAction
 * using the target stored in the ticket (cannot be swapped by the client).
 */
const AUTH_ORIGIN = "https://auth.socialinesvalandos.dev";
export const LICENSED_OPS = ["delete_account", "delete_school", "wipe_reservations", "wipe_tasks", "reset_analytics"] as const;
export type LicensedOp = (typeof LICENSED_OPS)[number];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function adminClient(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: me } = await supabaseAdmin.from("profiles").select("role").eq("id", userId).maybeSingle();
  if ((me as { role?: string } | null)?.role !== "admin") throw new Error("Reikia administratoriaus teisių");
  return supabaseAdmin;
}

export const createLicensedTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    op: z.enum(LICENSED_OPS),
    target: z.string().max(64).default(""),
    description: z.string().min(1).max(300),
    returnUrl: z.string().url(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await adminClient(context.userId);
    const u = new URL(data.returnUrl);
    const okHost = u.hostname === "socialinesvalandos.dev" || u.hostname.endsWith(".socialinesvalandos.dev");
    if (!okHost || u.protocol !== "https:") throw new Error("Licencijos patikra veikia tik socialinesvalandos.dev domene");
    if ((data.op === "delete_account" || data.op === "delete_school") && !UUID.test(data.target)) throw new Error("Netinkamas ID");
    if (data.op === "delete_account" && data.target === context.userId) throw new Error("Negali ištrinti savo paskyros");

    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count } = await sb.from("auth_tickets").select("id", { count: "exact", head: true })
      .eq("user_id", context.userId).gte("created_at", since);
    if ((count ?? 0) >= 5) throw new Error("Per daug bandymų. Pabandyk po kelių minučių.");

    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const nonce = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
    const nonceHash = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");

    const { data: row, error } = await sb.from("auth_tickets").insert({
      user_id: context.userId,
      action: "auth_settings",
      description: data.description,
      payload: { require_license: "1", op: data.op, target: data.target },
      status: "pending",
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      return_url: data.returnUrl,
      origin: "socialinesvalandos.dev",
      nonce_hash: nonceHash,
    }).select("id").single();
    if (error) throw new Error(error.message);
    const ref = row.id.slice(0, 8).toUpperCase();
    return { ref, url: `${AUTH_ORIGIN}/verify/${row.id}?cb=${encodeURIComponent(data.returnUrl)}&ref=${ref}#k=${nonce}` };
  });

export const runLicensedAdminAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ticketId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await adminClient(context.userId);
    const now = new Date().toISOString();
    const { data: rows, error } = await sb.from("auth_tickets")
      .update({ status: "used", consumed_at: now })
      .eq("id", data.ticketId).eq("user_id", context.userId).eq("action", "auth_settings")
      .eq("status", "confirmed").gt("expires_at", now)
      .select("payload");
    if (error) throw new Error(error.message);
    const payload = (rows?.[0]?.payload ?? null) as { require_license?: string; op?: string; target?: string } | null;
    if (!payload || payload.require_license !== "1" || !LICENSED_OPS.includes(payload.op as LicensedOp)) {
      return { ok: false as const, reason: "Patvirtinimas negalioja arba jau panaudotas" };
    }
    await sb.from("auth_security_events").insert({ ticket_id: data.ticketId, user_id: context.userId, event: "ticket.consumed", meta: { op: payload.op } });

    const op = payload.op as LicensedOp;
    const target = String(payload.target ?? "");
    let detail = "";
    if (op === "delete_account") {
      const { deleteAccountOp } = await import("./admin-ops.server");
      await deleteAccountOp(sb, target);
      detail = "Paskyra ištrinta";
    } else if (op === "delete_school") {
      const { error: e } = await sb.from("schools").delete().eq("id", target);
      if (e) throw new Error(e.message);
      detail = "Mokykla ištrinta";
    } else {
      const table = op === "wipe_reservations" ? "reservations" : op === "wipe_tasks" ? "tasks" : "activity_log";
      const { count, error: e } = await sb.from(table).delete({ count: "exact" }).not("id", "is", null);
      if (e) throw new Error(e.message);
      detail = `Ištrinta įrašų: ${count ?? 0}`;
    }
    return { ok: true as const, op, detail };
  });

/**
 * Account deletion without the licence round-trip. Enabled only when the
 * Super Admin explicitly toggles „be licencijos" in the dashboard — weaker
 * protection, so it is logged as a security event.
 */
export const deleteAccountDirect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = await adminClient(context.userId);
    if (data.userId === context.userId) throw new Error("Negali ištrinti savo paskyros");
    const { deleteAccountOp } = await import("./admin-ops.server");
    await deleteAccountOp(sb, data.userId);
    try {
      await sb.from("auth_security_events").insert({ user_id: context.userId, event: "account.deleted_no_license", meta: { target: data.userId } });
    } catch { /* best-effort */ }
    return { ok: true as const };
  });
