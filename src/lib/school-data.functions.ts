import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SchoolStudent = {
  id: string;
  full_name: string | null;
  email: string | null;
  hours_needed: number;
  hours_earned: number;
  class_year: string | null;
};

export type SchoolOrg = {
  id: string;
  full_name: string | null;
  organization_name: string | null;
  email: string | null;
};

export type SchoolReservation = {
  id: string;
  student_id: string;
  organization_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  hours_to_earn: number;
  status: "pending" | "approved" | "completed" | "confirmed" | "declined";
  legal_disclosure: string | null;
  created_at: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
};

export type SchoolSnapshot = {
  students: SchoolStudent[];
  organizations: SchoolOrg[];
  reservations: SchoolReservation[];
};

const RES_COLUMNS =
  "id, student_id, organization_id, reservation_date, start_time, end_time, hours_to_earn, status, legal_disclosure, created_at, checked_in_at, checked_in_by";

/**
 * RLS on `profiles` hides student rows from school admins, which made the
 * school dashboard render empty tables and zeroed statistics. This returns the
 * real data for the caller's school (and assigned classes only, when set).
 */
export const getSchoolSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SchoolSnapshot> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: me, error: meErr } = await supabaseAdmin
      .from("profiles")
      .select("id, role, school_id, assigned_classes")
      .eq("id", context.userId)
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);

    const meRow = me as
      | { role?: string | null; school_id?: string | null; assigned_classes?: string[] | null }
      | null;
    if (!meRow || (meRow.role !== "school_admin" && meRow.role !== "admin")) {
      throw new Error("Prieiga tik mokyklos administratoriams.");
    }

    let studentQuery = supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, hours_needed, hours_earned, class_year, school_id")
      .eq("role", "student")
      .order("full_name", { ascending: true });

    // Admins see everything; school admins are scoped to their school when set.
    if (meRow.role === "school_admin" && meRow.school_id) {
      studentQuery = studentQuery.eq("school_id", meRow.school_id);
    }

    const [{ data: st, error: stErr }, { data: og, error: ogErr }] = await Promise.all([
      studentQuery,
      supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, organization_name")
        .eq("role", "organization")
        .order("organization_name", { ascending: true }),
    ]);
    if (stErr) throw new Error(stErr.message);
    if (ogErr) throw new Error(ogErr.message);

    const assigned = (meRow.assigned_classes ?? []).map(String).filter(Boolean);
    const students = (((st as (SchoolStudent & { school_id?: string | null })[]) ?? []).filter(
      (s) => !assigned.length || (s.class_year && assigned.includes(String(s.class_year))),
    ) as SchoolStudent[]).map((s) => ({
      id: s.id,
      full_name: s.full_name ?? null,
      email: s.email ?? null,
      hours_needed: Number(s.hours_needed ?? 0),
      hours_earned: Number(s.hours_earned ?? 0),
      class_year: s.class_year ?? null,
    }));

    let reservations: SchoolReservation[] = [];
    const ids = students.map((s) => s.id);
    if (ids.length) {
      const { data: rs, error: rsErr } = await supabaseAdmin
        .from("reservations")
        .select(RES_COLUMNS)
        .in("student_id", ids)
        .order("reservation_date", { ascending: false })
        .limit(1000);
      if (rsErr) throw new Error(rsErr.message);
      reservations = (rs as SchoolReservation[]) ?? [];
    }

    return {
      students,
      organizations: (og as SchoolOrg[]) ?? [],
      reservations,
    };
  });

/** Full reservation history for one student (audit modal). */
export const getSchoolStudentReservations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentId: string }) => {
    if (!input?.studentId) throw new Error("studentId privalomas");
    return { studentId: String(input.studentId) };
  })
  .handler(async ({ context, data }): Promise<SchoolReservation[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", context.userId)
      .maybeSingle();
    const role = (me as { role?: string } | null)?.role;
    if (role !== "school_admin" && role !== "admin") {
      throw new Error("Prieiga tik mokyklos administratoriams.");
    }
    const { data: rs, error } = await supabaseAdmin
      .from("reservations")
      .select(RES_COLUMNS)
      .eq("student_id", data.studentId)
      .order("reservation_date", { ascending: false });
    if (error) throw new Error(error.message);
    return (rs as SchoolReservation[]) ?? [];
  });
