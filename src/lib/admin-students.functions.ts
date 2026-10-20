import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CLASS_YEARS } from "@/lib/class-years";

const ROLES = ["student", "school_admin", "organization", "admin"] as const;

async function assertAdmin(context: { supabase: any; userId: string }) {
  const check = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (check.error || check.data !== true) throw new Error("Reikia sistemos administratoriaus teisių");
}

// Super Admin gali pakeisti mokinio rolę, klasę, mokyklą ir privalomas valandas.
// Rašoma per service role, nes tg_profiles_guard_privileged blokuoja tiesioginius
// kliento pakeitimus privileguotiems laukams — tai yra sąmoninga apsauga.
export const adminUpdateStudent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    id: z.string().uuid(),
    role: z.enum(ROLES).optional(),
    class_year: z.enum(CLASS_YEARS).nullable().optional(),
    class_letter: z.enum(["A", "B"]).nullable().optional(),
    hours_needed: z.number().int().min(0).max(500).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id === context.userId && data.role && data.role !== "admin") throw new Error("Negalima pakeisti savo administratoriaus rolės.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {};
    if (data.role) patch.role = data.role;
    if (data.class_year !== undefined) patch.class_year = data.class_year;
    if (data.class_letter !== undefined) patch.class_letter = data.class_letter;
    if (data.hours_needed !== undefined) patch.hours_needed = data.hours_needed;
    if (Object.keys(patch).length === 0) throw new Error("Nėra ką keisti.");
    const { error } = await supabaseAdmin.from("profiles").update(patch as never).eq("id", data.id);
    if (error) throw new Error("Nepavyko išsaugoti pakeitimų.");
    return { ok: true };
  });

// Vieno mygtuko klasių perkėlimas į kitus mokslo metus (DB funkcija promote_class_years).
export const adminPromoteClasses = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("promote_class_years" as never);
    if (error) throw new Error("Nepavyko perkelti klasių.");
    return data as { promoted_count?: number; graduated_count?: number; school_year?: string } | null;
  });
