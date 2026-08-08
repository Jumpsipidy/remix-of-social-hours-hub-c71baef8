// Shared shell + primitives for ultra-modern 2026-style interactive emails.
// Uses a clean, high-contrast, "Glass-SaaS" aesthetic.
// Deep blacks, vibrant accents, and modern typography (sans-serif).

export const APP_URL = "https://socialinesvalandos.dev";
export const SUPPORT_EMAIL = "pagalba@socialinesvalandos.lt";

export function escape(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type ShellOptions = {
  title: string;
  preview: string;
  accent: "emerald" | "indigo" | "rose" | "amber";
  eyebrow: string;
  medallionEmoji: string;
  heading: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaHref: string;
  extraBlocksHtml?: string;
};

const THEMES: Record<ShellOptions["accent"], { primary: string; secondary: string; light: string; bg: string }> = {
  emerald: {
    primary: "#10b981",
    secondary: "#059669",
    light: "#d1fae5",
    bg: "#064e3b"
  },
  indigo: {
    primary: "#6366f1",
    secondary: "#4f46e5",
    light: "#e0e7ff",
    bg: "#1e1b4b"
  },
  rose: {
    primary: "#f43f5e",
    secondary: "#e11d48",
    light: "#ffe4e6",
    bg: "#4c0519"
  },
  amber: {
    primary: "#f59e0b",
    secondary: "#d97706",
    light: "#fef3c7",
    bg: "#451a03"
  },
};

export function renderShell(opts: ShellOptions): string {
  const theme = THEMES[opts.accent];
  
  return `<!doctype html>
<html lang="lt">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escape(opts.title)}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 20px 10px !important; }
      .content-card { padding: 32px 20px !important; }
      .heading { font-size: 28px !important; }
      .hide-mobile { display: none !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#02010a;font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;color:#f5f3ff; text-align: center;">
  <div style="display:none;visibility:hidden;opacity:0;overflow:hidden;mso-hide:all;height:0;width:0;font-size:1px;color:#020617;">${escape(opts.preview)}</div>
  
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#02010a;">
    <tr>
      <td align="center" style="padding:40px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="max-width:600px; margin: 0 auto; text-align: left; background-color: #0d0c1d; border-radius: 40px; box-shadow: 0 40px 100px rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.08); overflow: hidden;">
          
          <!-- Header (Official Brand) -->
          <tr>
            <td style="padding: 40px 0; text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td align="center" valign="middle" style="padding-right: 14px;">
                          <div style="width: 52px; height: 52px; background: linear-gradient(135deg, #7DD3FC, #38BDF8); border-radius: 50%; text-align: center; box-shadow: 0 0 25px rgba(56, 189, 248, 0.4); border: 2px solid rgba(255,255,255,0.1);">
                            <!-- Using a simple, high-contrast text heart for bulletproof rendering -->
                            <div style="color: #0d0c1d; font-size: 30px; line-height: 52px; font-family: sans-serif; font-weight: bold;">❤</div>
                          </div>
                        </td>
                        <td align="left" valign="middle">
                          <div style="font-family: 'Inter', sans-serif; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                            <span style="display: block; font-size: 22px; line-height: 1.1; margin: 0; padding: 0;">SOCIALINĖS</span>
                            <span style="display: block; font-size: 22px; color: #7DD3FC; line-height: 1.1; margin: 0; padding: 0;">VALANDOS</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>




          <!-- Main Card (Modern Dark Theme) -->
          <tr>
            <td class="content-card" style="background-color:#0d0c1d; padding:60px 48px;">
              
              <!-- Top Glow Gradient (Simplified for email clients) -->
              <div style="font-size: 0; line-height: 0; height: 1px; width: 100%; background: linear-gradient(to right, transparent, ${theme.primary}33, transparent); margin-bottom: 40px;"></div>

              <!-- Medallion Floating Aesthetic -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td align="center" style="width:100px; height:100px; background:linear-gradient(135deg, ${theme.primary}, ${theme.secondary}); border-radius:30px; font-size:50px; line-height: 100px; text-align: center;">
                          ${opts.medallionEmoji}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Eyebrow Pill -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:16px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; background-color:${theme.primary}22; border:1px solid ${theme.primary}44; border-radius:100px;">
                      <tr>
                        <td style="padding:4px 12px; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:2.5px; color:${theme.primary};">
                          ${escape(opts.eyebrow)}
                        </td>
                      </tr>
                    </table>

              <!-- Heading -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <h1 class="heading" style="margin:0; font-size:42px; font-weight:900; color:#ffffff; line-height:1.1; letter-spacing:-1.5px;">${opts.heading}</h1>
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:48px;">
                <tr>
                  <td align="center" style="font-size:18px; line-height:1.6; color:#cbd5e1; font-weight:400;">
                    ${opts.bodyHtml}
                  </td>
                </tr>
              </table>

              <!-- CTA (Interactive 3D Look) -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- Stronger 3D interactive button -->
                    <a href="${escape(opts.ctaHref)}" style="display:inline-block; padding:22px 64px; background:linear-gradient(135deg, ${theme.primary}, ${theme.secondary}); color:#ffffff !important; font-weight:900; font-size:18px; text-decoration:none; border-radius:24px; box-shadow: 0 15px 35px ${theme.primary}66, inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -4px 10px rgba(0,0,0,0.3); text-transform:uppercase; letter-spacing:1px; border: 1px solid rgba(255,255,255,0.2); color: #ffffff;">
                      ${escape(opts.ctaLabel)}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Official Footnote -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:40px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
                <tr>
                  <td align="left" style="font-size:11px; color:#64748b; line-height: 1.4;">
                    <b>Oficialus pranešimas.</b> Šis laiškas yra Socialinės Valandos sistemos dalis. Duomenų saugumą užtikrina LR įstatymai ir pažangūs šifravimo algoritmai. Jei turite klausimų dėl teisinės atitikties arba norite gauti patikslinimų, <b>atsakykite tiesiai į šį laišką</b> — mūsų komanda pasirengusi padėti.<br/><br/>
                    Šis pranešimas yra teisiškai saistantis ir apsaugotas autorinių teisių.
                  </td>
                </tr>
              </table>


            </td>
          </tr>

          <!-- Extra Blocks -->
          ${opts.extraBlocksHtml ?? ""}

          <!-- Footer -->
          <tr>
            <td style="padding: 40px 0; text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <div style="width:40px; height:2px; background-color:rgba(255,255,255,0.1);"></div>
                  </td>
                </tr>
              </table>
              <p style="font-size:14px; color:#475569; font-weight:500; margin-bottom:12px;">
                socialinesvalandos.dev &bull; Oficialus Šeduvos gimnazijos partneris &bull; ${new Date().getFullYear()}
              </p>
              <p style="font-size:12px; color:#334155;">
                Jei gavote šį laišką per klaidą, tiesiog jį ignoruokite.<br/>
                Pagalba: <a href="mailto:${SUPPORT_EMAIL}" style="color:${theme.primary}; text-decoration:none;">${SUPPORT_EMAIL}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function metaGrid(items: Array<{ label: string; value: string }>): string {
  return `<tr>
    <td style="padding-top:24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          ${items.map((it, i) => `
            <td width="${Math.floor(100 / items.length)}%" style="padding-right:${i < items.length - 1 ? "12px" : "0"};">
              <div style="background-color:#0a0819; border:1px solid rgba(255,255,255,0.08); border-radius:20px; padding:16px; text-align:center;">
                <div style="font-size:10px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">${escape(it.label)}</div>
                <div style="font-size:16px; font-weight:700; color:#ffffff;">${escape(it.value)}</div>
              </div>
            </td>
          `).join("")}
        </tr>
      </table>
    </td>
  </tr>`;
}
