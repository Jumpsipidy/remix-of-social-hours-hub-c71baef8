import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Role = "organization" | "school_admin";
type OrgCategory = "organizacija" | "bendruomene";

const MAX_ORG_ACCOUNTS_PER_SCHOOL_ADMIN = 10;

/**
 * Create a new organization / bendruomenė / school-admin account.
 * - Callable by super-admin (full permissions).
 * - Callable by school_admin BUT only for role="organization" and capped at
 *   MAX_ORG_ACCOUNTS_PER_SCHOOL_ADMIN accounts they've personally created.
 */
export const adminCreateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    email: string;
    password: string;
    full_name: string;
    role: Role;
    organization_name?: string | null;
    org_category?: OrgCategory | null;
    school_id?: string | null;
  }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check caller role
    const { data: me } = await supabaseAdmin.from("profiles").select("role, school_id").eq("id", context.userId).maybeSingle();
    const isAdmin = (me as any)?.role === "admin";
    const isSchoolAdmin = (me as any)?.role === "school_admin";
    if (!isAdmin && !isSchoolAdmin) throw new Error("Reikia administratoriaus arba mokyklos administratoriaus teisių");
    if (isSchoolAdmin) {
      if (data.role !== "organization") throw new Error("Mokyklos administratorius gali kurti tik organizacijų / bendruomenių paskyras");
      // Cap check via user_metadata.created_by_school_admin
      const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const created = usersPage.users.filter((u) => (u.user_metadata as any)?.created_by_school_admin === context.userId).length;
      if (created >= MAX_ORG_ACCOUNTS_PER_SCHOOL_ADMIN) {
        throw new Error(`Pasiektas limitas: iki ${MAX_ORG_ACCOUNTS_PER_SCHOOL_ADMIN} organizacijų paskyrų vienam mokyklos administratoriui`);
      }
    }

    if (!data.email || !data.password || data.password.length < 6) {
      throw new Error("El. paštas ir bent 6 simbolių slaptažodis būtini");
    }
    if (!["organization", "school_admin"].includes(data.role)) throw new Error("Netinkama rolė");

    const normalizedEmail = data.email.trim().toLowerCase();
    const { data: usersPage, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw new Error(listError.message);
    const existing = usersPage.users.find((u) => u.email?.toLowerCase() === normalizedEmail);

    const payload = {
      email: normalizedEmail,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        role: data.role,
        full_name: data.full_name,
        organization_name: data.role === "organization" ? (data.organization_name ?? data.full_name) : null,
        org_category: data.role === "organization" ? (data.org_category ?? "organizacija") : null,
        hours_needed: 0,
        created_by_school_admin: isSchoolAdmin ? context.userId : null,
      },
    };

    const { data: created, error } = existing
      ? await supabaseAdmin.auth.admin.updateUserById(existing.id, payload)
      : await supabaseAdmin.auth.admin.createUser(payload);

    if (error || !created.user) throw new Error(error?.message ?? "Nepavyko sukurti paskyros");

    await supabaseAdmin.from("profiles").upsert(
      {
        id: created.user.id,
        email: normalizedEmail,
        full_name: data.full_name,
        role: data.role,
        organization_name: data.role === "organization" ? (data.organization_name ?? data.full_name) : null,
        org_category: data.role === "organization" ? (data.org_category ?? "organizacija") : null,
        school_id: data.school_id ?? (me as any)?.school_id ?? null,
        hours_needed: 0,
        hours_earned: 0,
      },
      { onConflict: "id" },
    );

    return { ok: true, id: created.user.id, updated: !!existing };
  });

/** How many org accounts this school_admin has personally created (for cap UI). */
export const schoolAdminCreatedCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin.from("profiles").select("role").eq("id", context.userId).maybeSingle();
    if ((me as any)?.role !== "school_admin") return { count: 0, cap: MAX_ORG_ACCOUNTS_PER_SCHOOL_ADMIN };
    const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const count = usersPage.users.filter((u) => (u.user_metadata as any)?.created_by_school_admin === context.userId).length;
    return { count, cap: MAX_ORG_ACCOUNTS_PER_SCHOOL_ADMIN };
  });
