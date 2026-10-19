import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { classAssignment, signupHours } from "@/lib/signup-rules";
import { passwordProblem } from "@/lib/password-policy";
import { userError } from "@/lib/user-error";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OAUTH_SETUP_SCHEMA = z.object({
  fullName: z.string().trim().min(3).max(120),
  schoolId: z.string().uuid(),
  classYear: z.string().default(""),
  classLetter: z.string().default(""),
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
    // complete_student_setup (SECURITY DEFINER) verifies the code, refuses to
    // move a student to another school and writes the locked fields in one step.
    const { error } = await (context.supabase.rpc as any)("complete_student_setup", {
      _school_id: data.schoolId,
      _code: data.code.trim().toUpperCase(),
      _full_name: data.fullName,
      _class_year: data.classYear,
      _class_letter: data.classLetter,
      _hours_needed: data.hoursNeeded,
    });
    if (error) throw new Error(userError(error, "Nepavyko patvirtinti klasės kodo."));
    return { ok: true };
  });

const STUDENT_SIGNUP_SCHEMA = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(10).max(200),
  fullName: z.string().trim().min(3).max(120),
  schoolId: z.string().uuid(),
  classYear: z.string().default(""),
  classLetter: z.string().default(""),
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
    const problem = passwordProblem(data.password, data.email);
    if (problem) return { ok: false as const, reason: "signup" as const, message: problem };
    const callback = new URL(data.redirectTo);
    const { getRequest } = await import("@tanstack/react-start/server");
    const origin = getRequest().headers.get("origin");
    if (!origin || callback.origin !== origin || callback.pathname !== "/verify-email") throw new Error("Netinkama patvirtinimo nuoroda.");
    const { data: codeRow, error } = await supabaseAdmin.from("school_class_codes").select("school_id, class_year, class_letter, is_active").eq("signup_code", data.code.toUpperCase()).eq("school_id", data.schoolId).maybeSingle();
    const assignment = classAssignment(codeRow, data.schoolId);
    const school = await supabaseAdmin.from("schools").select("is_active").eq("id", data.schoolId).maybeSingle();
    if (error || school.error) return { ok: false as const, reason: "error" as const };
    if (!assignment || !school.data?.is_active) return { ok: false as const, reason: "bad_code" as const };

    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return { ok: false as const, reason: "error" as const };
    const pub = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const hoursNeeded = signupHours(assignment.classYear, data.hoursNeeded);
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
          class_year: assignment.classYear,
          class_letter: assignment.classLetter,
        },
      },
    });
    if (suErr) return { ok: false as const, reason: "signup" as const, message: userError(suErr, "Nepavyko sukurti paskyros. Bandyk dar kartą.") };
    if (signUp.user && signUp.user.identities?.length) {
      const saved = await supabaseAdmin
        .from("profiles")
        .update({ school_id: assignment.schoolId, associated_school_id: assignment.schoolId, class_year: assignment.classYear, class_letter: assignment.classLetter, hours_needed: hoursNeeded } as never)
        .eq("id", signUp.user.id)
        .eq("role", "student").select("school_id, class_year, class_letter").single();
      if (saved.error || saved.data?.school_id !== assignment.schoolId || saved.data?.class_year !== assignment.classYear || saved.data?.class_letter !== assignment.classLetter) return { ok: false as const, reason: "signup" as const, message: "Registracija pradėta, bet klasės išsaugoti nepavyko. Kreipkis į administratorių prieš tęsiant." };
    }
    return {
      ok: true as const,
      session: signUp.session
        ? { access_token: signUp.session.access_token, refresh_token: signUp.session.refresh_token }
        : null,
    };
  });
