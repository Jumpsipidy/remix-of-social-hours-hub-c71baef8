import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Destructive ops run only via runLicensedAdminAction (admin-license.functions.ts).
const LICENSE_ONLY = true as boolean;

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
    if (LICENSE_ONLY) throw new Error("Šis veiksmas reikalauja licencijos patikros");
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
  .validator((input: { days?: number } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context.userId);
    // RPCs read auth.uid() → they MUST be called through the user-scoped
    // client (context.supabase), not the service-role admin client, or
    // has_role(auth.uid(),'admin') returns false and they throw.
    const userSb = context.supabase;
    const days = Math.min(Math.max(data.days ?? 30, 1), 90);
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

    const [rRes, pRes, mRes, rpcRes, feedRes, rawActivityRes] = await Promise.all([
      sb.from("reservations").select("id, status, hours_to_earn, created_at").gte("created_at", since),
      sb.from("profiles").select("id, role, created_at").gte("created_at", since),
      sb.from("messages").select("id, created_at").gte("created_at", since),
      (userSb.rpc as any)("admin_analytics_v2", { _days: days }),
      (userSb.rpc as any)("admin_recent_activity", { _limit: 80 }),
      sb.from("activity_log").select("id, created_at, action, user_id, meta").gte("created_at", since).order("created_at", { ascending: false }).limit(2500),
    ]);
    const fallbackRows = ((rawActivityRes.data ?? []) as Array<{
      id: string;
      created_at: string;
      action: string;
      user_id: string | null;
      meta: Record<string, unknown> | null;
    }>).filter((row) => !String(row.meta?.path ?? "").startsWith("/admin"));

    // Vienas prisijungęs žmogus = vienas unikalus lankytojas, net jei jis naršo
    // keliose sesijose ar įrenginiuose. Tik neprisijungusiems naudojame sesiją.
    const visitorKey = (row: { id: string; user_id: string | null; meta: Record<string, unknown> | null }) =>
      String(row.user_id ?? row.meta?.session_id ?? row.id);
    const sessionKey = (row: { id: string; user_id: string | null; meta: Record<string, unknown> | null }) =>
      String(row.meta?.session_id ?? row.user_id ?? row.id);


    const fallbackDaily = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const d = date.toISOString().slice(0, 10);
      const dayRows = fallbackRows.filter((row) => row.created_at.slice(0, 10) === d);
      const pageRows = dayRows.filter((row) => row.action === "page.view");
      return {
        d,
        views: pageRows.length,
        uniques: new Set(pageRows.map(visitorKey)).size,
        signins: dayRows.filter((row) => row.action === "auth.signed_in").length,
        signouts: dayRows.filter((row) => row.action === "auth.signed_out").length,
      };
    });
    const pageViews = fallbackRows.filter((row) => row.action === "page.view");
    const countBy = (key: string, limit = 12) => Object.entries(pageViews.reduce<Record<string, number>>((acc, row) => {
      const value = String(row.meta?.[key] ?? (key === "ref_host" ? "(direct)" : "unknown")) || "unknown";
      acc[value] = (acc[value] ?? 0) + 1;
      return acc;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, limit);
    const fallbackAnalytics: AdminAnalyticsV2 = {
      generated_at: new Date().toISOString(),
      range_days: days,
      totals: {
        views: pageViews.length,
        uniques: new Set(pageViews.map(visitorKey)).size,
        signins: fallbackRows.filter((row) => row.action === "auth.signed_in").length,
        signouts: fallbackRows.filter((row) => row.action === "auth.signed_out").length,
        sessions: new Set(fallbackRows.map(sessionKey)).size,
        signed_in_users: new Set(fallbackRows.map((row) => row.user_id).filter(Boolean)).size,
      },
      prev_totals: { views: 0, uniques: 0, signins: 0, signouts: 0 },
      active_now: new Set(pageViews.filter((row) => Date.now() - new Date(row.created_at).getTime() <= 5 * 60 * 1000).map(visitorKey)).size,
      admin_hidden_events: ((rawActivityRes.data ?? []) as Array<{ meta?: Record<string, unknown> | null }>).filter((row) => String(row.meta?.path ?? "").startsWith("/admin")).length,
      daily: fallbackDaily,
      hourly: Array.from({ length: 24 }, (_, h) => {
        const rows = fallbackRows.filter((row) => new Date(row.created_at).getHours() === h);
        const views = rows.filter((row) => row.action === "page.view");
        return { h, views: views.length, signins: rows.filter((row) => row.action === "auth.signed_in").length, uniques: new Set(views.map(visitorKey)).size };
      }),
      weekday: Array.from({ length: 7 }, (_, w) => ({ w, views: pageViews.filter((row) => new Date(row.created_at).getDay() === w).length })),
      top_pages: Object.entries(pageViews.reduce<Record<string, { n: number; u: Set<string> }>>((acc, row) => {
        const path = String(row.meta?.path ?? "/");
        acc[path] ??= { n: 0, u: new Set() };
        acc[path].n += 1;
        acc[path].u.add(visitorKey(row));
        return acc;
      }, {})).sort((a, b) => b[1].n - a[1].n).slice(0, 15).map(([path, value]) => ({ path, n: value.n, u: value.u.size })),
      devices: countBy("device").map(([device, n]) => ({ device, n })),
      browsers: countBy("browser").map(([browser, n]) => ({ browser, n })),
      os: countBy("os").map(([os, n]) => ({ os, n })),
      referrers: countBy("ref_host").map(([host, n]) => ({ host: host || "(direct)", n })),
      languages: countBy("lang").map(([lang, n]) => ({ lang, n })),
    };

    return {
      reservations: rRes.data ?? [],
      profiles: pRes.data ?? [],
      messages: mRes.data ?? [],
      analytics: rpcRes.error ? fallbackAnalytics : rpcRes.data as AdminAnalyticsV2,
      feed: (feedRes.error ? fallbackRows.slice(0, 80).map((row) => ({
        id: row.id,
        created_at: row.created_at,
        action: row.action,
        user_id: row.user_id,
        path: String(row.meta?.path ?? "/"),
        device: String(row.meta?.device ?? "unknown"),
        browser: String(row.meta?.browser ?? "unknown"),
        os: String(row.meta?.os ?? "unknown"),
        ref_host: String(row.meta?.ref_host ?? ""),
        lang: String(row.meta?.lang ?? ""),
        user_name: null,
        user_role: null,
      })) : feedRes.data ?? []) as FeedRow[],
      rawActivity: fallbackRows.map((row) => {
        const m = (row.meta ?? {}) as Record<string, unknown>;
        return {
          id: row.id,
          created_at: row.created_at,
          action: row.action,
          user_id: row.user_id,
          path: String(m.path ?? "/"),
          device: String(m.device ?? "unknown"),
          browser: String(m.browser ?? "unknown"),
          os: String(m.os ?? "unknown"),
          ref_host: String(m.ref_host ?? ""),
          lang: String(m.lang ?? ""),
          screen: String(m.screen ?? ""),
          vp: String(m.vp ?? ""),
          dpr: Number(m.dpr ?? 0),
          tz: String(m.tz ?? ""),
          session_id: String(m.session_id ?? ""),
          visitor_id: String(m.visitor_id ?? ""),

        };
      }),
    };
  });

export type AdminAnalyticsV2 = {
  generated_at: string;
  range_days: number;
  totals: { views: number; uniques: number; signins: number; signouts: number; sessions: number; signed_in_users: number };
  prev_totals: { views: number; uniques: number; signins: number; signouts: number };
  active_now: number;
  admin_hidden_events: number;
  daily: Array<{ d: string; views: number; uniques: number; signins: number; signouts: number }>;
  hourly: Array<{ h: number; views: number; signins: number; uniques: number }>;
  weekday: Array<{ w: number; views: number }>;
  top_pages: Array<{ path: string; n: number; u: number }>;
  devices: Array<{ device: string; n: number }>;
  browsers: Array<{ browser: string; n: number }>;
  os: Array<{ os: string; n: number }>;
  referrers: Array<{ host: string; n: number }>;
  languages: Array<{ lang: string; n: number }>;
};

export type FeedRow = {
  id: string; created_at: string; action: string; user_id: string | null;
  path: string; device: string; browser: string; os: string; ref_host: string; lang: string;
  user_name: string | null; user_role: string | null;
};

