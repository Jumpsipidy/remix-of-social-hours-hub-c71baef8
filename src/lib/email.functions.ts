import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { renderHoursConfirmedEmail } from "./email-templates/hours-confirmed";
import { renderReservationApprovedEmail, reservationApprovedText } from "./email-templates/reservation-approved";
import { renderReservationDeclinedEmail, reservationDeclinedText } from "./email-templates/reservation-declined";
import { renderWelcomeEmail, welcomeText } from "./email-templates/welcome";
import { renderOrgInviteEmail } from "./email-templates/org-invite";
import { APP_URL, SUPPORT_EMAIL } from "./email-templates/_shell";

const FROM_FALLBACK = "Socialinės Valandos <noreply@jumpsipidy.online>";
const REPLY_TO = SUPPORT_EMAIL;

type SendPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
  tag?: string;
};

// Anti-spam best-practice: plaintext fallback, Reply-To, List-Unsubscribe, tag for tracking.
export async function sendResendEmail(to: string, subject: string, html: string, opts: { text?: string; tag?: string; urgent?: boolean } = {}) {
  return sendResend({ to, subject, html, text: opts.text || "", tag: opts.tag });
}

async function sendResend(payload: SendPayload) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY missing. If you are in local dev, set it. If on Lovable preview, check secrets.");
    return { skipped: true as const, reason: "missing_api_key" };
  }
  const body: Record<string, unknown> = {
    from: process.env.RESEND_FROM?.trim() || FROM_FALLBACK,
    to: payload.to,
    reply_to: REPLY_TO,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    headers: {
      "List-Unsubscribe": `<mailto:${SUPPORT_EMAIL}?subject=unsubscribe>, <${APP_URL}/unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      "X-Entity-Ref-ID": crypto.randomUUID(),
    },
  };
  if (payload.tag) body.tags = [{ name: "category", value: payload.tag }];

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      "Authorization": `Bearer ${key.trim()}` 
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[email] Resend API failure: ${res.status} ${text}`);
    throw new Error(`Resend ${res.status}: ${text}`);
  }
  let id: string | null = null;
  try {
    const json = (await res.json()) as { id?: string };
    id = json?.id ?? null;
  } catch {
    id = null;
  }
  return { ok: true as const, id, to: payload.to, from: (process.env.RESEND_FROM?.trim() || FROM_FALLBACK), sentAt: new Date().toISOString() };
}

// -------------------- 1. Hours confirmed --------------------

export const sendHoursConfirmedEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v) => z.object({ reservationId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: r, error } = await context.supabase
      .from("reservations")
      .select("id, student_id, organization_id, reservation_date, start_time, end_time, hours_to_earn, address")
      .eq("id", data.reservationId)
      .single();
    if (error || !r) throw new Error(error?.message ?? "Rezervacija nerasta");
    if (r.organization_id !== context.userId) {
      const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
      if (!isAdmin) throw new Error("Neturi teisės siųsti šio pranešimo");
    }
    const [{ data: student }, { data: org }] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", r.student_id).single(),
      context.supabase.from("profiles").select("organization_name, full_name").eq("id", r.organization_id).single(),
    ]);
    if (!student?.email) return { skipped: true as const, reason: "no_email" };
    const orgName = org?.organization_name || org?.full_name || "Organizacija";
    const hours = Number(r.hours_to_earn) || 0;
    const totalHours = Number(student.hours_earned) || 0;
    const neededHours = Number(student.hours_needed) || 0;
    const html = renderHoursConfirmedEmail({
      studentName: student.full_name || "Savanoriau",
      orgName, hours, date: r.reservation_date,
      totalHours, neededHours,
      location: r.address || undefined,
      avatarUrl: student.logo_url || null,
      initial: (student.full_name || "S").charAt(0).toUpperCase(),
    });
    const text = `Sveikas!\n\n${orgName} patvirtino tavo darbą (${hours} val., ${r.reservation_date}).\nDabar tavo suma: ${totalHours}/${neededHours} val.\n\n${APP_URL}/student`;
    return sendResend({ to: student.email, subject: `✓ ${hours} val. patvirtinta — ${orgName}`, html, text, tag: "hours-confirmed" });
  });

// -------------------- 2. Reservation approved (pending → approved) --------------------

export const sendReservationApprovedEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v) => z.object({ reservationId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: r } = await context.supabase
      .from("reservations")
      .select("id, student_id, organization_id, reservation_date, start_time, end_time, hours_to_earn, address")
      .eq("id", data.reservationId).single();
    if (!r) return { skipped: true as const, reason: "not_found" };
    if (r.organization_id !== context.userId) {
      const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
      if (!isAdmin) return { skipped: true as const, reason: "forbidden" };
    }
    const [{ data: student }, { data: org }] = await Promise.all([
      context.supabase.from("profiles").select("full_name, email").eq("id", r.student_id).single(),
      context.supabase.from("profiles").select("organization_name, full_name").eq("id", r.organization_id).single(),
    ]);
    if (!student?.email) return { skipped: true as const, reason: "no_email" };
    const orgName = org?.organization_name || org?.full_name || "Organizacija";
    const props = {
      studentName: student.full_name || "Savanoriau",
      orgName, date: r.reservation_date,
      startTime: r.start_time, endTime: r.end_time,
      hours: Number(r.hours_to_earn) || 0,
      location: r.address || undefined,
    };
    return sendResend({
      to: student.email,
      subject: `🚀 Patvirtinta — ${orgName}`,
      html: renderReservationApprovedEmail(props),
      text: reservationApprovedText(props),
      tag: "reservation-approved",
    });
  });

// -------------------- 3. Reservation declined --------------------

export const sendReservationDeclinedEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v) => z.object({ reservationId: z.string().uuid(), reason: z.string().max(500).optional() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: r } = await context.supabase
      .from("reservations")
      .select("id, student_id, organization_id, reservation_date")
      .eq("id", data.reservationId).single();
    if (!r) return { skipped: true as const, reason: "not_found" };
    if (r.organization_id !== context.userId) {
      const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
      if (!isAdmin) return { skipped: true as const, reason: "forbidden" };
    }
    const [{ data: student }, { data: org }] = await Promise.all([
      context.supabase.from("profiles").select("full_name, email").eq("id", r.student_id).single(),
      context.supabase.from("profiles").select("organization_name, full_name").eq("id", r.organization_id).single(),
    ]);
    if (!student?.email) return { skipped: true as const, reason: "no_email" };
    const orgName = org?.organization_name || org?.full_name || "Organizacija";
    const props = {
      studentName: student.full_name || "Savanoriau",
      orgName, date: r.reservation_date, reason: data.reason,
    };
    return sendResend({
      to: student.email,
      subject: `Rezervacija atmesta — ${orgName}`,
      html: renderReservationDeclinedEmail(props),
      text: reservationDeclinedText(props),
      tag: "reservation-declined",
    });
  });

// -------------------- 4. Welcome (self-triggered post-signup) --------------------

export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId).single();
    if (!me?.email) return { skipped: true as const, reason: "no_email" };
    const role = (me.role as "student" | "organization" | "school_admin" | "admin") || "student";
    const props = {
      fullName: me.full_name || "Savanoriau",
      role,
      hoursNeeded: role === "student" ? Number(me.hours_needed) || 20 : undefined,
      avatarUrl: me.logo_url || null,
      initial: (me.full_name || "S").charAt(0).toUpperCase(),
    };
    return sendResend({
      to: me.email,
      subject: `Sveikas atvykęs į Socialinės Valandos ✦`,
      html: renderWelcomeEmail(props),
      text: welcomeText(props),
      tag: "welcome",
    });
  });

// -------------------- 5. Organization Invite (Admin triggered) --------------------

export const sendOrgInviteEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v) => z.object({ to: z.string().email(), orgName: z.string().optional(), variant: z.number().int().min(1).max(5).optional() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Tik administratoriai gali siųsti kvietimus");

    // Only invite addresses that actually asked to join (organization access
    // requests) — admins can't use this to email arbitrary recipients.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: req } = await supabaseAdmin
      .from("organization_access_requests")
      .select("id")
      .ilike("contact_email", data.to.trim())
      .limit(1)
      .maybeSingle();
    if (!req) throw new Error("Kvietimą galima siųsti tik organizacijai, pateikusiai prieigos užklausą");

    // Audit every invitation.
    await supabaseAdmin.from("activity_log").insert({
      user_id: context.userId,
      action: "admin.org_invite_sent",
      entity_type: "organization_access_request",
      meta: { to: data.to.trim().toLowerCase() },
    });


    const html = renderOrgInviteEmail({ 
      orgName: data.orgName || "Organizacija",
      variant: (data.variant as 1 | 2 | 3 | 4 | 5) || 1
    });
    const text = `Sveiki!\n\nKviečiame prisijungti prie Socialinės Valandos platformos — vieningos sistemos moksleivių savanorystei Lietuvoje.\n\nPrisijunkite: ${APP_URL}/register?role=organization&invite=true`;
    
    return sendResend({ 
      to: data.to, 
      subject: `Kviečiame prisijungti prie Socialinės Valandos 🤝`, 
      html, 
      text, 
      tag: "org-invite" 
    });
  });

// -------------------- Debug preview / test helpers --------------------

function demoHoursHtml() {
  return renderHoursConfirmedEmail({
    studentName: "Jonas Jonaitis", orgName: "Radviliškio Senjorų Namai",
    hours: 4, date: new Date().toISOString().slice(0, 10),
    totalHours: 12, neededHours: 20, location: "Vaižganto g. 5, Radviliškis",
  });
}

async function assertAdmin(ctx: { supabase: typeof import("@supabase/supabase-js")["createClient"] extends never ? never : any; userId: string }) {
  const { data: isAdmin } = await (ctx.supabase as any).rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Tik super admin");
}

export const previewHoursConfirmedEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    return { html: demoHoursHtml() };
  });

export const previewAllEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    return {
      hoursConfirmed: demoHoursHtml(),
      reservationApproved: renderReservationApprovedEmail({
        studentName: "Jonas Jonaitis", orgName: "Radviliškio Senjorų Namai",
        date: new Date().toISOString().slice(0, 10),
        startTime: "10:00", endTime: "14:00", hours: 4,
        location: "Vaižganto g. 5, Radviliškis",
      }),
      reservationDeclined: renderReservationDeclinedEmail({
        studentName: "Jonas Jonaitis", orgName: "Radviliškio Senjorų Namai",
        date: new Date().toISOString().slice(0, 10),
        reason: "Šiuo metu neturime laisvų vietų.",
      }),
      welcome: renderWelcomeEmail({ fullName: "Jonas Jonaitis", role: "student", hoursNeeded: 20 }),
      orgInvite: renderOrgInviteEmail({ orgName: "Testinė Organizacija" }),
    };
  });

export const sendTestHoursConfirmedEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v) => z.object({ to: z.string().email(), variant: z.enum(["hours", "approved", "declined", "welcome"]).default("hours") }).parse(v))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const demo = {
      studentName: "Testinis Vartotojas", orgName: "Testinė Organizacija",
      date: new Date().toISOString().slice(0, 10),
    };
    if (data.variant === "approved") {
      const p = { ...demo, startTime: "10:00", endTime: "14:00", hours: 4, location: "Testinis adresas 1" };
      return sendResend({ to: data.to, subject: "🧪 TEST — Rezervacija patvirtinta", html: renderReservationApprovedEmail(p), text: reservationApprovedText(p), tag: "test" });
    }
    if (data.variant === "declined") {
      const p = { ...demo, reason: "Testinė atmetimo priežastis." };
      return sendResend({ to: data.to, subject: "🧪 TEST — Rezervacija atmesta", html: renderReservationDeclinedEmail(p), text: reservationDeclinedText(p), tag: "test" });
    }
    if (data.variant === "welcome") {
      const p = { fullName: "Testinis Vartotojas", role: "student" as const, hoursNeeded: 20 };
      return sendResend({ to: data.to, subject: "🧪 TEST — Sveikas atvykęs", html: renderWelcomeEmail(p), text: welcomeText(p), tag: "test" });
    }
    return sendResend({
      to: data.to, subject: "🧪 TEST — Valandos patvirtintos",
      html: demoHoursHtml(),
      text: `Test — 4 val. patvirtinta.\n${APP_URL}/student`,
      tag: "test",
    });
  });

// -------------------- Email health (showcase / diagnostics) --------------------

export const getEmailHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const key = process.env.RESEND_API_KEY;
    const configured = !!key;
    let domainStatus: "unknown" | "ok" | "error" = "unknown";
    let domainDetail = "Nepatikrinta";
    let domains: { name: string; status: string; region?: string }[] = [];

    if (configured) {
      try {
        console.log("[email-health] Checking Resend domains...");
        const res = await fetch("https://api.resend.com/domains", {
          headers: { 
            "Authorization": `Bearer ${key.trim()}`,
            "Content-Type": "application/json"
          },
        });
        
        if (res.ok) {
          const json = (await res.json()) as { data?: { name: string; status: string; region?: string }[] };
          domains = json?.data ?? [];
          domainStatus = "ok";
          domainDetail = domains.length ? `${domains.length} domenas (-ai) rasta` : "Domenų nėra (Resend paskyroje)";
        } else {
          const errText = await res.text();
          console.error(`[email-health] Resend API error: ${res.status} ${errText}`);
          domainStatus = "error";
          domainDetail = `Resend klaida: ${res.status} ${errText.slice(0, 50)}`;
        }
      } catch (e: any) {
        console.error("[email-health] Network error checking Resend:", e);
        domainStatus = "error";
        domainDetail = `Tinklo klaida: ${e?.message ?? "Nežinoma"}`;
      }
    }

    return {
      configured,
      from: process.env.RESEND_FROM?.trim() || FROM_FALLBACK,
      replyTo: REPLY_TO,
      appUrl: APP_URL,
      domainStatus,
      domainDetail,
      domains,
      templates: [
        { key: "welcome", label: "Sveikas atvykęs (registracija)", trigger: "Iš karto po sėkmingos registracijos /register" },
        { key: "reservationApproved", label: "Rezervacija patvirtinta", trigger: "Organizacija paspaudžia „Patvirtinti“" },
        { key: "reservationDeclined", label: "Rezervacija atmesta", trigger: "Organizacija paspaudžia „Atmesti“" },
        { key: "hoursConfirmed", label: "Valandos patvirtintos", trigger: "Organizacija uždaro rezervaciją ir patvirtina valandas" },
      ],
      checkedAt: new Date().toISOString(),
    };
  });
