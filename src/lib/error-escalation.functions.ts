// Public server fn: receives client-side error escalations.
// Behavior:
//  - `critical`: if ≥ CRITICAL_THRESHOLD critical errors happen inside CRITICAL_WINDOW_MIN,
//    auto-enable Lockdown with code E-5001 and email all admins.
//  - `warning`: just email all admins (rate-limited, no lockdown).
// Uses service role (server-side, no auth needed — but heavily rate-limited).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CRITICAL_THRESHOLD = 3;
const CRITICAL_WINDOW_MIN = 5;
const EMAIL_DEDUPE_MIN = 15;

const payloadSchema = z.object({
  level: z.enum(["critical", "warning"]),
  message: z.string().min(1).max(500),
  path: z.string().max(200).optional(),
  stack: z.string().max(2000).optional(),
});

async function sendResendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: "Socialinės Valandos <noreply@jumpsipidy.online>",
        to,
        subject,
        html,
      }),
    });
  } catch (err) {
    console.error("[escalate] resend failed", err);
  }
}

function alertEmailHtml(opts: { level: string; message: string; path?: string; stack?: string; lockdown?: boolean }) {
  const color = opts.lockdown ? "#f43f5e" : opts.level === "critical" ? "#f97316" : "#facc15";
  const title = opts.lockdown ? "🔒 LOCKDOWN AKTYVUOTAS" : opts.level === "critical" ? "🚨 Kritinė klaida" : "⚠️ Įspėjimas";
  return `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#0b1220;font-family:system-ui,sans-serif;color:#e5e7eb">
<div style="max-width:560px;margin:0 auto;background:#111827;border:1px solid ${color}44;border-radius:20px;overflow:hidden">
  <div style="padding:24px;background:linear-gradient(135deg,${color}22,transparent);border-bottom:1px solid ${color}33">
    <div style="font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:${color}">Socialinės Valandos · Auto-monitoringas</div>
    <div style="margin-top:8px;font-size:22px;font-weight:900;color:#fff">${title}</div>
  </div>
  <div style="padding:24px">
    ${opts.lockdown ? `<p style="margin:0 0 16px;padding:12px;background:#f43f5e22;border:1px solid #f43f5e44;border-radius:10px;color:#fecaca;font-size:13px">
      Sistema aptiko ${CRITICAL_THRESHOLD}+ kritines klaidas per ${CRITICAL_WINDOW_MIN} min. Svetainė automatiškai užrakinta lankytojams (kodas E-5001). Prisijunk kaip super admin ir spausk „Išjungti“ /admin/lockdown puslapyje.
    </p>` : ""}
    <div style="font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:.1em;text-transform:uppercase">Klaidos žinutė</div>
    <pre style="margin:4px 0 16px;padding:12px;background:#0b1220;border:1px solid #1f2937;border-radius:10px;white-space:pre-wrap;font-size:12px;color:#e5e7eb">${escapeHtml(opts.message)}</pre>
    ${opts.path ? `<div style="font-size:12px;color:#9ca3af">Puslapis: <code style="color:#e5e7eb">${escapeHtml(opts.path)}</code></div>` : ""}
    <a href="https://socialinesvalandos.vercel.app/admin/errors" style="display:inline-block;margin-top:20px;padding:12px 20px;background:linear-gradient(135deg,#6366f1,#22d3ee);color:#000;font-weight:700;text-decoration:none;border-radius:999px;font-size:13px">Atidaryti klaidų žurnalą →</a>
  </div>
</div></body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const escalateAppError = createServerFn({ method: "POST" })
  .validator((v: unknown) => payloadSchema.parse(v))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Insert into activity_log
    await supabaseAdmin.from("activity_log").insert({
      action: data.level === "critical" ? "app.critical" : "app.warning",
      entity_type: "auto-monitor",
      meta: {
        message: data.message,
        path: data.path ?? null,
        stack: data.stack?.slice(0, 500) ?? null,
      },
    });

    // Check for critical threshold
    let lockdownTriggered = false;
    if (data.level === "critical") {
      const since = new Date(Date.now() - CRITICAL_WINDOW_MIN * 60_000).toISOString();
      const { count } = await supabaseAdmin
        .from("activity_log")
        .select("*", { count: "exact", head: true })
        .eq("action", "app.critical")
        .gte("created_at", since);

      if ((count ?? 0) >= CRITICAL_THRESHOLD) {
        // Check current lockdown state — don't retrigger if already on
        const { data: ss } = await supabaseAdmin
          .from("site_settings")
          .select("lockdown_enabled")
          .eq("id", true)
          .maybeSingle();
        if (!ss?.lockdown_enabled) {
          await supabaseAdmin.from("site_settings").upsert({
            id: true,
            lockdown_enabled: true,
            lockdown_code: "E-5001",
            lockdown_message: `[auto] Aptiktos ${count} kritinės klaidos per ${CRITICAL_WINDOW_MIN} min. Prieiga ribojama.`,
            updated_at: new Date().toISOString(),
          });
          lockdownTriggered = true;
        }
      }
    }

    // Dedupe: don't email same message twice in EMAIL_DEDUPE_MIN
    const dedupeSince = new Date(Date.now() - EMAIL_DEDUPE_MIN * 60_000).toISOString();
    const { count: emailedCount } = await supabaseAdmin
      .from("activity_log")
      .select("*", { count: "exact", head: true })
      .eq("action", "app.email_sent")
      .gte("created_at", dedupeSince)
      .ilike("meta->>message", data.message.slice(0, 80));

    if ((emailedCount ?? 0) === 0) {
      const { data: admins } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("role", "admin");
      const recipients = (admins ?? []).map((a: { email: string | null }) => a.email).filter((e): e is string => !!e);
      if (recipients.length) {
        const subject = lockdownTriggered
          ? "🔒 [Socialinės Valandos] LOCKDOWN aktyvuotas"
          : data.level === "critical"
            ? "🚨 [Socialinės Valandos] Kritinė klaida"
            : "⚠️ [Socialinės Valandos] Įspėjimas";
        const html = alertEmailHtml({ ...data, lockdown: lockdownTriggered });
        await Promise.all(recipients.map((to) => sendResendEmail(to, subject, html)));
        await supabaseAdmin.from("activity_log").insert({
          action: "app.email_sent",
          entity_type: "auto-monitor",
          meta: { message: data.message.slice(0, 80), recipients: recipients.length, lockdown: lockdownTriggered },
        });
      }
    }

    return { ok: true, lockdownTriggered };
  });
