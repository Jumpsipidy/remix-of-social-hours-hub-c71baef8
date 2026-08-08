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

const EMAIL_DEDUPE_MIN = 24 * 60;
// Burst detection: if ≥ BURST_MIN_USERS distinct users hit any error in the last
// BURST_WINDOW_S seconds, we treat the whole site as unstable and lockdown
// immediately, regardless of severity classification. This catches broken
// deploys where thousands of users would otherwise get errors before we react.
const BURST_WINDOW_S = 90;
const BURST_MIN_USERS = 1;
// Flood: many client errors of any severity in a short window = outage.
const FLOOD_WINDOW_MIN = 5;
const FLOOD_THRESHOLD = 10;

type InlineAiAnalysis = {
  suspected_cause?: string | null;
  suggested_file?: string | null;
  suggested_fix?: string | null;
  severity_estimate?: string | null;
  confidence?: number | null;
  raw_response?: { prompt_for_agent?: unknown } | null;
};

function trimText(s: string, max: number) {
  return s.length > max ? `${s.slice(0, Math.max(0, max - 1))}…` : s;
}

function confidencePercent(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(Math.abs(n) <= 1 ? n * 100 : n)));
}


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
  // React hydration/SSR-mismatch family (#418 #419 #421 #422 #423 #425 #520)
  // — cosmetic, self-healing on the client. Never page anyone for these.
  /Minified React error #(418|419|421|422|423|425|520)/i,
  /react\.dev\/errors\/(418|419|421|422|423|425|520)/i,
  /Hydration failed/i,
  /server rendered HTML didn't match/i,
  /There was an error while hydrating/i,
  /Text content does not match server-rendered HTML/i,
  /ResizeObserver loop/i,
  /\[UI užšalo/i,
  /\[lėtas API/i,
  /pagrindinė gija užblokuota/i,
  /\[ryšys dingo/i,
  /^telemetry:/i,
  /Patikrinkite, ar visi komponentai, naudojami App.js/i,
  /Concurrent Mode/i,
  /error boundaries aplink komponentus/i,
  /concurrent rendering but React was able to recover/i,
  /renderRootSync/i,
  /throwAndUnwindWorkLoop/i,
  /performWorkOnRoot/i,
  /MessagePort\.performWorkUntilDeadline/i,
  /link failed/i,
  /styles\.css/i,
  /_serverFn/i,
  /Failed to fetch/i,
  /a61dcb0e74be5570ed929d34edd01512f618516f9681e8085da42be8265ea8ff/i,
  /versijos/i,
  /streak-7\.mp4/i,
  /assets-v1/i,
  /push_subscriptions/i,
  /PGRST205/i,
  /login_streak_30\.mp4/i,
  /five_hours\.mp4/i,
  /ten_hours\.mp4/i,
  /goal_reached\.mp4/i,
  /send was called before connect/i,
  /Video error on clip/i,
  /video failed/i,
  /socialinesvalandos\.dev\/__l5e\/assets-v1/i,

];



function isTelemetryNoise(message: string | undefined | null): boolean {
  const msg = String(message ?? "");
  return IGNORE_RX.some((rx) => rx.test(msg));
}

const breadcrumbSchema = z.object({
  t: z.number().optional(),
  kind: z.string().max(30).optional(),
  label: z.string().max(200).optional(),
  path: z.string().max(200).optional(),
});

const payloadSchema = z.object({
  level: z.enum(["critical", "warning"]),
  message: z.string().min(1).max(500),
  path: z.string().max(200).optional(),
  stack: z.string().max(2000).optional(),
  userAgent: z.string().max(300).optional(),
  userEmail: z.string().max(200).optional(),
  source: z.string().max(60).optional(),
  browser: z.string().max(60).optional(),
  os: z.string().max(60).optional(),
  device: z.string().max(30).optional(),
  breadcrumbs: z.array(breadcrumbSchema).max(15).optional(),
  test: z.boolean().optional(),
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

// -----------------------------------------------------------------------------
// Discord webhook — realtime pings alongside email. Silent no-op if secret
// missing. Uses rich embed with color-coded severity + button-style link.
// -----------------------------------------------------------------------------
async function sendDiscordAlert(opts: {
  level: "critical" | "warning";
  lockdown: boolean;
  lockdownReason: "critical-threshold" | "burst" | "flood" | null;
  message: string;
  path?: string;
  userEmail?: string;
  criticalCount?: number;
  burstUsers?: number;
  fingerprint?: string;
  source?: string;
  browser?: string;
  os?: string;
  device?: string;
  stack?: string;
  breadcrumbs?: { t?: number; kind?: string; label?: string; path?: string }[];
  aiAnalysis?: InlineAiAnalysis | null;
}) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  const isLock = opts.lockdown;
  const isBurst = opts.lockdownReason === "burst";
  const color = isLock
    ? (isBurst ? 0xf43f5e : 0xef4444)
    : opts.level === "critical" ? 0xf97316
    : 0xeab308;
  const title = isLock
    ? (isBurst ? "🔥 LOCKDOWN — BURST" : "🔒 LOCKDOWN — Kritinis slenkstis")
    : opts.level === "critical" ? "🚨 Kritinė klaida" : "⚠️ Įspėjimas";
  const fields: { name: string; value: string; inline?: boolean }[] = [];
  if (opts.path) fields.push({ name: "Kelias", value: `\`${opts.path}\``, inline: true });
  if (opts.source) fields.push({ name: "Šaltinis", value: `\`${opts.source}\``, inline: true });
  if (opts.userEmail) fields.push({ name: "Vartotojas", value: `\`${opts.userEmail}\``, inline: true });
  const dev = [opts.browser, opts.os, opts.device].filter(Boolean).join(" · ");
  if (dev) fields.push({ name: "Įrenginys", value: dev, inline: true });
  if (opts.fingerprint) fields.push({ name: "Fingerprint", value: `\`${opts.fingerprint}\``, inline: true });
  if (typeof opts.criticalCount === "number" && opts.criticalCount > 0) {
    fields.push({ name: `Kritinių (${CRITICAL_WINDOW_MIN}min)`, value: `**${opts.criticalCount}** / ${CRITICAL_THRESHOLD}`, inline: true });
  }
  if (typeof opts.burstUsers === "number" && opts.burstUsers > 0) {
    fields.push({ name: `Burst (${BURST_WINDOW_S}s)`, value: `**${opts.burstUsers}** vartotojai`, inline: true });
  }

  // "Kodėl klaida atėjo iki čia" — plain-Lithuanian reason
  const whyLine = (() => {
    if (isBurst) return `Burst: ${opts.burstUsers ?? "?"} vartotojai gavo klaidų per ${BURST_WINDOW_S}s → auto-lockdown.`;
    if (isLock) return `Pasiekta ${opts.criticalCount ?? "?"} kritinių per ${CRITICAL_WINDOW_MIN}min → auto-lockdown (${CRITICAL_THRESHOLD}).`;
    if (opts.level === "critical") return `Klaida atitinka kritinį šabloną (chunk/undefined/is not a function/OOM).`;
    return `Įspėjimas: nekritinė runtime klaida iš \`${opts.source ?? "?"}\`.`;
  })();
  fields.push({ name: "Kodėl pranešu", value: whyLine });

  if (opts.aiAnalysis) {
    const ai = opts.aiAnalysis;
    const pct = confidencePercent(ai.confidence);
    const severity = ai.severity_estimate ? String(ai.severity_estimate).toUpperCase() : opts.level.toUpperCase();
    fields.push({
      name: "AI diagnozė",
      value: trimText(ai.suspected_cause || "AI priežastis dar nenustatyta.", 900),
    });
    if (ai.suggested_file && ai.suggested_file !== "unknown") {
      fields.push({ name: "AI failas", value: `\`${trimText(ai.suggested_file, 180)}\``, inline: true });
    }
    fields.push({ name: "AI sunkumas", value: `**${severity}**${pct === null ? "" : ` · ${pct}%`}`, inline: true });
    if (ai.suggested_fix) {
      fields.push({ name: "AI fix", value: trimText(ai.suggested_fix, 1000) });
    }
    const prompt = typeof ai.raw_response?.prompt_for_agent === "string" ? ai.raw_response.prompt_for_agent : "";
    if (prompt) {
      fields.push({ name: "Lovable promptas", value: "```" + trimText(prompt, 850).replace(/```/g, "ʼʼʼ") + "```" });
    }
  }

  // Breadcrumbs — last few actions before crash
  if (opts.breadcrumbs && opts.breadcrumbs.length) {
    const lines = opts.breadcrumbs.slice(-8).map((b) => {
      const rel = b.t ? `${Math.round((Date.now() - b.t) / 1000)}s` : "?";
      const where = b.path ? ` @ ${b.path}` : "";
      return `• -${rel} [${b.kind ?? "?"}] ${(b.label ?? "").slice(0, 90)}${where}`;
    }).join("\n");
    fields.push({ name: "Vartotojo veiksmai prieš klaidą", value: "```" + lines.slice(0, 1000) + "```" });
  }

  // Top stack frame — where in code
  if (opts.stack) {
    const firstFrames = opts.stack.split("\n").slice(0, 4).join("\n");
    fields.push({ name: "Stack (viršus)", value: "```" + firstFrames.slice(0, 900) + "```" });
  }

  const description = opts.message.length > 1800 ? opts.message.slice(0, 1800) + "…" : opts.message;
  const barSize = isLock ? 10 : opts.level === "critical" ? 7 : 3;
  const bar = "█".repeat(barSize) + "░".repeat(10 - barSize);
  const impactLine = (() => {
    const p = opts.path ?? "";
    if (p.includes("/checkin")) return "🎯 Mokinys negali įsiregistruoti QR kodu";
    if (p.includes("/reservation") || p.includes("/organization/scan")) return "🎯 Sulūžta rezervacijos / patvirtinimo srautas";
    if (p.includes("/pdf") || p.includes("/verify")) return "🎯 PDF sertifikatas gali nepasirašyti";
    if (p.includes("/auth") || p.includes("/login") || p.includes("/register")) return "🎯 Vartotojas negali prisijungti / registruotis";
    return "🎯 Puslapis gali sulūžti mokiniams";
  })();
  const body = {
    username: "Socialinės Valandos · Monitor",
    avatar_url: "https://socialinesvalandos.dev/apple-touch-icon.png",
    embeds: [
      {
        author: {
          name: isLock ? "🔒 LOCKDOWN AKTYVUS" : "Auto-monitor · realtime",
          url: "https://socialinesvalandos.dev/admin/errors",
        },
        title,
        description:
          `\`${bar}\` **${isLock ? "P0" : opts.level === "critical" ? "P1" : "P3"}**\n` +
          `${impactLine}\n` +
          "```" + description.replace(/```/g, "ʼʼʼ") + "```",
        color,
        fields,
        timestamp: new Date().toISOString(),
        footer: {
          text: isLock
            ? "Automatinis lockdown · Reikalingas rankinis įsikišimas"
            : "Auto-monitor · Fingerprint-grouped · Route-weighted",
        },
        url: isLock
          ? "https://socialinesvalandos.dev/admin/lockdown"
          : "https://socialinesvalandos.dev/admin/errors",
      },
    ],
  };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.error("[discord] failed", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("[discord] threw", err);
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
  lockdownReason?: "critical-threshold" | "burst" | "flood" | null;
  digest?: { msg: string; count: number }[];
  aiAnalysis?: InlineAiAnalysis | null;
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
    ${(() => {
      const p = opts.path ?? "";
      const impact = p.includes("/checkin") ? "Mokinys negali įsiregistruoti QR kodu — valandos neįskaitomos"
        : p.includes("/reservation") || p.includes("/organization/scan") ? "Sulūžta rezervacijų / darbo patvirtinimo srautas"
        : p.includes("/pdf") || p.includes("/verify") ? "PDF sertifikatas gali nepasirašyti arba nepatikrinamas"
        : p.includes("/auth") || p.includes("/login") || p.includes("/register") ? "Vartotojas negali prisijungti arba užsiregistruoti"
        : "Puslapis gali užstrigti arba parodyti tuščią ekraną";
      const barColor = isLock ? "#ef4444" : isCrit ? "#f97316" : "#eab308";
      const barW = isLock ? 100 : isCrit ? 70 : 30;
      return `<div style="margin:0 0 22px;padding:16px 18px;background:linear-gradient(135deg,#0b1220,#020617);border:1px solid ${barColor}44;border-radius:14px">
        <div style="font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:${barColor};margin-bottom:8px">▸ Ką matys mokinys?</div>
        <div style="font-size:14px;color:#fff;line-height:1.5;margin-bottom:10px">${escapeHtml(impact)}</div>
        <div style="height:8px;background:#1e293b;border-radius:999px;overflow:hidden"><div style="height:100%;width:${barW}%;background:linear-gradient(90deg,${accent},${accent2})"></div></div>
      </div>`;
    })()}
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
      ${typeof opts.burstUsers === "number" && opts.burstUsers > 0 ? `<tr><td style="padding:8px 0;font-size:11px;color:#64748b;letter-spacing:.1em;text-transform:uppercase">Burst (90s)</td><td style="padding:8px 0"><span style="display:inline-block;padding:4px 12px;background:${accent}22;color:${accent};border-radius:999px;font-weight:800;font-size:12px">${opts.burstUsers} vartotojai</span></td></tr>` : ""}
      ${opts.lockdownReason ? `<tr><td style="padding:8px 0;font-size:11px;color:#64748b;letter-spacing:.1em;text-transform:uppercase">Priežastis</td><td style="padding:8px 0;font-size:12px;color:#e2e8f0"><code style="background:#020617;padding:3px 8px;border-radius:6px;border:1px solid #1e293b">${escapeHtml(opts.lockdownReason)}</code></td></tr>` : ""}
    </table>

    ${opts.aiAnalysis ? (() => {
      const ai = opts.aiAnalysis;
      const pct = confidencePercent(ai.confidence);
      const prompt = typeof ai.raw_response?.prompt_for_agent === "string" ? ai.raw_response.prompt_for_agent : "";
      return `<div style="margin-top:22px;padding:16px 18px;background:linear-gradient(135deg,#111827,#020617);border:1px solid #8b5cf666;border-radius:14px">
        <div style="font-size:10px;font-weight:800;color:#c4b5fd;letter-spacing:.18em;text-transform:uppercase;margin-bottom:10px">▸ AI analizė jau paruošta</div>
        ${ai.suspected_cause ? `<div style="font-size:13px;color:#f8fafc;line-height:1.6;margin-bottom:10px"><b>Priežastis:</b> ${escapeHtml(ai.suspected_cause)}</div>` : ""}
        <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
          ${ai.suggested_file ? `<tr><td style="padding:5px 0;font-size:11px;color:#94a3b8;width:90px">Failas</td><td style="padding:5px 0"><code style="color:#67e8f9;background:#020617;padding:3px 8px;border-radius:6px;border:1px solid #1e293b">${escapeHtml(ai.suggested_file)}</code></td></tr>` : ""}
          ${ai.severity_estimate ? `<tr><td style="padding:5px 0;font-size:11px;color:#94a3b8">Sunkumas</td><td style="padding:5px 0;color:#e2e8f0"><b>${escapeHtml(ai.severity_estimate)}</b>${pct === null ? "" : ` · ${pct}%`}</td></tr>` : ""}
        </table>
        ${ai.suggested_fix ? `<div style="font-size:11px;color:#94a3b8;font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px">Fix</div><pre style="margin:0 0 10px;padding:12px;background:#020617;border:1px solid #1e293b;border-radius:10px;white-space:pre-wrap;word-break:break-word;font-size:12px;line-height:1.55;color:#d1fae5;font-family:'JetBrains Mono',ui-monospace,monospace">${escapeHtml(ai.suggested_fix)}</pre>` : ""}
        ${prompt ? `<div style="font-size:11px;color:#94a3b8;font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px">Promptas Lovable agentui</div><pre style="margin:0;padding:12px;background:#020617;border:1px solid #312e81;border-radius:10px;white-space:pre-wrap;word-break:break-word;font-size:11px;line-height:1.5;color:#ddd6fe;font-family:'JetBrains Mono',ui-monospace,monospace">${escapeHtml(prompt)}</pre>` : ""}
      </div>`;
    })() : ""}

    ${opts.digest && opts.digest.length > 0 ? `
    <div style="margin-top:22px;padding:14px 16px;background:#020617;border:1px solid #1e293b;border-radius:12px">
      <div style="font-size:10px;font-weight:800;color:#94a3b8;letter-spacing:.18em;text-transform:uppercase;margin-bottom:10px">▸ Paskutinės 15 min · Top ${opts.digest.length} klaidų</div>
      ${opts.digest.map((d) => `
        <div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px dashed #1e293b;font-size:12px;color:#cbd5e1">
          <span style="font-family:'JetBrains Mono',ui-monospace,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(d.msg)}</span>
          <span style="flex-shrink:0;padding:2px 8px;background:${accent}22;color:${accent};border-radius:999px;font-weight:800;font-size:11px">×${d.count}</span>
        </div>`).join("")}
    </div>` : ""}


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
    // Explicit admin tests bypass every filter, rate limit and dedupe so the
    // super admin can prove the alert channels actually work end-to-end.
    const isTest = data.test === true;

    // Filter noise server-side too. UI freezes / slow API are telemetry only:
    // log them for debugging context, but never email, Discord, AI-analyze, or lockdown.
    if (!isTest && isTelemetryNoise(data.message)) {
      return { ok: true, ignored: true };
    }

    // Per-IP rate limit — stops an anonymous flood from tripping auto-lockdown
    // with three trivial requests. Beyond the cap we drop silently.
    let fp = "unknown";
    try {
      const req = getRequest();
      if (req) fp = clientFingerprint(req);
    } catch { /* ignore — SSR / missing request */ }
    // A flood is exactly when auto-lockdown must fire, so we never drop the
    // request outright. Rate limiting only silences the notification channels;
    // logging + lockdown evaluation always run.
    const rateLimited = !isTest && !checkRate(fp);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Compute one stable group ID before logging so every row, alert and AI
    // analysis points to the same fingerprint.
    const { fingerprint: computeFp } = await import("@/lib/error-fingerprint");
    const fpGroup = computeFp(data.message, data.stack ?? null);

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
        source: data.source ?? null,
        browser: data.browser ?? null,
        os: data.os ?? null,
        device: data.device ?? null,
        breadcrumbs: data.breadcrumbs ?? [],
        anon: authedUserId === null,
        fp,
        fingerprint: fpGroup.id,
        fingerprint_norm: fpGroup.norm,
        fingerprint_frame: fpGroup.frame,
      },
    });

    let lockdownTriggered = false;
    let lockdownReason: "critical-threshold" | "burst" | "flood" | null = null;
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
      if (!isTest && burstUsers >= BURST_MIN_USERS) {
        lockdownReason = "burst";
      }
    }

    // Critical threshold — count EVERY critical logged in the window, including
    // anonymous visitors. Previously only signed-in reports counted, so the UI
    // could show 7 criticals while the lockdown counter saw far fewer.
    if (data.level === "critical") {
      const since = new Date(Date.now() - CRITICAL_WINDOW_MIN * 60_000).toISOString();
      const { count } = await supabaseAdmin
        .from("activity_log")
        .select("*", { count: "exact", head: true })
        .eq("action", "app.critical")
        .gte("created_at", since);
      criticalCount = count ?? 0;
      if (!lockdownReason && !isTest && criticalCount >= CRITICAL_THRESHOLD) {
        lockdownReason = "critical-threshold";
      }
    }

    // FLOOD DETECTION — dozens of non-critical client errors in a few minutes is
    // itself an outage (this is what "50 klaidų, jokio lockdown" looked like).
    if (!lockdownReason && !isTest) {
      const floodSince = new Date(Date.now() - FLOOD_WINDOW_MIN * 60_000).toISOString();
      const { count: floodCount } = await supabaseAdmin
        .from("activity_log")
        .select("*", { count: "exact", head: true })
        .in("action", ["client.error", "supabase.error", "app.critical", "app.warning"])
        .gte("created_at", floodSince);
      if ((floodCount ?? 0) >= FLOOD_THRESHOLD) {
        lockdownReason = "flood";
        criticalCount = Math.max(criticalCount, floodCount ?? 0);
      }
    }

    if (lockdownReason) {
      const { data: ss } = await supabaseAdmin
        .from("site_settings")
        .select("lockdown_enabled")
        .eq("id", true)
        .maybeSingle();
      if (!ss?.lockdown_enabled) {
        const code = lockdownReason === "burst" ? "E-5002" : lockdownReason === "flood" ? "E-5003" : "E-5001";
        const msg = lockdownReason === "burst"
          ? `[auto] Aptikta ${burstUsers} vartotojų su klaidomis per ${BURST_WINDOW_S}s (burst). Prieiga ribojama.`
          : lockdownReason === "flood"
            ? `[auto] Aptikta ${criticalCount} klaidų per ${FLOOD_WINDOW_MIN} min (flood). Prieiga ribojama.`
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

    // Dedupe alerts by fingerprint within window (lockdown alerts bypass dedupe).
    // This stops one real bug from sending email+Discord again and again while
    // still keeping every occurrence logged for counters and lockdown.
    let shouldEmail = lockdownTriggered || isTest;
    if (!shouldEmail && rateLimited) {
      // Flood in progress: keep counting + locking down, but stop the spam.
      shouldEmail = false;
    } else if (!shouldEmail) {
      const dedupeSince = new Date(Date.now() - EMAIL_DEDUPE_MIN * 60_000).toISOString();
      const { count: emailedCount } = await supabaseAdmin
        .from("activity_log")
        .select("*", { count: "exact", head: true })
        .eq("action", "app.email_sent")
        .gte("created_at", dedupeSince)
        .eq("meta->>fingerprint", fpGroup.id);
      shouldEmail = (emailedCount ?? 0) === 0;
    }

    let aiAnalysis: InlineAiAnalysis | null = null;
    if (shouldEmail || lockdownTriggered) {
      try {
        const { autoAnalyzeAndAlert } = await import("@/lib/auto-ai-analyze.server");
        aiAnalysis = await autoAnalyzeAndAlert({
          fingerprint: fpGroup.id,
          message: data.message,
          stack: data.stack ?? null,
          path: data.path ?? null,
          userEmail: data.userEmail ?? null,
          level: data.level,
        });
      } catch (err) {
        console.error("[escalate] auto-ai failed", err);
      }
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
          aiAnalysis,
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
            fingerprint: fpGroup.id,
            ai: aiAnalysis ? {
              suspected_cause: aiAnalysis.suspected_cause ?? null,
              suggested_file: aiAnalysis.suggested_file ?? null,
              severity_estimate: aiAnalysis.severity_estimate ?? null,
              confidence: confidencePercent(aiAnalysis.confidence),
            } : null,
          },
        });
      }

      await sendDiscordAlert({
        level: data.level,
        lockdown: lockdownTriggered,
        lockdownReason,
        message: data.message,
        path: data.path,
        userEmail: data.userEmail,
        criticalCount,
        burstUsers,
        fingerprint: fpGroup.id,
        source: data.source,
        browser: data.browser,
        os: data.os,
        device: data.device,
        stack: data.stack,
        breadcrumbs: data.breadcrumbs,
        aiAnalysis,
      });
    }

    return { ok: true, lockdownTriggered, lockdownReason, criticalCount, burstUsers };
  });

// -----------------------------------------------------------------------------
// TEST ALERT — bypasses IGNORE_RX, rate limit, and dedupe. Admin-only.
// Modes: 'discord' | 'email' | 'both' | 'lockdown-sim' (email+discord but no
// actual lockdown flip). Returns which channels fired so the UI can show it.
// -----------------------------------------------------------------------------
const testAlertSchema = z.object({
  mode: z.enum(["discord", "email", "both", "lockdown-sim"]),
});

export const sendTestAlert = createServerFn({ method: "POST" })
  .validator((v: unknown) => testAlertSchema.parse(v))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Admin gate — use bearer from request (server fn is called from admin UI only,
    // but double-check to prevent abuse if someone finds the RPC path).
    let callerEmail: string | null = null;
    try {
      const req = getRequest();
      const auth = req?.headers.get("authorization") ?? "";
      const token = auth.replace(/^Bearer\s+/i, "");
      if (token) {
        const { data: u } = await supabaseAdmin.auth.getUser(token);
        callerEmail = u.user?.email ?? null;
        if (u.user?.id) {
          const { data: prof } = await supabaseAdmin
            .from("profiles").select("role").eq("id", u.user.id).maybeSingle();
          if ((prof as { role?: string } | null)?.role !== "admin") {
            return { ok: false, error: "not_admin" as const };
          }
        } else {
          return { ok: false, error: "not_authenticated" as const };
        }
      } else {
        return { ok: false, error: "no_token" as const };
      }
    } catch {
      return { ok: false, error: "auth_check_failed" as const };
    }

    const isLock = data.mode === "lockdown-sim";
    const level: "critical" | "warning" = isLock || data.mode !== "email" ? "critical" : "warning";
    const stamp = new Date().toLocaleTimeString("lt-LT");
    const message = isLock
      ? `[TEST-LOCKDOWN-SIM] Simuliacija: kritinis slenkstis pasiektas — ${stamp}`
      : `[TEST-ALERT] Testinė signalizacija — ${stamp}. Jei tai matai — sistema veikia.`;

    let discordOk = false;
    let discordError: string | null = null;
    let emailOk = false;
    let emailRecipients = 0;
    let emailError: string | null = null;

    // Discord
    if (data.mode === "discord" || data.mode === "both" || data.mode === "lockdown-sim") {
      const url = process.env.DISCORD_WEBHOOK_URL;
      if (!url) {
        discordError = "DISCORD_WEBHOOK_URL not configured";
      } else {
        try {
          await sendDiscordAlert({
            level,
            lockdown: isLock,
            lockdownReason: isLock ? "critical-threshold" : null,
            message,
            path: "/admin/errors",
            userEmail: callerEmail ?? undefined,
            criticalCount: isLock ? CRITICAL_THRESHOLD : 0,
            burstUsers: 0,
            fingerprint: "test-alert",
          });
          discordOk = true;
        } catch (err) {
          discordError = err instanceof Error ? err.message : "unknown";
        }
      }
    }

    // Email
    if (data.mode === "email" || data.mode === "both" || data.mode === "lockdown-sim") {
      const key = process.env.RESEND_API_KEY;
      if (!key) {
        emailError = "RESEND_API_KEY not configured";
      } else {
        try {
          const { data: admins } = await supabaseAdmin
            .from("profiles")
            .select("email")
            .eq("role", "admin");
          const recipients = (admins ?? [])
            .map((a: { email: string | null }) => a.email)
            .filter((e): e is string => !!e);
          emailRecipients = recipients.length;
          if (recipients.length) {
            const subject = isLock
              ? "🧪 [TEST] LOCKDOWN SIMULIACIJA · Socialinės Valandos"
              : "🧪 [TEST] Testinis signalas · Socialinės Valandos";
            const html = alertEmailHtml({
              level: "critical",
              message,
              path: "/admin/errors",
              userEmail: callerEmail ?? undefined,
              userAgent: "TestAlert · Admin manual trigger",
              lockdown: isLock,
              criticalCount: isLock ? CRITICAL_THRESHOLD : 0,
              lockdownReason: isLock ? "critical-threshold" : null,
              digest: [
                { msg: "Testinė žinutė A", count: 5 },
                { msg: "Testinė žinutė B", count: 3 },
                { msg: "Testinė žinutė C", count: 2 },
              ],
            });
            await Promise.all(
              recipients.map((to) => sendResendEmail(to, subject, html, { urgent: true })),
            );
            emailOk = true;
          } else {
            emailError = "no admin recipients";
          }
        } catch (err) {
          emailError = err instanceof Error ? err.message : "unknown";
        }
      }
    }

    await supabaseAdmin.from("activity_log").insert({
      action: "app.test_alert",
      entity_type: "auto-monitor",
      meta: {
        mode: data.mode,
        discord_ok: discordOk,
        discord_error: discordError,
        email_ok: emailOk,
        email_recipients: emailRecipients,
        email_error: emailError,
        by: callerEmail,
      },
    });

    return {
      ok: true,
      mode: data.mode,
      discord: { ok: discordOk, error: discordError },
      email: { ok: emailOk, recipients: emailRecipients, error: emailError },
      hasDiscordWebhook: !!process.env.DISCORD_WEBHOOK_URL,
      hasResend: !!process.env.RESEND_API_KEY,
    };
  });


