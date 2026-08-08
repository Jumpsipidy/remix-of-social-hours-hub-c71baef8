import { createServerFn } from "@tanstack/react-start";

export type PublicStats = {
  students: number;
  orgs: number;
  hours: number;
  schools: number;
};

const EMPTY: PublicStats = { students: 0, orgs: 0, hours: 0, schools: 0 };

/**
 * Homepage counters. RLS on `profiles` hides other users' rows from anonymous
 * visitors, so a browser query returns 0 for everything. These are aggregate,
 * non-identifying numbers, so we compute them server-side with the admin client
 * and return only totals — never any row data.
 *
 * This function must NEVER throw: the homepage is public and a 500 here would
 * surface as a broken createServerFn request for every visitor. Any failure
 * (missing service-role env, missing table, network hiccup) degrades to zeros.
 */
export const getPublicStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicStats> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const [students, orgs, hours, schools] = await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "student"),
        supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "organization"),
        supabaseAdmin.from("profiles").select("hours_earned").eq("role", "student").not("hours_earned", "is", null),
        supabaseAdmin.from("schools").select("id", { count: "exact", head: true }),
      ]);

      const totalHours = (hours.data ?? []).reduce(
        (a: number, r: { hours_earned: number | null }) => a + (Number(r.hours_earned) || 0),
        0,
      );

      return {
        students: students.count ?? 0,
        orgs: orgs.count ?? 0,
        hours: Math.round(totalHours),
        schools: schools.count ?? 0,
      };
    } catch (error) {
      console.error("[getPublicStats] failed, serving zeros:", error);
      return EMPTY;
    }
  },
);
