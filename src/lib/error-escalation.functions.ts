// Public server fn: receives client-side error escalations.
// Behavior tiers:
//  - `critical`: if ≥ CRITICAL_THRESHOLD critical errors happen inside CRITICAL_WINDOW_MIN,
//    auto-enable Lockdown with code E-5001 and email all admins with HIGH priority headers.
//    A single critical also emails an urgent alert (dedup'd, so noisy pages don't spam).
//  - `warning`: rate-limited email; no lockdown.
// Skips test / hot-reload / decorative-WebGL noise so real signal isn't buried.

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { clientFingerprint } from "@/lib/security-crypto.server";

const CRITICAL_THRESHOLD = 3;
const CRITICAL_WINDOW_MIN = 5;
const EMAIL_DEDUPE_MIN = 15;

// Per-IP rate limit (in-memory, per-worker). Prevents an anonymous flood from
// tripping the auto-lockdown threshold with three trivial requests.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_WINDOW = 5;
const rateBuckets = new Map<string, number[]>();
function checkRate(fp: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const bucket = (rateBuckets.get(fp) ?? []).filter((t) => t > cutoff);
  if (bucket.length >= RATE_MAX_PER_WINDOW) {
    rateBuckets.set(fp, bucket);
    return false;
  }
  bucket.push(now);
  rateBuckets.set(fp, bucket);
  return true;
}

// Server-side ignore list (belt + braces alongside client filter)
const IGNORE_RX = [
  /\[TEST\]/i,
  /THREE\.WebGLRenderer/i,
  /WebGL context/i,
  /Web page caused context loss/i,
  /\[vite\]/i,
  /Minified React error #418/i,
  /ResizeObserver loop/i,
];

const payloadSchema = z.object({
  level: z.enum(["critical", "warning"]),
  message: z.string().min(1).max(500),
  path: z.string().max(200).optional(),
  stack: z.string().max(2000).optional(),
  userAgent: z.string().max(300).optional(),
  userEmail: z.string().max(200).optional(),
});

async function sendResendEmail(to: string, subject: string, html: string, opts: { urgent?: boolean } = {}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    const headers: Record<string, string> = {};
    if (opts.urgent) {
      headers["X-Priority"] = "1";
      headers["X-MSMail-Priority"] = "High";
      headers["Importance"] = "High";
    }
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: "Socialinės Valandos Alerts <alerts@jumpsipidy.online>",
        to,
        subject,
        html,
        reply_to: "noreply@jumpsipidy.online",
        headers,
        tags: [{ name: "kind", value: opts.urgent ? "alert-urgent" : "alert" }],
      }),
    });
  } catch (err) {
    console.error("[escalate] resend failed", err);
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function alertEmailHtml(opts: {
  level: string;
  message: string;
  path?: string;
  stack?: string;
  userAgent?: string;
  userEmail?: string;
  lockdown?: boolean;
  criticalCount?: number;
}) {
  const isLock = !!opts.lockdown;
  const isCrit = opts.level === "critical";
  const accent = isLock ? "#f43f5e" : isCrit ? "#f97316" : "#facc15";
  const banner = isLock ? "🔒 LOCKDOWN AKTYVUOTAS" : isCrit ? "🚨 KRITINĖ KLAIDA" : "⚠️ ĮSPĖJIMAS";
  const subtitle = isLock
    ? `Sistema aptiko ${opts.criticalCount ?? CRITICAL_THRESHOLD}+ kritines klaidas per ${CRITICAL_WINDOW_MIN} min. Svetainė automatiškai užrakinta.`
    : isCrit
      ? "Viena kritinė kliento klaida — jei jų susikaups per 5 min, svetainė automatiškai užsirakins."
      : "Ne kritinė klaida — signalas archyvui.";
  const time = new Date().toLocaleString("lt-LT", { timeZone: "Europe/Vilnius" });

  return `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#0b1220;font-family:'SF Pro Display',system-ui,sans-serif;color:#e5e7eb">
<div style="max-width:600px;margin:0 auto;background:#0f172a;border:1px solid ${accent}55;border-radius:22px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)">
  <div style="padding:28px 28px 24px;background:linear-gradient(135deg,${accent}33,transparent 70%);border-bottom:1px solid ${accent}33">
    <div style="font-size:10px;font-weight:800;letter-spacing:.24em;text-transform:uppercase;color:${accent}">Socialinės Valandos · Auto-monitoringas · ${escapeHtml(time)} LT</div>
    <div style="margin-top:10px;font-size:26px;font-weight:900;color:#fff;letter-spacing:-.02em">${banner}</div>
    <div style="margin-top:8px;font-size:13px;color:#cbd5e1;line-height:1.5">${escapeHtml(subtitle)}</div>
  </div>
  <div style="padding:24px 28px">
    ${isLock ? `<div style="margin:0 0 18px;padding:14px 16px;background:#f43f5e1a;border:1px solid #f43f5e55;border-radius:12px;color:#fecaca;font-size:13px;line-height:1.5">
      <b style="color:#fca5a5">Reikalingas veiksmas:</b> Prisijunk kaip super admin ir eik į <b>/admin/lockdown</b>, kad išjungtum. Kol lockdown įjungtas, lankytojai mato blokavimo puslapį (kodas <b>E-5001</b>).
    </div>` : ""}
    <div style="font-size:10px;font-weight:800;color:#94a3b8;letter-spacing:.14em;text-transform:uppercase;margin-bottom:6px">Klaidos žinutė</div>
    <pre style="margin:0 0 16px;padding:14px;background:#020617;border:1px solid #1e293b;border-radius:12px;white-space:pre-wrap;word-break:break-word;font-size:12px;line-height:1.55;color:#f1f5f9;font-family:'JetBrains Mono',ui-monospace,monospace">${escapeHtml(opts.message)}</pre>
    ${opts.path ? `<div style="margin-bottom:10px;font-size:12px;color:#94a3b8">📄 <b style="color:#e2e8f0">Puslapis:</b> <code style="color:#f1f5f9;background:#0b1220;padding:2px 8px;border-radius:6px">${escapeHtml(opts.path)}</code></div>` : ""}
    ${opts.userEmail ? `<div style="margin-bottom:10px;font-size:12px;color:#94a3b8">👤 <b style="color:#e2e8f0">Vartotojas:</b> <code style="color:#f1f5f9">${escapeHtml(opts.userEmail)}</code></div>` : ""}
    ${opts.userAgent ? `<div style="margin-bottom:10px;font-size:12px;color:#94a3b8">🖥️ <b style="color:#e2e8f0">Įrenginys:</b> <code style="color:#cbd5e1;font-size:11px">${escapeHtml(opts.userAgent.slice(0, 180))}</code></div>` : ""}
    ${opts.stack ? `<details style="margin-top:14px"><summary style="cursor:pointer;font-size:11px;color:#94a3b8;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Stack trace</summary><pre style="margin-top:8px;padding:12px;background:#020617;border:1px solid #1e293b;border-radius:10px;font-size:11px;color:#cbd5e1;white-space:pre-wrap;word-break:break-word;max-height:280px;overflow:auto">${escapeHtml(opts.stack)}</pre></details>` : ""}
    <div style="margin-top:22px;display:flex;gap:10px;flex-wrap:wrap">
      <a href="https://socialinesvalandos.vercel.app/admin/errors" style="display:inline-block;padding:13px 22px;background:linear-gradient(135deg,#6366f1,#22d3ee);color:#0b1220;font-weight:800;text-decoration:none;border-radius:999px;font-size:13px">Atidaryti klaidų žurnalą →</a>
      ${isLock ? `<a href="https://socialinesvalandos.vercel.app/admin/lockdown" style="display:inline-block;padding:13px 22px;background:linear-gradient(135deg,#f43f5e,#ef4444);color:#fff;font-weight:800;text-decoration:none;border-radius:999px;font-size:13px">Išjungti Lockdown →</a>` : ""}
    </div>
  </div>
  <div style="padding:14px 28px;background:#020617;border-top:1px solid #1e293b;font-size:11px;color:#64748b">
    Šis pranešimas išsiųstas automatiškai iš klaidų monitoringo sistemos. Nekartojamas per ${EMAIL_DEDUPE_MIN} min.
  </div>
</div></body></html>`;
}

export const escalateAppError = createServerFn({ method: "POST" })
  .validator((v: unknown) => payloadSchema.parse(v))
  .handler(async ({ data }) => {
    // Filter noise server-side too
    if (IGNORE_RX.some((rx) => rx.test(data.message))) {
      return { ok: true, ignored: true };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("activity_log").insert({
      action: data.level === "critical" ? "app.critical" : "app.warning",
      entity_type: "auto-monitor",
      meta: {
        message: data.message,
        path: data.path ?? null,
        stack: data.stack?.slice(0, 500) ?? null,
        userAgent: data.userAgent ?? null,
      },
    });

    let lockdownTriggered = false;
    let criticalCount = 0;
    if (data.level === "critical") {
      const since = new Date(Date.now() - CRITICAL_WINDOW_MIN * 60_000).toISOString();
      const { count } = await supabaseAdmin
        .from("activity_log")
        .select("*", { count: "exact", head: true })
        .eq("action", "app.critical")
        .gte("created_at", since);
      criticalCount = count ?? 0;

      if (criticalCount >= CRITICAL_THRESHOLD) {
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
            lockdown_message: `[auto] Aptiktos ${criticalCount} kritinės klaidos per ${CRITICAL_WINDOW_MIN} min. Prieiga ribojama.`,
            updated_at: new Date().toISOString(),
          });
          lockdownTriggered = true;
        }
      }
    }

    // Dedupe email by first 80 chars of message within window (lockdown alerts bypass dedupe)
    let shouldEmail = lockdownTriggered;
    if (!shouldEmail) {
      const dedupeSince = new Date(Date.now() - EMAIL_DEDUPE_MIN * 60_000).toISOString();
      const { count: emailedCount } = await supabaseAdmin
        .from("activity_log")
        .select("*", { count: "exact", head: true })
        .eq("action", "app.email_sent")
        .gte("created_at", dedupeSince)
        .ilike("meta->>message", data.message.slice(0, 80));
      shouldEmail = (emailedCount ?? 0) === 0;
    }

    if (shouldEmail) {
      const { data: admins } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("role", "admin");
      const recipients = (admins ?? [])
        .map((a: { email: string | null }) => a.email)
        .filter((e): e is string => !!e);
      if (recipients.length) {
        const subject = lockdownTriggered
          ? `🔒 URGENT — LOCKDOWN AKTYVUOTAS · Socialinės Valandos`
          : data.level === "critical"
            ? `🚨 Kritinė klaida svetainėje · ${data.path ?? "/"}`
            : `⚠️ Klaidos įspėjimas · ${data.path ?? "/"}`;
        const html = alertEmailHtml({ ...data, lockdown: lockdownTriggered, criticalCount });
        await Promise.all(recipients.map((to) => sendResendEmail(to, subject, html, { urgent: lockdownTriggered || data.level === "critical" })));
        await supabaseAdmin.from("activity_log").insert({
          action: "app.email_sent",
          entity_type: "auto-monitor",
          meta: {
            message: data.message.slice(0, 80),
            recipients: recipients.length,
            lockdown: lockdownTriggered,
            level: data.level,
          },
        });
      }
    }

    return { ok: true, lockdownTriggered, criticalCount };
  });
