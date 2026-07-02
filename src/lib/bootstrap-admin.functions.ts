import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countError } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) return { bootstrapped: false };

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (userError || !userData.user) throw new Error(userError?.message ?? "Vartotojas nerastas");

    const meta = userData.user.user_metadata ?? {};
    const fullName =
      typeof meta.full_name === "string"
        ? meta.full_name
        : typeof meta.name === "string"
          ? meta.name
          : userData.user.email?.split("@")[0] ?? "Sistemos administratorius";

    const { error: upsertError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: context.userId,
        email: userData.user.email ?? null,
        full_name: fullName,
        role: "admin",
        organization_name: null,
        hours_needed: 0,
        hours_earned: 0,
      },
      { onConflict: "id" },
    );

    if (upsertError) throw new Error(upsertError.message);
    return { bootstrapped: true };
  });