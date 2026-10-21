import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { passwordProblem } from "@/lib/password-policy";

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function nonce() { return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join(""); }

export async function requireSignupGrant(db: any, userId: string, grant: { ticketId: string; token: string }) {
  const role = await db.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (role.error || role.data !== true) throw new Error("Reikia sistemos administratoriaus teisių");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("auth_tickets").select("payload, nonce_hash")
    .eq("id", grant.ticketId).eq("user_id", userId).eq("action", "auth_settings").eq("status", "used").gt("expires_at", new Date().toISOString()).maybeSingle();
  const payload = data?.payload;
  if (error || !payload || typeof payload !== "object" || Array.isArray(payload) || payload.op !== "signup_options" || payload.require_license !== "1" || data?.nonce_hash !== await digest(grant.token)) throw new Error("Administracinė prieiga nebegalioja. Patvirtink ją dar kartą.");
  return supabaseAdmin;
}

export const createSignupAdminTicket = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ returnUrl: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (role.error || role.data !== true) throw new Error("Reikia sistemos administratoriaus teisių");
    const url = new URL(data.returnUrl);
    if (url.protocol !== "https:" || !/(^|\.)socialinesvalandos\.dev$/.test(url.hostname) || url.pathname !== "/register") throw new Error("Patikra veikia tik tikrame registracijos puslapyje.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: countError } = await supabaseAdmin.from("auth_tickets").select("id", { count: "exact", head: true }).eq("user_id", context.userId).gte("created_at", new Date(Date.now() - 600000).toISOString());
    if (countError || (count ?? 0) >= 5) throw new Error("Per daug bandymų. Palauk kelias minutes.");
    const secret = nonce();
    const { data: ticket, error } = await supabaseAdmin.from("auth_tickets").insert({ user_id: context.userId, action: "auth_settings", description: "Laikina administracinė registracijos prieiga", payload: { require_license: "1", op: "signup_options" }, status: "pending", expires_at: new Date(Date.now() + 600000).toISOString(), return_url: url.href, origin: "socialinesvalandos.dev", nonce_hash: await digest(secret) }).select("id").single();
    if (error || !ticket) throw new Error("Nepavyko pradėti licencijos patikros.");
    return { url: `https://auth.socialinesvalandos.dev/verify/${ticket.id}?cb=${encodeURIComponent(url.href)}&ref=${ticket.id.slice(0, 8).toUpperCase()}#k=${secret}` };
  });

export const consumeSignupAdminTicket = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ ticketId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (role.error || role.data !== true) throw new Error("Reikia sistemos administratoriaus teisių");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token = nonce();
    const { data: ticket, error } = await supabaseAdmin.from("auth_tickets").update({ status: "used", consumed_at: new Date().toISOString(), nonce_hash: await digest(token) }).eq("id", data.ticketId).eq("user_id", context.userId).eq("action", "auth_settings").eq("status", "confirmed").eq("payload->>op", "signup_options").eq("payload->>require_license", "1").gt("expires_at", new Date().toISOString()).select("id").maybeSingle();
    if (error || !ticket) throw new Error("Licencijos patvirtinimas negalioja arba jau panaudotas.");
    return { ticketId: ticket.id, token };
  });

export const getSignupAdminCodes = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ ticketId: z.string().uuid(), token: z.string().length(64) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireSignupGrant(context.supabase, context.userId, data);
    const { data: codes, error } = await db.from("school_class_codes").select("id, school_id, class_year, class_letter, signup_code").eq("is_active", true).order("class_year");
    if (error) throw new Error("Nepavyko įkelti klasių kodų.");
    return codes ?? [];
  });

export const createStudentAsSignupAdmin = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ ticketId: z.string().uuid(), token: z.string().length(64), codeId: z.string().uuid(), fullName: z.string().trim().min(3).max(120), email: z.string().email(), password: z.string().min(10).max(200), hoursNeeded: z.number().int().min(0).max(500).default(20), skipEmail: z.boolean(), role: z.enum(["student", "school_admin", "organization"]).default("student"), hoursOverride: z.number().int().min(0).max(500).nullable().default(null), hoursEarned: z.number().int().min(0).max(500).default(0) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireSignupGrant(context.supabase, context.userId, data);
    const problem = passwordProblem(data.password, data.email);
    if (problem) throw new Error(problem);
    const { data: code, error } = await db.from("school_class_codes").select("school_id, class_year, class_letter, hours_needed").eq("id", data.codeId).eq("is_active", true).maybeSingle();
    if (error || !code) throw new Error("Klasės kodas nebegalioja.");
    const school = await db.from("schools").select("is_active").eq("id", code.school_id).maybeSingle();
    if (school.error || !school.data?.is_active) throw new Error("Mokykla neaktyvi.");
    const { data: created, error: createError } = await db.auth.admin.createUser({ email: data.email, password: data.password, email_confirm: data.skipEmail, user_metadata: { full_name: data.fullName } });
    if (createError || !created.user) throw new Error("Nepavyko sukurti paskyros. Patikrink, ar el. paštas dar nenaudojamas.");
    const baseHours = (await import("@/lib/class-codes.server")).hoursFromCode(code.class_year, (code as any).hours_needed);
    const patch: Record<string, unknown> = data.role === "organization"
      ? { role: "organization", organization_name: data.fullName }
      : data.role === "school_admin"
        ? { role: "school_admin", school_id: code.school_id, associated_school_id: code.school_id, assigned_classes: [code.class_year], assigned_letter: code.class_letter }
        : { school_id: code.school_id, associated_school_id: code.school_id, class_year: code.class_year, class_letter: code.class_letter, hours_needed: data.hoursOverride ?? baseHours, hours_earned: data.hoursEarned };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saved = await db.from("profiles").update(patch as any).eq("id", created.user.id).select("id").single();
    if (saved.error) {
      await db.auth.admin.deleteUser(created.user.id);
      throw new Error("Klasės išsaugoti nepavyko. Paskyra nesukurta.");
    }
    if (!data.skipEmail) {
      // Admin-created accounts do not send confirmation automatically. Invite
      // existing unconfirmed user through the regular signup resend endpoint.
      try {
        const { data: link, error: linkError } = await db.auth.admin.generateLink({ type: "magiclink", email: data.email });
        if (linkError) return { ok: true, mailSent: false };
        const { sendVerificationEmail } = await import("@/lib/signup-email.server");
        await sendVerificationEmail(data.email, "https://socialinesvalandos.dev", link.properties, "magiclink", data.fullName);
        return { ok: true, mailSent: true };
      } catch { return { ok: true, mailSent: false }; }
    }
    await db.from("auth_security_events").insert({ ticket_id: data.ticketId, user_id: context.userId, event: "signup.admin_created", meta: { email_confirmation_skipped: true, student_id: created.user.id, role: data.role, hours_override: data.hoursOverride, hours_earned: data.hoursEarned } });
    return { ok: true, mailSent: false };
  });