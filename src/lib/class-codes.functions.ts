import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CLASS_YEARS } from "@/lib/class-years";

export const listClassCodes = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const check = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (check.error || check.data !== true) throw new Error("Reikia sistemos administratoriaus teisių");
  const { data, error } = await context.supabase.from("school_class_codes").select("id, school_id, class_year, class_letter, signup_code, is_active").order("class_year");
  if (error) throw new Error("Nepavyko įkelti klasių kodų.");
  return data ?? [];
});
export const saveClassCode = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid().optional(), school_id: z.string().uuid(), class_year: z.enum(CLASS_YEARS), class_letter: z.enum(["A", "B"]), signup_code: z.string().trim().min(8).max(64), is_active: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const check = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (check.error || check.data !== true) throw new Error("Reikia sistemos administratoriaus teisių");
    const { error } = await context.supabase.from("school_class_codes").upsert({ ...data, signup_code: data.signup_code.toUpperCase() });
    if (error) throw new Error(error.code === "23505" ? "Šis kodas jau naudojamas." : "Nepavyko išsaugoti klasės kodo.");
    return { ok: true };
  });