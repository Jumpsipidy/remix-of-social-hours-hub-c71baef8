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

const CRITICAL_THRESHOLD = 2;
const CRITICAL_WINDOW_MIN = 5;
const EMAIL_DEDUPE_MIN = 15;
// Burst detection: if ≥ BURST_MIN_USERS distinct users hit any error in the last
// BURST_WINDOW_S seconds, we treat the whole site as unstable and lockdown
// immediately, regardless of severity classification. This catches broken
// deploys where thousands of users would otherwise get errors before we react.
const BURST_WINDOW_S = 90;
const BURST_MIN_USERS = 3;


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
  burstUsers?: number;
  lockdownReason?: "critical-threshold" | "burst" | null;
  digest?: { msg: string; count: number }[];
}) {

  const isLock = !!opts.lockdown;
  const isCrit = opts.level === "critical";
  const accent = isLock ? "#ef4444" : isCrit ? "#f97316" : "#eab308";
  const accent2 = isLock ? "#f43f5e" : isCrit ? "#fb923c" : "#facc15";
  const banner = isLock ? "🔒 LOCKDOWN — SVETAINĖ UŽRAKINTA" : isCrit ? "🚨 KRITINĖ SISTEMOS KLAIDA" : "⚠️ ĮSPĖJIMAS";
  const severity = isLock ? "P0 · IMMEDIATE" : isCrit ? "P1 · HIGH" : "P3 · INFO";
  const subtitle = isLock
    ? `Aptikta ${opts.criticalCount ?? CRITICAL_THRESHOLD}+ kritinių klaidų per ${CRITICAL_WINDOW_MIN} min. Svetainė automatiškai užrakinta lankytojams. Reikia rankinio įsikišimo.`
    : isCrit
      ? `Užregistruota kritinė kliento klaida. Jei per ${CRITICAL_WINDOW_MIN} min susikaups ${CRITICAL_THRESHOLD}+ — svetainė bus automatiškai užrakinta.`
      : "Neaukšto prioriteto įspėjimas — signalas archyvui, be automatinių veiksmų.";
  const time = new Date().toLocaleString("lt-LT", { timeZone: "Europe/Vilnius" });
  const incidentId = `INC-${Date.now().toString(36).toUpperCase()}`;

  const badge = (label: string, color: string) =>
    `<span style="display:inline-block;padding:4px 10px;background:${color}22;color:${color};border:1px solid ${color}55;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;margin-right:6px">${label}</span>`;

  return `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#050915;font-family:'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;color:#e2e8f0">
<div style="max-width:640px;margin:0 auto;background:linear-gradient(180deg,#0b1220,#0f172a);border:1px solid ${accent}66;border-radius:24px;overflow:hidden;box-shadow:0 30px 80px ${accent}22,0 8px 24px rgba(0,0,0,.6)">

  <!-- Emergency stripe -->
  <div style="height:6px;background:linear-gradient(90deg,${accent},${accent2},${accent})"></div>

  <!-- Header -->
  <div style="padding:32px 32px 24px;background:radial-gradient(1000px 200px at 100% 0%,${accent}22,transparent 60%),radial-gradient(600px 240px at 0% 100%,${accent2}18,transparent 70%);border-bottom:1px solid ${accent}33">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px">
      <div style="font-size:10px;font-weight:800;letter-spacing:.28em;text-transform:uppercase;color:${accent}">Socialinės Valandos · Auto-monitor</div>
      <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;color:#64748b">${incidentId}</div>
    </div>
    <div style="font-size:30px;font-weight:900;color:#fff;letter-spacing:-.02em;line-height:1.1">${banner}</div>
    <div style="margin-top:10px">${badge(severity, accent)}${badge(time + " LT", "#64748b")}${isLock ? badge("E-5001", "#f43f5e") : ""}</div>
    <div style="margin-top:14px;font-size:14px;color:#cbd5e1;line-height:1.6;max-width:520px">${escapeHtml(subtitle)}</div>
  </div>

  <!-- Body -->
  <div style="padding:28px 32px">
    ${isLock ? `<div style="margin:0 0 22px;padding:16px 18px;background:linear-gradient(135deg,${accent}18,${accent2}10);border:1px solid ${accent}66;border-radius:14px;color:#fee2e2;font-size:13px;line-height:1.6">
      <div style="font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:${accent};margin-bottom:6px">Reikalingas veiksmas</div>
      <div><b style="color:#fff">Prisijunk kaip super admin ir eik į <a href="https://socialinesvalandos.dev/admin/lockdown" style="color:#fca5a5">/admin/lockdown</a>, kad išjungtum apsaugą.</b> Kol lockdown įjungtas, lankytojai mato blokavimo puslapį (kodas <b style="color:#fff">E-5001</b>).</div>
    </div>` : ""}

    <div style="font-size:10px;font-weight:800;color:#94a3b8;letter-spacing:.18em;text-transform:uppercase;margin-bottom:8px">▸ Klaidos žinutė</div>
    <pre style="margin:0 0 18px;padding:16px;background:#020617;border:1px solid ${accent}44;border-left:3px solid ${accent};border-radius:12px;white-space:pre-wrap;word-break:break-word;font-size:12.5px;line-height:1.6;color:#f8fafc;font-family:'JetBrains Mono',ui-monospace,monospace">${escapeHtml(opts.message)}</pre>

    <table style="width:100%;border-collapse:collapse;margin-bottom:6px">
      ${opts.path ? `<tr><td style="padding:8px 0;font-size:11px;color:#64748b;letter-spacing:.1em;text-transform:uppercase;width:110px">Puslapis</td><td style="padding:8px 0;font-size:13px"><code style="color:#e2e8f0;background:#020617;padding:3px 8px;border-radius:6px;border:1px solid #1e293b">${escapeHtml(opts.path)}</code></td></tr>` : ""}
      ${opts.userEmail ? `<tr><td style="padding:8px 0;font-size:11px;color:#64748b;letter-spacing:.1em;text-transform:uppercase">Vartotojas</td><td style="padding:8px 0;font-size:13px"><code style="color:#67e8f9">${escapeHtml(opts.userEmail)}</code></td></tr>` : ""}
      ${opts.userAgent ? `<tr><td style="padding:8px 0;font-size:11px;color:#64748b;letter-spacing:.1em;text-transform:uppercase;vertical-align:top">Įrenginys</td><td style="padding:8px 0;font-size:11.5px;color:#cbd5e1;line-height:1.5">${escapeHtml(opts.userAgent.slice(0, 220))}</td></tr>` : ""}
      ${typeof opts.criticalCount === "number" && opts.criticalCount > 0 ? `<tr><td style="padding:8px 0;font-size:11px;color:#64748b;letter-spacing:.1em;text-transform:uppercase">Kritinių ${CRITICAL_WINDOW_MIN} min</td><td style="padding:8px 0"><span style="display:inline-block;padding:4px 12px;background:${accent}22;color:${accent};border-radius:999px;font-weight:800;font-size:12px">${opts.criticalCount} / ${CRITICAL_THRESHOLD}</span></td></tr>` : ""}
    </table>

    ${opts.stack ? `<details style="margin-top:18px;padding:12px 14px;background:#020617;border:1px solid #1e293b;border-radius:12px"><summary style="cursor:pointer;font-size:10px;color:#94a3b8;font-weight:800;letter-spacing:.16em;text-transform:uppercase">▸ Stack trace</summary><pre style="margin:12px 0 0;font-size:11px;color:#cbd5e1;white-space:pre-wrap;word-break:break-word;max-height:320px;overflow:auto;font-family:'JetBrains Mono',ui-monospace,monospace;line-height:1.55">${escapeHtml(opts.stack)}</pre></details>` : ""}

    <div style="margin-top:26px;display:flex;gap:10px;flex-wrap:wrap">
      <a href="https://socialinesvalandos.dev/admin/errors" style="display:inline-block;padding:14px 24px;background:linear-gradient(135deg,#6366f1,#22d3ee);color:#0b1220;font-weight:800;text-decoration:none;border-radius:999px;font-size:13px;letter-spacing:.02em;box-shadow:0 8px 24px rgba(99,102,241,.3)">Atidaryti klaidų centrą →</a>
      ${isLock ? `<a href="https://socialinesvalandos.dev/admin/lockdown" style="display:inline-block;padding:14px 24px;background:linear-gradient(135deg,${accent},${accent2});color:#fff;font-weight:800;text-decoration:none;border-radius:999px;font-size:13px;letter-spacing:.02em;box-shadow:0 8px 24px ${accent}55">🔓 Išjungti Lockdown →</a>` : ""}
    </div>
  </div>

  <!-- Footer -->
  <div style="padding:16px 32px;background:#020617;border-top:1px solid #1e293b;font-size:11px;color:#64748b;line-height:1.6">
    Automatinis pranešimas · Slenkstis: ${CRITICAL_THRESHOLD} kritinės / ${CRITICAL_WINDOW_MIN} min · Dedupe: ${EMAIL_DEDUPE_MIN} min<br/>
    Incident: <code style="color:#94a3b8">${incidentId}</code>
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

    // Per-IP rate limit — stops an anonymous flood from tripping auto-lockdown
    // with three trivial requests. Beyond the cap we drop silently.
    let fp = "unknown";
    try {
      const req = getRequest();
      if (req) fp = clientFingerprint(req);
    } catch { /* ignore — SSR / missing request */ }
    if (!checkRate(fp)) return { ok: true, ignored: true, reason: "rate_limited" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Only reports from an authenticated user (identified via provided userEmail
    // matched against a real profile) may count toward the auto-lockdown
    // threshold. Anonymous reports are still logged, but they can't take the
    // site down.
    let authedUserId: string | null = null;
    if (data.userEmail) {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", data.userEmail.toLowerCase())
        .maybeSingle();
      authedUserId = (prof as { id: string } | null)?.id ?? null;
    }

    await supabaseAdmin.from("activity_log").insert({
      user_id: authedUserId,
      action: data.level === "critical" ? "app.critical" : "app.warning",
      entity_type: "auto-monitor",
      meta: {
        message: data.message,
        path: data.path ?? null,
        stack: data.stack?.slice(0, 500) ?? null,
        userAgent: data.userAgent ?? null,
        anon: authedUserId === null,
        fp,
      },
    });

    let lockdownTriggered = false;
    let lockdownReason: "critical-threshold" | "burst" | null = null;
    let criticalCount = 0;
    let burstUsers = 0;

    // BURST DETECTION — check every request. If many distinct signed-in users
    // hit errors within a short window, the site is broken for many users;
    // lockdown immediately.
    {
      const burstSince = new Date(Date.now() - BURST_WINDOW_S * 1000).toISOString();
      const { data: recent } = await supabaseAdmin
        .from("activity_log")
        .select("user_id")
        .in("action", ["client.error", "supabase.error", "app.critical", "app.warning"])
        .not("user_id", "is", null)
        .gte("created_at", burstSince)
        .limit(500);
      const distinct = new Set(
        (recent ?? []).map((r: { user_id: string | null }) => r.user_id).filter(Boolean) as string[],
      );
      burstUsers = distinct.size;
      if (burstUsers >= BURST_MIN_USERS) {
        lockdownReason = "burst";
      }
    }

    if (data.level === "critical" && authedUserId !== null && !lockdownReason) {
      const since = new Date(Date.now() - CRITICAL_WINDOW_MIN * 60_000).toISOString();
      const { count } = await supabaseAdmin
        .from("activity_log")
        .select("*", { count: "exact", head: true })
        .eq("action", "app.critical")
        .not("user_id", "is", null)
        .gte("created_at", since);
      criticalCount = count ?? 0;
      if (criticalCount >= CRITICAL_THRESHOLD) lockdownReason = "critical-threshold";
    }

    if (lockdownReason) {
      const { data: ss } = await supabaseAdmin
        .from("site_settings")
        .select("lockdown_enabled")
        .eq("id", true)
        .maybeSingle();
      if (!ss?.lockdown_enabled) {
        const code = lockdownReason === "burst" ? "E-5002" : "E-5001";
        const msg = lockdownReason === "burst"
          ? `[auto] Aptikta ${burstUsers} vartotojų su klaidomis per ${BURST_WINDOW_S}s (burst). Prieiga ribojama.`
          : `[auto] Aptiktos ${criticalCount} kritinės klaidos per ${CRITICAL_WINDOW_MIN} min. Prieiga ribojama.`;
        await supabaseAdmin.from("site_settings").upsert({
          id: true,
          lockdown_enabled: true,
          lockdown_code: code,
          lockdown_message: msg,
          updated_at: new Date().toISOString(),
        });
        lockdownTriggered = true;
      }
    }

    // Fetch recent errors digest for the email (last 15 min, grouped)
    let digest: { msg: string; count: number }[] = [];
    if (lockdownTriggered || data.level === "critical") {
      const digestSince = new Date(Date.now() - 15 * 60_000).toISOString();
      const { data: recentErrs } = await supabaseAdmin
        .from("activity_log")
        .select("meta")
        .in("action", ["client.error", "supabase.error", "app.critical"])
        .gte("created_at", digestSince)
        .order("created_at", { ascending: false })
        .limit(80);
      const counts = new Map<string, number>();
      for (const r of (recentErrs ?? []) as { meta: { message?: string } | null }[]) {
        const m = (r.meta?.message ?? "").slice(0, 100);
        if (!m) continue;
        counts.set(m, (counts.get(m) ?? 0) + 1);
      }
      digest = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([msg, count]) => ({ msg, count }));
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
          ? lockdownReason === "burst"
            ? `🔒 URGENT — LOCKDOWN (burst · ${burstUsers} vartotojų) · Socialinės Valandos`
            : `🔒 URGENT — LOCKDOWN AKTYVUOTAS · Socialinės Valandos`
          : data.level === "critical"
            ? `🚨 Kritinė klaida svetainėje · ${data.path ?? "/"}`
            : `⚠️ Klaidos įspėjimas · ${data.path ?? "/"}`;
        const html = alertEmailHtml({
          ...data,
          lockdown: lockdownTriggered,
          criticalCount,
          burstUsers,
          lockdownReason,
          digest,
        });
        await Promise.all(recipients.map((to) => sendResendEmail(to, subject, html, { urgent: lockdownTriggered || data.level === "critical" })));
        await supabaseAdmin.from("activity_log").insert({
          action: "app.email_sent",
          entity_type: "auto-monitor",
          meta: {
            message: data.message.slice(0, 80),
            recipients: recipients.length,
            lockdown: lockdownTriggered,
            lockdown_reason: lockdownReason,
            burst_users: burstUsers,
            level: data.level,
          },
        });
      }
    }

    return { ok: true, lockdownTriggered, lockdownReason, criticalCount, burstUsers };
  });

