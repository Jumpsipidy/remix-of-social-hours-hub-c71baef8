import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { renderHoursConfirmedEmail } from "./email-templates/hours-confirmed";

const FROM = "Socialinės Valandos <noreply@jumpsipidy.online>";

async function sendResend(payload: {
  to: string;
  subject: string;
  html: string;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set — skipping send");
    return { skipped: true as const };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ from: FROM, ...payload }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[email] Resend error", res.status, text);
    throw new Error(`Resend ${res.status}: ${text}`);
  }
  return { ok: true as const };
}

export const sendHoursConfirmedEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        reservationId: z.string().uuid(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    // Load reservation (RLS: only the org owner or admin can see it — matches finalize flow)
    const { data: r, error } = await context.supabase
      .from("reservations")
      .select("id, student_id, organization_id, reservation_date, start_time, end_time, hours_to_earn, address")
      .eq("id", data.reservationId)
      .single();
    if (error || !r) throw new Error(error?.message ?? "Rezervacija nerasta");

    // Only the org owner (or admin) may trigger the mail. RLS above already enforces read.
    if (r.organization_id !== context.userId) {
      const { data: isAdmin } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (!isAdmin) throw new Error("Neturi teisės siųsti šio pranešimo");
    }

    // Load student + org profile (public-visible via can_view_profile since they share this reservation)
    const [{ data: student }, { data: org }] = await Promise.all([
      context.supabase.from("profiles").select("full_name, email, hours_earned, hours_needed").eq("id", r.student_id).single(),
      context.supabase.from("profiles").select("organization_name, full_name").eq("id", r.organization_id).single(),
    ]);
    if (!student?.email) return { skipped: true as const, reason: "no_email" };

    const orgName = org?.organization_name || org?.full_name || "Organizacija";
    const html = renderHoursConfirmedEmail({
      studentName: student.full_name || "Savanoriau",
      orgName,
      hours: Number(r.hours_to_earn) || 0,
      date: r.reservation_date,
      totalHours: Number(student.hours_earned) || 0,
      neededHours: Number(student.hours_needed) || 0,
      location: r.address || undefined,
    });

    return sendResend({
      to: student.email,
      subject: `✓ ${Number(r.hours_to_earn)} val. patvirtinta — ${orgName}`,
      html,
    });
  });
