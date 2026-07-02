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
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        role: data.role,
        full_name: data.full_name,
        organization_name: data.role === "organization" ? (data.organization_name ?? data.full_name) : null,
        hours_needed: 0,
      },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Nepavyko sukurti paskyros");

    // Ensure profile row matches (trigger should handle, but upsert to be safe)
    await supabaseAdmin.from("profiles").upsert(
      {
        id: created.user.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        organization_name: data.role === "organization" ? (data.organization_name ?? data.full_name) : null,
        hours_needed: 0,
        hours_earned: 0,
      },
      { onConflict: "id" },
    );

    return { ok: true, id: created.user.id };
  });
