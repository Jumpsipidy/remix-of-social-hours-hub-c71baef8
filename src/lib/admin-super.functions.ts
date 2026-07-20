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
  .validator((input: {
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
  .validator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context.userId);
    const { error } = await sb.from("schools").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- MESSAGES AUDIT ---------------------------------------------------

export const adminListRecentMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { limit?: number }) => input ?? {})
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context.userId);
    const limit = Math.min(Math.max(data.limit ?? 100, 10), 500);
    const { data: rows, error } = await sb
      .from("messages")
      .select("id, chat_room_id, sender_id, content, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const senderIds = Array.from(new Set(list.map((r) => r.sender_id).filter((v): v is string => !!v)));
    const { data: profs } = senderIds.length
      ? await sb.from("profiles").select("id, full_name, organization_name, email, role").in("id", senderIds)
      : { data: [] as { id: string; full_name: string | null; organization_name: string | null; email: string | null; role: string }[] };
    const map = new Map((profs ?? []).map((p) => [p.id, p]));
    return {
      messages: list.map((r) => ({
        ...r,
        sender: r.sender_id ? map.get(r.sender_id) ?? null : null,
      })),
    };
  });

export const adminDeleteMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => input)
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

// -------- RESERVATIONS MANAGEMENT -------------------------------------------

export const adminListReservations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { status?: string; limit?: number }) => input ?? {})
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context.userId);
    const limit = Math.min(Math.max(data.limit ?? 200, 10), 1000);
    type Row = {
      id: string; status: "pending" | "confirmed" | "declined" | "approved" | "completed";
      hours_to_earn: number | null; reservation_date: string | null;
      start_time: string | null; end_time: string | null; note: string | null;
      organization_id: string | null; student_id: string | null; created_at: string;
    };
    let q = sb
      .from("reservations")
      .select("id, status, hours_to_earn, reservation_date, start_time, end_time, note, organization_id, student_id, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data.status && data.status !== "all") q = q.eq("status", data.status as Row["status"]);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as unknown as Row[];
    const ids = Array.from(new Set(list.flatMap((r) => [r.student_id, r.organization_id]).filter((v): v is string => !!v)));
    const { data: profs } = ids.length
      ? await sb.from("profiles").select("id, full_name, organization_name, email").in("id", ids)
      : { data: [] as { id: string; full_name: string | null; organization_name: string | null; email: string | null }[] };
    const map = new Map((profs ?? []).map((p) => [p.id, p]));
    return {
      reservations: list.map((r) => ({
        ...r,
        student: r.student_id ? map.get(r.student_id) ?? null : null,
        organization: r.organization_id ? map.get(r.organization_id) ?? null : null,
      })),
    };
  });

export const adminUpdateReservationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string; status: "pending" | "approved" | "completed" | "declined" | "confirmed" }) => input)
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context.userId);
    const { error } = await sb.from("reservations").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context.userId);
    const { error } = await sb.from("reservations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- LEADERBOARD -------------------------------------------------------

export const adminLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await assertAdmin(context.userId);
    const { data, error } = await sb
      .from("profiles")
      .select("id, full_name, email, hours_earned, hours_needed, school_id")
      .eq("role", "student")
      .order("hours_earned", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const schoolIds = Array.from(new Set(rows.map((r) => (r as { school_id?: string | null }).school_id).filter((v): v is string => !!v)));
    const { data: sch } = schoolIds.length
      ? await sb.from("schools").select("id, name").in("id", schoolIds)
      : { data: [] as { id: string; name: string }[] };
    const smap = new Map((sch ?? []).map((s) => [s.id, s.name]));
    return {
      students: rows.map((r) => ({
        ...r,
        school_name: (r as { school_id?: string | null }).school_id ? smap.get((r as { school_id: string }).school_id) ?? null : null,
      })),
    };
  });

// -------- ANALYTICS TRENDS --------------------------------------------------

export const adminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await assertAdmin(context.userId);
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const [rRes, pRes, mRes, aRes] = await Promise.all([
      sb.from("reservations").select("id, status, hours_to_earn, created_at").gte("created_at", since),
      sb.from("profiles").select("id, role, created_at").gte("created_at", since),
      sb.from("messages").select("id, created_at").gte("created_at", since),
      sb.from("activity_log")
        .select("id, user_id, action, created_at, meta")
        .in("action", ["auth.signed_in", "auth.signed_out", "page.view"])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20000),
    ]);
    return {
      reservations: rRes.data ?? [],
      profiles: pRes.data ?? [],
      messages: mRes.data ?? [],
      activity: (aRes.data ?? []) as Array<{
        id: string; user_id: string | null; action: string; created_at: string; meta: { path?: string; anon?: string } | null;
      }>,
    };
  });
