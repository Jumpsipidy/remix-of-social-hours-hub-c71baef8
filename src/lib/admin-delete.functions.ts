import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Wipe the entire activity_log analytics history. Super admin only. */
export const adminResetAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin.from("profiles").select("role").eq("id", context.userId).maybeSingle();
    if ((me as { role?: string } | null)?.role !== "admin") throw new Error("Reikia administratoriaus teisių");
    const { error, count } = await supabaseAdmin
      .from("activity_log")
      .delete({ count: "exact" })
      .not("id", "is", null);
    if (error) throw new Error(error.message);
    return { deleted: count ?? 0 };
  });

export const adminListAllAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin.from("profiles").select("role").eq("id", context.userId).maybeSingle();
    if ((me as any)?.role !== "admin") throw new Error("Reikia administratoriaus teisių");

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, role, organization_name, org_category, school_id, created_at")
      .order("created_at", { ascending: false });

    // Merge auth.users so orphan accounts (created via OAuth or where
    // handle_new_user failed) also appear and can be deleted.
    const profileMap = new Map<string, any>((profiles ?? []).map((p: any) => [p.id, p]));
    try {
      const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      for (const u of usersPage.users) {
        if (!profileMap.has(u.id)) {
          profileMap.set(u.id, {
            id: u.id,
            email: u.email ?? null,
            full_name: (u.user_metadata as any)?.full_name ?? null,
            role: (u.user_metadata as any)?.role ?? "orphan",
            organization_name: (u.user_metadata as any)?.organization_name ?? null,
            org_category: (u.user_metadata as any)?.org_category ?? null,
            school_id: null,
            created_at: u.created_at ?? new Date().toISOString(),
            orphan: true,
          });
        }
      }
    } catch { /* auth listing best-effort */ }

    const all = Array.from(profileMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return { profiles: all };
  });


export const adminDeleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin.from("profiles").select("role").eq("id", context.userId).maybeSingle();
    if ((me as any)?.role !== "admin") throw new Error("Reikia administratoriaus teisių");
    if (data.userId === context.userId) throw new Error("Negali ištrinti savo paskyros");

    const id = data.userId;
    // Wipe every reference so nothing lingers in the DB
    await supabaseAdmin.from("messages").delete().eq("sender_id", id);
    await supabaseAdmin.from("chat_rooms").delete().or(`student_id.eq.${id},organization_id.eq.${id},school_admin_id.eq.${id}`);
    await supabaseAdmin.from("reservations").delete().or(`student_id.eq.${id},organization_id.eq.${id}`);
    await supabaseAdmin.from("tasks").delete().eq("organization_id", id);
    // Bug reports & access requests (best-effort; ignore if tables absent)
    try { await supabaseAdmin.from("bug_reports").delete().eq("reporter_user_id", id); } catch {}
    try { await supabaseAdmin.from("organization_access_requests").delete().eq("contact_email", (await supabaseAdmin.auth.admin.getUserById(id)).data.user?.email ?? ""); } catch {}

    await supabaseAdmin.from("profiles").delete().eq("id", id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error && !/not.*found/i.test(error.message)) throw new Error(error.message);
    // Verify
    const { data: leftover } = await supabaseAdmin.from("profiles").select("id").eq("id", id).maybeSingle();
    const { data: authLeft } = await supabaseAdmin.auth.admin.getUserById(id);
    return { ok: true, fully_deleted: !leftover && !authLeft?.user };
  });

// ---- Admin quick-action helpers ------------------------------------------

export const adminPurgeOldMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin.from("profiles").select("role").eq("id", context.userId).maybeSingle();
    if ((me as any)?.role !== "admin") throw new Error("Reikia administratoriaus teisių");
    const cutoff = new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString();
    const { count } = await supabaseAdmin.from("messages").delete({ count: "exact" }).lt("created_at", cutoff);
    return { deleted: count ?? 0 };
  });

export const adminWipeAllReservations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin.from("profiles").select("role").eq("id", context.userId).maybeSingle();
    if ((me as any)?.role !== "admin") throw new Error("Reikia administratoriaus teisių");
    const { count } = await supabaseAdmin.from("reservations").delete({ count: "exact" }).not("id", "is", null);
    return { deleted: count ?? 0 };
  });

export const adminWipeAllTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin.from("profiles").select("role").eq("id", context.userId).maybeSingle();
    if ((me as any)?.role !== "admin") throw new Error("Reikia administratoriaus teisių");
    const { count } = await supabaseAdmin.from("tasks").delete({ count: "exact" }).not("id", "is", null);
    return { deleted: count ?? 0 };
  });

export const adminPlatformHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin.from("profiles").select("role").eq("id", context.userId).maybeSingle();
    if ((me as any)?.role !== "admin") throw new Error("Reikia administratoriaus teisių");
    const [p, r, t, m, b, a, s, ss] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("reservations").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("tasks").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("messages").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("bug_reports").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("organization_access_requests").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("schools").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("site_settings").select("id", { count: "exact", head: true }),
    ]);
    return {
      profiles: p.count ?? 0,
      reservations: r.count ?? 0,
      tasks: t.count ?? 0,
      messages: m.count ?? 0,
      bug_reports: b.count ?? 0,
      access_requests: a.count ?? 0,
      schools: s.count ?? 0,
      site_settings: ss.count ?? 0,
    };
  });


// ---- Table inspection (admin/tools drill-down) ---------------------------

const INSPECTABLE = new Set([
  "profiles", "reservations", "tasks", "messages", "chat_rooms",
  "schools", "bug_reports", "organization_access_requests",
  "site_settings", "activity_log", "certificates", "dm_messages",
  "dm_rooms", "friendships", "user_achievements",
]);

export const adminTableSample = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { table: string; limit?: number }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin.from("profiles").select("role").eq("id", context.userId).maybeSingle();
    if ((me as any)?.role !== "admin") throw new Error("Reikia administratoriaus teisių");
    if (!INSPECTABLE.has(data.table)) throw new Error("Lentelė neprieinama");
    const limit = Math.min(Math.max(data.limit ?? 50, 1), 200);
    const { data: rows, count, error } = await (supabaseAdmin as any)
      .from(data.table)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) {
      // Some tables (site_settings) have no created_at → retry without order
      const retry = await (supabaseAdmin as any).from(data.table).select("*", { count: "exact" }).limit(limit);
      if (retry.error) throw new Error(retry.error.message);
      return { rows: retry.data ?? [], total: retry.count ?? 0 };
    }
    return { rows: rows ?? [], total: count ?? 0 };
  });

// Deep health scan: reachability + row counts + latency per critical table.
export const adminDeepHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin.from("profiles").select("role").eq("id", context.userId).maybeSingle();
    if ((me as any)?.role !== "admin") throw new Error("Reikia administratoriaus teisių");
    const tables = [
      "profiles", "reservations", "tasks", "messages", "chat_rooms",
      "schools", "bug_reports", "organization_access_requests",
      "site_settings", "activity_log", "certificates", "dm_messages",
      "friendships", "user_achievements",
    ];
    const results = await Promise.all(tables.map(async (t) => {
      const t0 = performance.now();
      const { count, error } = await (supabaseAdmin as any).from(t).select("id", { count: "exact", head: true });
      const ms = Math.round(performance.now() - t0);
      return { table: t, count: count ?? 0, ms, ok: !error, error: error?.message ?? null };
    }));
    // Bonus: recent critical errors count
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count: critCount } = await supabaseAdmin
      .from("activity_log").select("*", { count: "exact", head: true })
      .eq("action", "app.critical").gte("created_at", since);
    return {
      tables: results,
      recent_critical_24h: critCount ?? 0,
      generated_at: new Date().toISOString(),
    };
  });
