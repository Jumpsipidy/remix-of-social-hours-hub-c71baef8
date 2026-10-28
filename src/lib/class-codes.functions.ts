import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CLASS_YEARS } from "@/lib/class-years";

export const listClassCodes = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const check = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (check.error || check.data !== true) throw new Error("Reikia sistemos administratoriaus teisių");
  const { data, error } = await context.supabase.from("school_class_codes").select("id, school_id, class_year, class_letter, signup_code, is_active, hours_needed").order("class_year");
  if (error) throw new Error("Nepavyko įkelti klasių kodų.");
  return data ?? [];
});
export const saveClassCode = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid().optional(), school_id: z.string().uuid(), class_year: z.enum(CLASS_YEARS), class_letter: z.enum(["A", "B"]), signup_code: z.string().trim().min(8).max(64), is_active: z.boolean(), hours_needed: z.number().int().min(8).max(500).nullable().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const check = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (check.error || check.data !== true) throw new Error("Reikia sistemos administratoriaus teisių");
    const { error } = await context.supabase.from("school_class_codes").upsert({ ...data, hours_needed: ["5", "6", "7"].includes(data.class_year) ? 20 : (data.hours_needed ?? null), signup_code: data.signup_code.toUpperCase() } as never);
    if (error) throw new Error(error.code === "23505" ? "Šis kodas jau naudojamas arba klasė jau turi aktyvų kodą." : "Nepavyko išsaugoti klasės kodo.");
    return { ok: true };
  });
/** Super Admin: create one active code for each selected class (existing codes are kept). */
export const bulkCreateClassCodes = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ school_id: z.string().uuid(), classes: z.array(z.object({ class_year: z.enum(CLASS_YEARS), class_letter: z.enum(["A", "B"]) })).min(1).max(16), hours_needed: z.number().int().min(8).max(500) }).parse(input))
  .handler(async ({ data, context }) => {
    const check = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (check.error || check.data !== true) throw new Error("Reikia sistemos administratoriaus teisių");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ensureClassCodes } = await import("@/lib/class-codes.server");
    const out: { class_year: string; class_letter: string; signup_code: string }[] = [];
    for (const c of data.classes) {
      const before = await (supabaseAdmin.from("school_class_codes") as any).select("id").eq("school_id", data.school_id).eq("class_year", c.class_year).eq("class_letter", c.class_letter).eq("is_active", true).maybeSingle();
      const codes = await ensureClassCodes(supabaseAdmin, data.school_id, [c.class_year], c.class_letter);
      if (!before.data && !["5", "6", "7"].includes(c.class_year)) await (supabaseAdmin.from("school_class_codes") as any).update({ hours_needed: data.hours_needed }).eq("school_id", data.school_id).eq("class_year", c.class_year).eq("class_letter", c.class_letter).eq("is_active", true);
      out.push(...codes);
    }
    return out;
  });
