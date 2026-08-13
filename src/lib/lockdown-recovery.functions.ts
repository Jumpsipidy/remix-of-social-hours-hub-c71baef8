// Auto-recovery: if lockdown was auto-triggered (E-5001 / E-5002 / E-4002)
// AND at least COOLDOWN_MIN minutes passed AND no critical errors in the
// SILENT_MIN window → automatically disable lockdown + email admins.
//
// Called from LockdownGate polling (every 60s). Server-side throttle prevents
// hammering; anonymous callers are fine — we only ever *disable* lockdown,
// never enable it here.
import { createServerFn } from "@tanstack/react-start";

const AUTO_CODES = new Set(["E-5001", "E-5002", "E-5003", "E-4002"]);
const COOLDOWN_MIN = 10; // lockdown must have been set at least this long ago
const SILENT_MIN = 10;   // no new critical errors in this window
const THROTTLE_MS = 60_000; // don't re-check more than once per minute per worker

let lastCheck = 0;

async function sendRecoveryEmail(to: string, code: string, silentMin: number) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const html = `
  <div style="font-family:-apple-system,system-ui,sans-serif;max-width:520px;margin:auto;background:#0a0f1e;color:#e2e8f0;padding:32px;border-radius:16px">
    <div style="display:inline-block;padding:6px 14px;background:#10b98122;color:#10b981;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase">Auto-atkūrimas</div>
    <h1 style="margin:20px 0 8px;font-size:24px;color:#fff">🔓 Lockdown atkurtas automatiškai</h1>
    <p style="color:#94a3b8;line-height:1.6;margin:0 0 20px">
      Kodas <b style="color:#10b981">${code}</b> nustotas — per pastarąsias ${silentMin} min nebuvo naujų kritinių klaidų, o lockdown buvo aktyvus daugiau nei ${COOLDOWN_MIN} min.
      Svetainė vėl pasiekiama vartotojams.
    </p>
    <p style="color:#64748b;font-size:12px;margin-top:24px">
      Jei tai buvo klaidingas atkūrimas, gali vėl įjungti lockdown čia:<br/>
      <a href="https://socialinesvalandos.dev/admin/lockdown" style="color:#38bdf8">socialinesvalandos.dev/admin/lockdown</a>
    </p>
  </div>`;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: "Socialinės Valandos Alerts <alerts@jumpsipidy.online>",
        to,
        subject: `🔓 Lockdown auto-atkurtas · ${code}`,
        html,
        tags: [{ name: "kind", value: "auto-recovery" }],
      }),
    });
  } catch { /* swallow */ }
}

export const tryLockdownAutoRecovery = createServerFn({ method: "POST" }).handler(async () => {
  const now = Date.now();
  if (now - lastCheck < THROTTLE_MS) {
    return { ok: true, skipped: "throttled" as const };
  }
  lastCheck = now;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: settings } = await supabaseAdmin
    .from("site_settings")
    .select("lockdown_enabled, lockdown_code, updated_at")
    .eq("id", true)
    .maybeSingle();

  if (!settings?.lockdown_enabled) return { ok: true, skipped: "not-locked" as const };
  const code = (settings as { lockdown_code: string | null }).lockdown_code ?? "";
  if (!AUTO_CODES.has(code)) return { ok: true, skipped: "manual-lockdown" as const };

  const setAtMs = new Date((settings as { updated_at: string }).updated_at).getTime();
  const ageMin = (now - setAtMs) / 60_000;
  if (ageMin < COOLDOWN_MIN) {
    return { ok: true, skipped: "cooldown" as const, ageMin: Math.round(ageMin) };
  }

  // Only escalated critical incidents block recovery. Raw client.error rows
  // include duplicate console/fetch capture and previously kept E-5003 locked
  // forever even after the actual incident had ended.
  const silentSince = new Date(now - SILENT_MIN * 60_000).toISOString();
  const { count } = await supabaseAdmin
    .from("activity_log")
    .select("*", { count: "exact", head: true })
    .eq("action", "app.critical")
    .not("user_id", "is", null)
    .gte("created_at", silentSince);

  if ((count ?? 0) > 0) {
    return { ok: true, skipped: "recent-errors" as const, recentCount: count };
  }

  // All clear — disable lockdown
  await supabaseAdmin.from("site_settings").upsert({
    id: true,
    lockdown_enabled: false,
    lockdown_code: null,
    lockdown_message: null,
    updated_at: new Date().toISOString(),
  });

  await supabaseAdmin.from("activity_log").insert({
    action: "app.auto_recovery",
    entity_type: "lockdown",
    meta: {
      previous_code: code,
      lockdown_age_min: Math.round(ageMin),
      silent_window_min: SILENT_MIN,
    },
  });

  // Email admins
  const { data: admins } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("role", "admin");
  const recipients = (admins ?? [])
    .map((a: { email: string | null }) => a.email)
    .filter((e): e is string => !!e);
  await Promise.all(recipients.map((to) => sendRecoveryEmail(to, code, SILENT_MIN)));

  return {
    ok: true,
    recovered: true,
    previousCode: code,
    lockdownAgeMin: Math.round(ageMin),
    emailedAdmins: recipients.length,
  };
});
