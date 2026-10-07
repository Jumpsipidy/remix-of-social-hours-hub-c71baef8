import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { RES_COLUMNS, fetchAdminProfile, effectiveSchoolId } from "./school-data.server";

export type SchoolStudent = {
  id: string;
  full_name: string | null;
  email: string | null;
  hours_needed: number;
  hours_earned: number;
  class_year: string | null;
  class_letter: string | null;
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
  kind?: string | null;
  source?: string | null;
  requires_checkin?: boolean | null;
  note?: string | null;
  task_id?: string | null;
};

export type SchoolScope = {
  role: "school_admin" | "admin";
  school_id: string | null;
  /** Empty array = visos mokyklos klasės. */
  assigned_classes: string[];
  /** null = abi raidės (A ir B). */
  assigned_letter: string | null;
  /** true kai matomos tik priskirtos klasės (auklėtojo režimas). */
  class_restricted: boolean;
  /** true kai paskyrai nepriskirta mokykla – duomenys neprieinami. */
  unscoped: boolean;
};

export type SchoolSnapshot = {
  students: SchoolStudent[];
  organizations: SchoolOrg[];
  reservations: SchoolReservation[];
  scope: SchoolScope;
};


/**
 * RLS on `profiles` hides student rows from school admins, which made the
 * school dashboard render empty tables and zeroed statistics. This returns the
 * real data for the caller's school (and assigned classes only, when set).
 */
export const getSchoolSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SchoolSnapshot> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const meRow = await fetchAdminProfile(supabaseAdmin as never, context.userId);
    if (!meRow || (meRow.role !== "school_admin" && meRow.role !== "admin")) {
      throw new Error("Prieiga tik mokyklos administratoriams.");
    }

    const mySchoolId = effectiveSchoolId(meRow);
    const assigned = (meRow.assigned_classes ?? []).map(String).map((c: string) => c.trim()).filter(Boolean);
    const scope: SchoolScope = {
      role: meRow.role === "admin" ? "admin" : "school_admin",
      school_id: mySchoolId,
      assigned_classes: assigned,
      assigned_letter: meRow.role === "school_admin" ? (meRow.assigned_letter ?? null) : null,
      class_restricted: meRow.role === "school_admin" && (assigned.length > 0 || !!meRow.assigned_letter),
      unscoped: meRow.role === "school_admin" && !mySchoolId,
    };

    // Mokyklos administratorius be priskirtos mokyklos nemato nieko –
    // kitaip jis pamatytų visų mokyklų mokinius.
    if (scope.unscoped) {
      return { students: [], organizations: [], reservations: [], scope };
    }

    let studentQuery = supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, hours_needed, hours_earned, class_year, class_letter, school_id")
      .eq("role", "student")
      .order("full_name", { ascending: true });

    // Admins see everything; school admins are scoped to their school when set.
    if (meRow.role === "school_admin" && mySchoolId) {
      studentQuery = studentQuery.eq("school_id", mySchoolId);
      if (assigned.length) studentQuery = studentQuery.in("class_year", assigned);
      if (meRow.assigned_letter) studentQuery = studentQuery.eq("class_letter", meRow.assigned_letter);
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

    const students = (((st as (SchoolStudent & { school_id?: string | null })[]) ?? []).filter(
      (s) => !assigned.length || (s.class_year && assigned.includes(String(s.class_year))),
    ) as SchoolStudent[]).map((s) => ({
      id: s.id,
      full_name: s.full_name ?? null,
      email: s.email ?? null,
      hours_needed: Number(s.hours_needed ?? 0),
      hours_earned: Number(s.hours_earned ?? 0),
      class_year: s.class_year ?? null,
      class_letter: (s as { class_letter?: string | null }).class_letter ?? null,
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
      scope,
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
    const meRow = await fetchAdminProfile(supabaseAdmin as never, context.userId);
    const role = meRow?.role;
    if (role !== "school_admin" && role !== "admin") {
      throw new Error("Prieiga tik mokyklos administratoriams.");
    }
    const mySchoolId = effectiveSchoolId(meRow);

    // Auditą galima matyti tik savo mokyklos (ir priskirtos klasės) mokinio.
    if (role === "school_admin") {
      const { data: stu } = await supabaseAdmin
        .from("profiles")
        .select("id, role, school_id, class_year, class_letter")
        .eq("id", data.studentId)
        .maybeSingle();
      const s = stu as
        | { role?: string | null; school_id?: string | null; class_year?: string | null }
        | null;
      const assigned = (meRow?.assigned_classes ?? []).map(String).map((c: string) => c.trim()).filter(Boolean);
      const sameSchool = !!mySchoolId && s?.school_id === mySchoolId;
      const inClass = (!assigned.length || (!!s?.class_year && assigned.includes(String(s.class_year))))
        && (!meRow?.assigned_letter || (s as { class_letter?: string | null } | null)?.class_letter === meRow.assigned_letter);

      if (!s || s.role !== "student" || !sameSchool || !inClass) {
        throw new Error("Šis mokinys nepriklauso jūsų klasei ar mokyklai.");
      }
    }
    const { data: rs, error } = await supabaseAdmin
      .from("reservations")
      .select(RES_COLUMNS)
      .eq("student_id", data.studentId)
      .order("reservation_date", { ascending: false });
    if (error) throw new Error(error.message);
    return (rs as SchoolReservation[]) ?? [];
  });

/**
 * Mokyklos administratorius pats prisiriša prie mokyklos su mokyklos kodu –
 * nereikia laukti super administratoriaus.
 */
export const claimSchoolForAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { schoolId: string; code: string }) => {
    if (!input?.schoolId) throw new Error("Pasirink mokyklą.");
    if (!input?.code) throw new Error("Įvesk mokyklos kodą.");
    return { schoolId: String(input.schoolId), code: String(input.code).trim().toUpperCase() };
  })
  .handler(async ({ context, data }): Promise<{ ok: true; schoolId: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await fetchAdminProfile(supabaseAdmin as never, context.userId);
    if (!me || (me.role !== "school_admin" && me.role !== "admin")) {
      throw new Error("Prieiga tik mokyklos administratoriams.");
    }
    const { data: valid, error: rpcErr } = await supabaseAdmin.rpc("verify_school_signup_code", {
      _school_id: data.schoolId,
      _code: data.code,
    });
    if (rpcErr) throw new Error(rpcErr.message);
    if (!valid) throw new Error("Neteisingas mokyklos kodas.");

    let upd = await supabaseAdmin
      .from("profiles")
      .update({ school_id: data.schoolId, associated_school_id: data.schoolId })
      .eq("id", context.userId);
    if (upd.error) {
      upd = await supabaseAdmin
        .from("profiles")
        .update({ school_id: data.schoolId })
        .eq("id", context.userId);
    }
    if (upd.error) throw new Error(upd.error.message);
    return { ok: true, schoolId: data.schoolId };
  });
