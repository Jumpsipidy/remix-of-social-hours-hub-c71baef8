import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const adminListAllAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin.from("profiles").select("role").eq("id", context.userId).maybeSingle();
    if ((me as any)?.role !== "admin") throw new Error("Reikia administratoriaus teisių");
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, role, organization_name, org_category, school_id, created_at")
      .order("created_at", { ascending: false });
    return { profiles: data ?? [] };
  });

export const adminDeleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
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

