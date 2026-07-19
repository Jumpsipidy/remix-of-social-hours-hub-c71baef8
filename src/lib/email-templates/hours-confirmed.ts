// Modern, gradient-heavy, "3D-feeling" transactional email.
// Uses inline styles only (email-client safe). Layered gradients + soft
// shadows produce depth on Apple Mail / Gmail web; falls back gracefully.

type Props = {
  studentName: string;
  orgName: string;
  hours: number;
  date: string;
  totalHours: number;
  neededHours: number;
  location?: string;
};

const APP_URL = "https://socialinesvalandos.lt";

export function renderHoursConfirmedEmail(p: Props): string {
  const progress = p.neededHours > 0 ? Math.min(100, Math.round((p.totalHours / p.neededHours) * 100)) : 0;
  const remaining = Math.max(0, p.neededHours - p.totalHours);
  const done = remaining === 0 && p.neededHours > 0;

  return `<!doctype html>
<html lang="lt">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Valandos patvirtintos</title>
</head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#e6ecff;">
  <!-- Ambient background -->
  <div style="background:radial-gradient(1200px 600px at 15% -10%,rgba(99,102,241,.35),transparent 60%),radial-gradient(900px 500px at 100% 0%,rgba(16,185,129,.28),transparent 55%),#0a0f1e;padding:40px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;">
      <!-- Logo strip -->
      <tr><td style="padding:0 4px 20px;">
        <table width="100%"><tr>
          <td style="font-weight:800;font-size:14px;letter-spacing:.14em;color:#a5b4fc;text-transform:uppercase;">◆ Socialinės Valandos</td>
          <td align="right" style="font-size:12px;color:#64748b;">${escape(p.date)}</td>
        </tr></table>
      </td></tr>

      <!-- Hero card (3D feel via layered gradient + shadow ring) -->
      <tr><td style="
        background:linear-gradient(160deg,#111a35 0%,#0e1730 55%,#0b1226 100%);
        border:1px solid rgba(148,163,184,.15);
        border-radius:28px;
        padding:44px 32px 36px;
        box-shadow:0 30px 80px -20px rgba(79,70,229,.45),0 8px 24px -8px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06);
        text-align:center;
        position:relative;
      ">
        <!-- Medallion -->
        <div style="
          width:96px;height:96px;margin:0 auto 24px;border-radius:50%;
          background:
            radial-gradient(circle at 30% 25%,rgba(255,255,255,.35),transparent 45%),
            linear-gradient(135deg,#10b981 0%,#059669 45%,#047857 100%);
          box-shadow:0 20px 40px -10px rgba(16,185,129,.55),inset 0 -6px 12px rgba(0,0,0,.25),inset 0 2px 4px rgba(255,255,255,.35);
          line-height:96px;font-size:44px;color:#fff;font-weight:900;
        ">✓</div>

        <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.2em;color:#6ee7b7;text-transform:uppercase;">Valandos patvirtintos</p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.15;font-weight:800;color:#f8fafc;">
          Sveikas, ${escape(p.studentName)} 🎉
        </h1>
        <p style="margin:0 auto;max-width:440px;font-size:15px;line-height:1.6;color:#94a3b8;">
          <b style="color:#e2e8f0;">${escape(p.orgName)}</b> ką tik teisiškai patvirtino tavo atliktą darbą.
          Valandos automatiškai įskaitytos į tavo profilį ir persiųstos mokyklos administracijai.
        </p>

        <!-- Big hours "chip" -->
        <div style="margin:28px auto 0;display:inline-block;padding:2px;border-radius:22px;background:linear-gradient(135deg,#6366f1,#22d3ee,#10b981);box-shadow:0 20px 40px -12px rgba(34,211,238,.45);">
          <div style="padding:18px 34px;border-radius:20px;background:#0b1226;">
            <div style="font-size:11px;font-weight:700;letter-spacing:.18em;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Įskaityta</div>
            <div style="font-size:44px;font-weight:900;line-height:1;background:linear-gradient(135deg,#a5b4fc,#67e8f9,#6ee7b7);-webkit-background-clip:text;background-clip:text;color:transparent;">+${p.hours} val.</div>
          </div>
        </div>
      </td></tr>

      <!-- Spacer -->
      <tr><td style="height:16px;"></td></tr>

      <!-- Progress card -->
      <tr><td style="
        background:linear-gradient(180deg,#111a35 0%,#0d1530 100%);
        border:1px solid rgba(148,163,184,.15);
        border-radius:22px;padding:24px 26px;
        box-shadow:0 10px 30px -12px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.04);
      ">
        <table width="100%" style="margin-bottom:14px;">
          <tr>
            <td style="font-size:13px;font-weight:700;color:#e2e8f0;letter-spacing:.02em;">Tavo pažanga</td>
            <td align="right" style="font-size:13px;font-weight:800;color:#a5b4fc;">${p.totalHours} / ${p.neededHours} val.</td>
          </tr>
        </table>
        <!-- Progress bar -->
        <div style="height:14px;border-radius:999px;background:#0b1226;border:1px solid rgba(148,163,184,.12);overflow:hidden;box-shadow:inset 0 2px 6px rgba(0,0,0,.5);">
          <div style="height:100%;width:${progress}%;border-radius:999px;background:linear-gradient(90deg,#6366f1 0%,#22d3ee 55%,#10b981 100%);box-shadow:0 0 20px rgba(99,102,241,.55);"></div>
        </div>
        <p style="margin:14px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
          ${done
            ? `🏆 <b style="color:#6ee7b7;">Puiku! Įvykdei visą reikalavimą.</b> Gali generuoti PDF sertifikatą savo profilyje.`
            : `Liko dar <b style="color:#f8fafc;">${remaining} val.</b> iki tikslo. Nebijok — jau esi ${progress}% kelio.`}
        </p>
      </td></tr>

      <!-- Meta grid -->
      <tr><td style="padding-top:16px;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="50%" style="padding-right:8px;">
            <div style="background:#111a35;border:1px solid rgba(148,163,184,.15);border-radius:16px;padding:14px 16px;">
              <div style="font-size:10px;font-weight:800;letter-spacing:.18em;color:#64748b;text-transform:uppercase;">Data</div>
              <div style="margin-top:4px;font-size:14px;font-weight:700;color:#e2e8f0;">${escape(p.date)}</div>
            </div>
          </td>
          <td width="50%" style="padding-left:8px;">
            <div style="background:#111a35;border:1px solid rgba(148,163,184,.15);border-radius:16px;padding:14px 16px;">
              <div style="font-size:10px;font-weight:800;letter-spacing:.18em;color:#64748b;text-transform:uppercase;">Vieta</div>
              <div style="margin-top:4px;font-size:14px;font-weight:700;color:#e2e8f0;">${escape(p.location ?? "—")}</div>
            </div>
          </td>
        </tr></table>
      </td></tr>

      <!-- CTA -->
      <tr><td align="center" style="padding:28px 0 8px;">
        <a href="${APP_URL}/student" style="
          display:inline-block;padding:16px 36px;border-radius:16px;
          background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 55%,#22d3ee 100%);
          color:#fff;font-weight:800;font-size:15px;letter-spacing:.02em;text-decoration:none;
          box-shadow:0 20px 40px -12px rgba(99,102,241,.7),0 6px 12px -4px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.25);
        ">Peržiūrėti profilyje →</a>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:28px 8px 0;text-align:center;font-size:12px;color:#64748b;line-height:1.7;">
        Šis pranešimas išsiųstas automatiškai iš Socialinės Valandos sistemos.<br/>
        Jei tai klaida, susisiek su <a href="mailto:pagalba@socialinesvalandos.lt" style="color:#a5b4fc;text-decoration:none;">pagalba@socialinesvalandos.lt</a>
        <div style="margin-top:14px;height:1px;background:linear-gradient(90deg,transparent,rgba(148,163,184,.25),transparent);"></div>
        <div style="margin-top:14px;color:#475569;">© ${new Date().getFullYear()} Socialinės Valandos</div>
      </td></tr>
    </table>
  </div>
</body>
</html>`;
}

function escape(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
