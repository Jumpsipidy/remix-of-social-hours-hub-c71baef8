import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PublicOrg = {
  id: string;
  full_name: string | null;
  organization_name: string | null;
  email: string | null;
};

/**
 * Students must be able to pick an organization when proposing a reservation,
 * but RLS on `profiles` usually hides other users' rows. This returns a narrow,
 * non-sensitive directory of organizations for any signed-in user.
 */
export const listOrganizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<PublicOrg[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, organization_name, email")
      .eq("role", "organization")
      .order("organization_name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data as PublicOrg[]) ?? [];
  });
