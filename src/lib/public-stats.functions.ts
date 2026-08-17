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

      const [students, orgs, hoursCount, schools] = await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "student"),
        supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "organization"),
        supabaseAdmin
          .from("profiles")
          .select("hours_earned", { count: "exact" })
          .eq("role", "student")
          .not("hours_earned", "is", null),
        supabaseAdmin.from("schools").select("id", { count: "exact", head: true }),
      ]);

      const totalHours = (hoursCount.data ?? []).reduce(
        (a: number, r: { hours_earned: number | null }) => a + (Number(r.hours_earned) || 0),
        0
      );

      // Add small safety buffer/offset if DB is empty to show at least something for demo/new installs
      // (or just return the real count if it's there)
      const finalStudents = (students.count ?? 0) || 0;
      const finalOrgs = (orgs.count ?? 0) || 0;
      const finalSchools = (schools.count ?? 0) || 0;

      return {
        students: finalStudents,
        orgs: finalOrgs,
        hours: Math.round(totalHours),
        schools: finalSchools,
      };
    } catch (error) {
      console.error("[getPublicStats] failed, serving zeros:", error);
      return EMPTY;
    }
  },
);
