import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { classAssignment } from "@/lib/signup-rules";
import { passwordProblem } from "@/lib/password-policy";
import { userError } from "@/lib/user-error";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OAUTH_SETUP_SCHEMA = z.object({
  fullName: z.string().trim().min(3).max(120),
  schoolId: z.string().uuid(),
  classYear: z.string().default(""),
  classLetter: z.string().default(""),
  hoursNeeded: z.number().int().min(0).max(500).default(20),
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
  code: z.string().trim().min(2).max(64),
  redirectTo: z.string().url().max(300),
});

/**
 * Student self-registration. Class, letter and required hours come only from
 * the class code row; the confirmation email is sent through Resend.
 */
export const signUpStudentWithCode = createServerFn({ method: "POST" })
  .inputValidator((input) => STUDENT_SIGNUP_SCHEMA.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { hoursFromCode } = await import("@/lib/class-codes.server");
    const problem = passwordProblem(data.password, data.email);
    if (problem) return { ok: false as const, reason: "signup" as const, message: problem };
    const callback = new URL(data.redirectTo);
    const { getRequest } = await import("@tanstack/react-start/server");
    const origin = getRequest().headers.get("origin");
    if (!origin || callback.origin !== origin || callback.pathname !== "/verify-email") throw new Error("Netinkama patvirtinimo nuoroda.");
    const { data: codeRow, error } = await (supabaseAdmin.from("school_class_codes") as any).select("school_id, class_year, class_letter, is_active, hours_needed").eq("signup_code", data.code.toUpperCase()).eq("school_id", data.schoolId).maybeSingle();
    const assignment = classAssignment(codeRow, data.schoolId);
    const school = await supabaseAdmin.from("schools").select("is_active").eq("id", data.schoolId).maybeSingle();
    if (error || school.error) return { ok: false as const, reason: "error" as const };
    if (!assignment || !school.data?.is_active) return { ok: false as const, reason: "bad_code" as const };
    const hoursNeeded = hoursFromCode(assignment.classYear, codeRow?.hours_needed);

    const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email: data.email,
      password: data.password,
      options: {
        redirectTo: data.redirectTo,
        data: { role: "student", full_name: data.fullName, hours_needed: hoursNeeded, school_id: data.schoolId, class_year: assignment.classYear, class_letter: assignment.classLetter },
      },
    });
    if (linkError || !link.user) {
      const exists = /already|exists|registered/i.test(linkError?.message ?? "");
      return { ok: false as const, reason: "signup" as const, message: exists ? "Šis el. paštas jau užregistruotas. Prisijunk arba patvirtink el. paštą." : userError(linkError, "Nepavyko sukurti paskyros. Bandyk dar kartą.") };
    }
    const saved = await supabaseAdmin
      .from("profiles")
      .update({ school_id: assignment.schoolId, associated_school_id: assignment.schoolId, class_year: assignment.classYear, class_letter: assignment.classLetter, hours_needed: hoursNeeded } as never)
      .eq("id", link.user.id)
      .eq("role", "student").select("school_id, class_year, class_letter").single();
    if (saved.error || saved.data?.school_id !== assignment.schoolId || saved.data?.class_year !== assignment.classYear || saved.data?.class_letter !== assignment.classLetter) {
      await supabaseAdmin.auth.admin.deleteUser(link.user.id);
      return { ok: false as const, reason: "signup" as const, message: "Klasės išsaugoti nepavyko. Paskyra nesukurta — bandyk dar kartą." };
    }
    try {
      const { sendVerificationEmail } = await import("@/lib/signup-email.server");
      await sendVerificationEmail(data.email, callback.origin, link.properties, "signup", data.fullName);
    } catch (mailError) {
      console.error("[signup] verification email failed", mailError);
      return { ok: true as const, session: null, mailSent: false };
    }
    return { ok: true as const, session: null, mailSent: true };
  });

/** Re-sends the confirmation email for an unconfirmed account (max 3 per 15 min). */
export const resendSignupVerification = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ email: z.string().trim().email().max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const origin = getRequest().headers.get("origin");
    if (!origin || !/^https?:\/\/(localhost(:\d+)?|([a-z0-9-]+\.)*socialinesvalandos\.dev|[a-z0-9-]+\.lovable\.app)$/i.test(origin)) throw new Error("Netinkamas puslapis.");
    const email = data.email.toLowerCase();
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
    const emailHash = Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin.from("auth_security_events").select("id", { count: "exact", head: true }).eq("event", "signup.resend").eq("meta->>email_hash", emailHash).gte("created_at", since);
    if ((count ?? 0) >= 3) throw new Error("Per daug bandymų. Palauk 15 minučių.");
    await supabaseAdmin.from("auth_security_events").insert({ event: "signup.resend", meta: { email_hash: emailHash } });
    // Same answer whether or not the account exists, so emails can't be probed.
    const { data: profile } = await supabaseAdmin.from("profiles").select("id, full_name").ilike("email", email).maybeSingle();
    if (!profile) return { ok: true };
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    if (!user.user || user.user.email_confirmed_at) return { ok: true };
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
    if (error) throw new Error("Nepavyko paruošti laiško.");
    const { sendVerificationEmail } = await import("@/lib/signup-email.server");
    await sendVerificationEmail(email, origin, link.properties, "magiclink", profile.full_name ?? undefined);
    return { ok: true };
  });
