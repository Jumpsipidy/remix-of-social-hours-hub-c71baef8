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
 *
 * Never throws — a failing directory should render an empty dropdown, not a
 * 500 from createServerFn that takes down the whole dialog.
 */
export const listOrganizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<PublicOrg[]> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, organization_name, public_email")
        .eq("role", "organization")
        .order("organization_name", { ascending: true });
      if (error) {
        console.error("[listOrganizations] query failed:", error.message);
        return [];
      }
      return (data as PublicOrg[]) ?? [];
    } catch (error) {
      console.error("[listOrganizations] failed:", error);
      return [];
    }
  });

/** Public organization profile (safe columns only) + its open tasks. */
export const getOrgPublicProfile = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => {
    const id = String((d as { id?: unknown })?.id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("bad id");
    return { id };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("id, organization_name, full_name, logo_url, cover_url, gallery_urls, bio, public_email, phone, website_url, facebook_url, instagram_url, address, city, latitude, longitude, activity_tags, profile_verified")
      .eq("id", data.id)
      .eq("role", "organization")
      .maybeSingle();
    if (!p) return { profile: null, tasks: [] };
    const { data: t } = await supabaseAdmin
      .from("tasks")
      .select("id, title, task_date, available_hours, location, is_open")
      .eq("organization_id", data.id)
      .eq("is_open", true)
      .gte("task_date", new Date().toISOString().slice(0, 10))
      .order("task_date", { ascending: true })
      .limit(6);
    return { profile: p, tasks: t ?? [] };
  });
