import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OAUTH_SETUP_SCHEMA = z.object({
  fullName: z.string().trim().min(3).max(120),
  schoolId: z.string().uuid(),
  classYear: z.enum(["5", "6", "7", "8", "9 / I gimn.", "10 / II gimn.", "11 / III gimn.", "12 / IV gimn."]),
  hoursNeeded: z.number().int().min(8).max(500),
  code: z.string().trim().min(2).max(64),
});

export const verifySchoolSignupCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z
      .object({
        schoolId: z.string().uuid(),
        code: z.string().min(2).max(64),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const normalizedCode = data.code.trim().toUpperCase();
    if (!normalizedCode) return { ok: false };

    const { data: valid, error } = await context.supabase.rpc("verify_school_signup_code", {
      _school_id: data.schoolId,
      _code: normalizedCode,
    });

    if (error) throw new Error("Nepavyko patikrinti kodo");
    return { ok: !!valid };
  });

export const completeOAuthStudentSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => OAUTH_SETUP_SCHEMA.parse(input))
  .handler(async ({ data, context }) => {
    const normalizedCode = data.code.toUpperCase();
    const { data: valid, error: codeError } = await context.supabase.rpc("verify_school_signup_code", {
      _school_id: data.schoolId,
      _code: normalizedCode,
    });
    if (codeError) throw new Error(codeError.message);
    if (!valid) throw new Error("Neteisingas mokyklos kodas.");

    const hoursNeeded = ["5", "6", "7"].includes(data.classYear) ? 20 : data.hoursNeeded;
    const { error } = await context.supabase
      .from("profiles")
      .update({
        full_name: data.fullName,
        school_id: data.schoolId,
        associated_school_id: data.schoolId,
        class_year: data.classYear,
        hours_needed: hoursNeeded,
      })
      .eq("id", context.userId)
      .eq("role", "student");
    if (error) throw new Error(error.message);
    return { ok: true };
  });