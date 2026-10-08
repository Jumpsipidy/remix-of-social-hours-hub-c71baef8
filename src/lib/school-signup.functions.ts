import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OAUTH_SETUP_SCHEMA = z.object({
  fullName: z.string().trim().min(3).max(120),
  schoolId: z.string().uuid(),
  classYear: z.enum(["5", "6", "7", "8", "9 / I gimn.", "10 / II gimn.", "11 / III gimn.", "12 / IV gimn."]),
  classLetter: z.enum(["A", "B"]),
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

    void context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: valid, error } = await supabaseAdmin.rpc("verify_school_signup_code", {
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
    // Privileged fields are locked for client writes (tg_profiles_guard_privileged);
    // the code was verified above, so write them with the service role.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("school_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (existing?.school_id && existing.school_id !== data.schoolId) {
      throw new Error("Mokykla jau priskirta. Kreipkis į administratorių.");
    }
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.fullName,
        school_id: data.schoolId,
        associated_school_id: data.schoolId,
        class_year: data.classYear,
        class_letter: data.classLetter,
        hours_needed: hoursNeeded,
      } as never)
      .eq("id", context.userId)
      .eq("role", "student");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const STUDENT_SIGNUP_SCHEMA = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(6).max(200),
  fullName: z.string().trim().min(3).max(120),
  schoolId: z.string().uuid(),
  classYear: z.enum(["5", "6", "7", "8", "9 / I gimn.", "10 / II gimn.", "11 / III gimn.", "12 / IV gimn."]),
  classLetter: z.enum(["A", "B"]),
  hoursNeeded: z.number().int().min(0).max(500),
  code: z.string().trim().min(2).max(64),
  redirectTo: z.string().url().max(300),
});

/**
 * Student self-registration. The school code is checked server-side as part
 * of account creation — there is no standalone public "is this code valid"
 * endpoint anymore.
 */
export const signUpStudentWithCode = createServerFn({ method: "POST" })
  .inputValidator((input) => STUDENT_SIGNUP_SCHEMA.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: valid, error } = await supabaseAdmin.rpc("verify_school_signup_code", {
      _school_id: data.schoolId,
      _code: data.code.toUpperCase(),
    });
    if (error) return { ok: false as const, reason: "error" as const };
    if (!valid) return { ok: false as const, reason: "bad_code" as const };

    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return { ok: false as const, reason: "error" as const };
    const pub = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const hoursNeeded = ["5", "6", "7"].includes(data.classYear) ? 20 : Math.max(8, data.hoursNeeded);
    const { data: signUp, error: suErr } = await pub.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: data.redirectTo,
        data: {
          role: "student",
          full_name: data.fullName,
          hours_needed: hoursNeeded,
          school_id: data.schoolId,
          class_year: data.classYear,
          class_letter: data.classLetter,
        },
      },
    });
    if (suErr) return { ok: false as const, reason: "signup" as const, message: suErr.message };
    if (signUp.user) {
      await supabaseAdmin
        .from("profiles")
        .update({ school_id: data.schoolId, class_year: data.classYear, class_letter: data.classLetter } as never)
        .eq("id", signUp.user.id)
        .eq("role", "student");
    }
    return {
      ok: true as const,
      session: signUp.session
        ? { access_token: signUp.session.access_token, refresh_token: signUp.session.refresh_token }
        : null,
    };
  });
