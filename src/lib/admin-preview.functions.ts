import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: me } = await supabaseAdmin.from("profiles").select("role").eq("id", userId).maybeSingle();
  if ((me as { role?: string } | null)?.role !== "admin") throw new Error("Reikia administratoriaus teisių");
  return supabaseAdmin;
}

export type PreviewAccount = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  class_year: string | null;
  organization_name: string | null;
  school_id: string | null;
};

/** Paskyrų sąrašas peržiūrai (mokinys / organizacija / mokyklos administratorius). */
export const adminPreviewAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { role: "student" | "organization" | "school_admin" }) => ({
    role: input?.role ?? "student",
  }))
  .handler(async ({ context, data }): Promise<{ accounts: PreviewAccount[] }> => {
    const sb = await assertAdmin(context.userId);
    const { data: rows, error } = await sb
      .from("profiles")
      .select("id, full_name, email, role, class_year, organization_name, school_id")
      .eq("role", data.role)
      .order("full_name", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return { accounts: (rows as PreviewAccount[]) ?? [] };
  });

export type PreviewSnapshot = {
  account: PreviewAccount & { hours_earned: number; hours_needed: number };
  school_name: string | null;
  reservations: Array<{
    id: string;
    reservation_date: string;
    start_time: string;
    end_time: string;
    hours_to_earn: number;
    status: string;
    counterpart: string | null;
  }>;
  tasks: Array<{ id: string; title: string; task_date: string; is_open: boolean; available_hours: number }>;
  students_in_scope: number;
};

/** Ką realiai mato pasirinkta paskyra savo skydelyje. */
export const adminPreviewSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input?.userId) throw new Error("Pasirink paskyrą");
    return { userId: String(input.userId) };
  })
  .handler(async ({ context, data }): Promise<PreviewSnapshot> => {
    const sb = await assertAdmin(context.userId);
    const { data: acc, error } = await sb
      .from("profiles")
      .select("id, full_name, email, role, class_year, organization_name, school_id, hours_earned, hours_needed")
      .eq("id", data.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!acc) throw new Error("Paskyra nerasta");
    const account = acc as PreviewSnapshot["account"];

    let schoolName: string | null = null;
    if (account.school_id) {
      const { data: s } = await sb.from("schools").select("name").eq("id", account.school_id).maybeSingle();
      schoolName = (s as { name?: string } | null)?.name ?? null;
    }

    const isOrg = account.role === "organization";
    const col = isOrg ? "organization_id" : "student_id";
    const { data: rs } = await sb
      .from("reservations")
      .select("id, student_id, organization_id, reservation_date, start_time, end_time, hours_to_earn, status")
      .eq(col, account.id)
      .order("reservation_date", { ascending: false })
      .limit(50);
    const list = (rs as Array<Record<string, string | number>>) ?? [];

    const otherIds = Array.from(
      new Set(list.map((r) => String(isOrg ? r.student_id : r.organization_id)).filter(Boolean)),
    );
    const nameById = new Map<string, string>();
    if (otherIds.length) {
      const { data: ps } = await sb
        .from("profiles")
        .select("id, full_name, organization_name")
        .in("id", otherIds);
      (ps as Array<{ id: string; full_name: string | null; organization_name: string | null }> | null)?.forEach((p) =>
        nameById.set(p.id, p.organization_name ?? p.full_name ?? "—"),
      );
    }

    let tasks: PreviewSnapshot["tasks"] = [];
    if (isOrg) {
      const { data: t } = await sb
        .from("tasks")
        .select("id, title, task_date, is_open, available_hours")
        .eq("organization_id", account.id)
        .order("task_date", { ascending: false })
        .limit(25);
      tasks = (t as PreviewSnapshot["tasks"]) ?? [];
    }

    let studentsInScope = 0;
    if (account.role === "school_admin" && account.school_id) {
      const { count } = await sb
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "student")
        .eq("school_id", account.school_id);
      studentsInScope = count ?? 0;
    }

    return {
      account: {
        ...account,
        hours_earned: Number(account.hours_earned ?? 0),
        hours_needed: Number(account.hours_needed ?? 0),
      },
      school_name: schoolName,
      reservations: list.map((r) => ({
        id: String(r.id),
        reservation_date: String(r.reservation_date),
        start_time: String(r.start_time),
        end_time: String(r.end_time),
        hours_to_earn: Number(r.hours_to_earn ?? 0),
        status: String(r.status),
        counterpart: nameById.get(String(isOrg ? r.student_id : r.organization_id)) ?? null,
      })),
      tasks,
      students_in_scope: studentsInScope,
    };
  });
