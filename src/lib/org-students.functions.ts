import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OrgStudent = {
  id: string;
  full_name: string | null;
  email: string | null;
  hours_earned: number;
  class_year: string | null;
};

/**
 * RLS on `profiles` usually hides student rows from organizations, so the
 * dashboard fell back to "Mokinys". This returns names only for students who
 * actually have a reservation with the calling organization.
 */
export const listOrgStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OrgStudent[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: res, error: resErr } = await supabaseAdmin
      .from("reservations")
      .select("id, student_id")
      .eq("organization_id", context.userId);
    if (resErr) throw new Error(resErr.message);
    const rows = (res as { id: string; student_id: string | null }[] | null) ?? [];
    const idSet = new Set(rows.map((r) => r.student_id).filter((v): v is string => !!v));
    // Group members invited to this organization's reservations are also visible to it.
    const resIds = rows.map((r) => r.id);
    for (let i = 0; i < resIds.length; i += 200) {
      const { data: parts } = await supabaseAdmin
        .from("reservation_participants")
        .select("student_id")
        .in("reservation_id", resIds.slice(i, i + 200))
        .neq("status", "removed");
      ((parts as { student_id: string }[] | null) ?? []).forEach((p) => idSet.add(p.student_id));
    }
    const ids = Array.from(idSet);
    if (!ids.length) return [];
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, hours_earned, class_year")
      .in("id", ids);
    if (error) throw new Error(error.message);
    return (data as OrgStudent[]) ?? [];
  });
