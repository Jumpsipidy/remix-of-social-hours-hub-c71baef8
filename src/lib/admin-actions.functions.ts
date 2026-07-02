import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Role = "organization" | "school_admin";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Reikia sistemos administratoriaus teisių");
}

export const adminCreateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    email: string;
    password: string;
    full_name: string;
    role: Role;
    organization_name?: string | null;
  }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    if (!data.email || !data.password || data.password.length < 6) {
      throw new Error("El. paštas ir bent 6 simbolių slaptažodis būtini");
    }
    if (!["organization", "school_admin"].includes(data.role)) {
      throw new Error("Netinkama rolė");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const normalizedEmail = data.email.trim().toLowerCase();

    // Supabase Admin API has no direct "get user by email" call, so we scan the
    // small admin-managed user list and update an existing invite if the email
    // was already created. This prevents "already registered" from breaking
    // real onboarding when you recreate credentials for an organization.
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
        hours_needed: 0,
      },
    };

    const { data: created, error } = existing
      ? await supabaseAdmin.auth.admin.updateUserById(existing.id, payload)
      : await supabaseAdmin.auth.admin.createUser(payload);

    if (error || !created.user) throw new Error(error?.message ?? "Nepavyko sukurti paskyros");

    // Ensure profile row matches (trigger should handle, but upsert to be safe)
    await supabaseAdmin.from("profiles").upsert(
      {
        id: created.user.id,
        email: normalizedEmail,
        full_name: data.full_name,
        role: data.role,
        organization_name: data.role === "organization" ? (data.organization_name ?? data.full_name) : null,
        hours_needed: 0,
        hours_earned: 0,
      },
      { onConflict: "id" },
    );

    return { ok: true, id: created.user.id, updated: !!existing };
  });
