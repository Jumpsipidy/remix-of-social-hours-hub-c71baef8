import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const adminListAllAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin.from("profiles").select("role").eq("id", context.userId).maybeSingle();
    if ((me as any)?.role !== "admin") throw new Error("Reikia administratoriaus teisių");
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, role, organization_name, org_category, school_id, created_at")
      .order("created_at", { ascending: false });
    return { profiles: data ?? [] };
  });

export const adminDeleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin.from("profiles").select("role").eq("id", context.userId).maybeSingle();
    if ((me as any)?.role !== "admin") throw new Error("Reikia administratoriaus teisių");
    if (data.userId === context.userId) throw new Error("Negali ištrinti savo paskyros");

    const id = data.userId;
    // Wipe references
    await supabaseAdmin.from("messages").delete().eq("sender_id", id);
    await supabaseAdmin.from("chat_rooms").delete().or(`student_id.eq.${id},organization_id.eq.${id},school_admin_id.eq.${id}`);
    await supabaseAdmin.from("reservations").delete().or(`student_id.eq.${id},organization_id.eq.${id}`);
    await supabaseAdmin.from("tasks").delete().eq("organization_id", id);
    await supabaseAdmin.from("profiles").delete().eq("id", id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
