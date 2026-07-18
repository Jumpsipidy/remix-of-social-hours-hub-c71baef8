import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: me } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if ((me as { role?: string } | null)?.role !== "admin") {
    throw new Error("Reikia administratoriaus teisių");
  }
  return supabaseAdmin;
}

// -------- SCHOOLS ----------------------------------------------------------

export const adminListSchools = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await assertAdmin(context.userId);
    const { data, error } = await sb
      .from("schools")
      .select("id, name, signup_code, is_active, created_at")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return { schools: data ?? [] };
  });

export const adminUpsertSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    id?: string | null;
    name: string;
    signup_code: string;
    is_active: boolean;
  }) => input)
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context.userId);
    const name = data.name.trim();
    const code = data.signup_code.trim().toUpperCase();
    if (!name || !code) throw new Error("Reikia pavadinimo ir kodo");
    if (data.id) {
      const { error } = await sb
        .from("schools")
        .update({ name, signup_code: code, is_active: data.is_active })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, updated: true };
    }
    const { error } = await sb
      .from("schools")
      .insert({ name, signup_code: code, is_active: data.is_active });
    if (error) throw new Error(error.message);
    return { ok: true, created: true };
  });

export const adminDeleteSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context.userId);
    const { error } = await sb.from("schools").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- MESSAGES AUDIT ---------------------------------------------------

export const adminListRecentMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number }) => input ?? {})
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context.userId);
    const limit = Math.min(Math.max(data.limit ?? 100, 10), 500);
    const { data: rows, error } = await sb
      .from("messages")
      .select("id, room_id, sender_id, content, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    const senderIds = Array.from(new Set((rows ?? []).map((r) => r.sender_id).filter(Boolean)));
    const { data: profs } = await sb
      .from("profiles")
      .select("id, full_name, organization_name, email, role")
      .in("id", senderIds);
    const map = new Map((profs ?? []).map((p) => [p.id, p]));
    return {
      messages: (rows ?? []).map((r) => ({
        ...r,
        sender: map.get(r.sender_id) ?? null,
      })),
    };
  });

export const adminDeleteMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context.userId);
    const { error } = await sb.from("messages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- OVERVIEW DATA (profiles + reservations) --------------------------

export const adminOverviewData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await assertAdmin(context.userId);
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [pRes, rRes, tRes, mRes, schRes] = await Promise.all([
      sb.from("profiles").select("id, role, full_name, organization_name, email, hours_earned, hours_needed"),
      sb.from("reservations").select("id, status, hours_to_earn, reservation_date, organization_id, student_id, created_at").order("created_at", { ascending: false }),
      sb.from("tasks").select("id", { count: "exact", head: true }).eq("is_open", true),
      sb.from("messages").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
      sb.from("schools").select("id", { count: "exact", head: true }),
    ]);
    return {
      profiles: pRes.data ?? [],
      reservations: rRes.data ?? [],
      tasks_open: tRes.count ?? 0,
      messages_24h: mRes.count ?? 0,
      schools_total: schRes.count ?? 0,
    };
  });
