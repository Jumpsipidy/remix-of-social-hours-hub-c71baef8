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
  .validator((input: {
    email: string;
    password: string;
    full_name: string;
    role: Role;
    organization_name?: string | null;
    org_category?: OrgCategory | null;
    school_id?: string | null;
    assigned_classes?: string[] | null;
    auto_year_renewal?: boolean;
    assigned_letter?: string | null;
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
    if (data.role === "school_admin" && !data.school_id) throw new Error("Pasirink mokyklą mokyklos administratoriui");

    const normalizedEmail = data.email.trim().toLowerCase();
    const { data: usersPage, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw new Error(listError.message);
    const existing = usersPage.users.find((u) => u.email?.toLowerCase() === normalizedEmail);
    // School admins may only create brand-new accounts. Overwriting an existing
    // user (password, role, profile) is restricted to super admins.
    if (existing && !isAdmin) {
      throw new Error("Paskyra su šiuo el. paštu jau egzistuoja");
    }

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

    const { error: profileError } = await (supabaseAdmin.from("profiles") as any).upsert(
      {
        id: created.user.id,
        email: normalizedEmail,
        full_name: data.full_name,
        role: data.role,
        organization_name: data.role === "organization" ? (data.organization_name ?? data.full_name) : null,
        school_id: data.school_id ?? (me as any)?.school_id ?? null,
        // Scope school_admin access to a single school — required for the
        // "School admin can view … in their school" RLS policies to work.
        associated_school_id: data.role === "school_admin" ? (data.school_id ?? (me as any)?.school_id ?? null) : null,
        assigned_classes: data.role === "school_admin" ? (data.assigned_classes ?? []) : [],
        auto_year_renewal: data.auto_year_renewal ?? true,
        assigned_letter: data.role === "school_admin" && (data.assigned_letter === "A" || data.assigned_letter === "B") ? data.assigned_letter : null,
        hours_needed: 0,
        hours_earned: 0,
      },
      { onConflict: "id" },
    );
    if (profileError) throw new Error(`Paskyra sukurta, bet profilio nepavyko nustatyti: ${profileError.message}`);




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

async function assertSuperAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Tik Super Admin");
}

/** Super Admin: list all school-admin accounts with their school + classes. */
export const adminListSchoolAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: admins, error }, { data: schools }] = await Promise.all([
      (supabaseAdmin.from("profiles") as any)
        .select("id, full_name, email, associated_school_id, school_id, assigned_classes, assigned_letter, auto_year_renewal, created_at")
        .eq("role", "school_admin")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("schools").select("id, name, city").order("name"),
    ]);
    if (error) throw new Error(error.message);
    return { admins: (admins ?? []) as any[], schools: schools ?? [] };
  });

/** Super Admin: change school, classes and auto renewal of a school admin. */
export const adminUpdateSchoolAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string; school_id: string; assigned_classes: string[]; auto_year_renewal: boolean; full_name?: string; assigned_letter?: string | null }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input.id) || !/^[0-9a-f-]{36}$/i.test(input.school_id)) throw new Error("Netinkami duomenys");
    return { ...input, assigned_classes: (input.assigned_classes ?? []).map((c) => String(c).trim()).filter(Boolean).slice(0, 40) };
  })
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin.from("profiles").select("role").eq("id", data.id).maybeSingle();
    if ((target as any)?.role !== "school_admin") throw new Error("Tai ne mokyklos administratorius");
    const patch: Record<string, unknown> = {
      school_id: data.school_id,
      associated_school_id: data.school_id,
      assigned_classes: data.assigned_classes,
      auto_year_renewal: data.auto_year_renewal,
      assigned_letter: data.assigned_letter === "A" || data.assigned_letter === "B" ? data.assigned_letter : null,
    };
    if (data.full_name?.trim()) patch.full_name = data.full_name.trim().slice(0, 120);
    const { error } = await (supabaseAdmin.from("profiles") as any).update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
