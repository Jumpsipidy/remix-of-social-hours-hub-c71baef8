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
<body style="margin:0;padding:0;background-color:#020617;font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;color:#f8fafc;">
  <div style="display:none;visibility:hidden;opacity:0;overflow:hidden;mso-hide:all;height:0;width:0;font-size:1px;color:#020617;">${escape(opts.preview)}</div>
  
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#020617;">
    <tr>
      <td align="center" style="padding:40px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="max-width:600px;">
          
          <!-- Header -->
          <tr>
            <td style="padding-bottom:32px; text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="left">
                    <span style="font-weight:900; font-size:20px; color:#fff; letter-spacing:-0.5px;">Socialinės<span style="color:${theme.primary};">Valandos</span></span>
                  </td>
                  <td align="right" class="hide-mobile">
                    <span style="font-size:12px; color:#64748b; font-weight:500;">${new Date().toLocaleDateString("lt-LT")}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td class="content-card" style="background-color:#0f172a; border:1px solid #1e293b; border-radius:32px; padding:60px 48px; position:relative; overflow:hidden;">
              
              <!-- Decorative Accent -->
              <div style="position:absolute; top:0; right:0; width:150px; height:150px; background:radial-gradient(circle at 100% 0%, ${theme.primary}22, transparent 70%);"></div>

              <!-- Medallion -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <div style="width:80px; height:80px; background-color:${theme.bg}; border:1px solid ${theme.primary}44; border-radius:24px; text-align:center; line-height:80px; font-size:40px; box-shadow:0 0 40px ${theme.primary}22;">
                      ${opts.medallionEmoji}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Eyebrow -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:12px;">
                <tr>
                  <td align="center">
                    <span style="font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:2px; color:${theme.primary};">${escape(opts.eyebrow)}</span>
                  </td>
                </tr>
              </table>

              <!-- Heading -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <h1 class="heading" style="margin:0; font-size:36px; font-weight:800; color:#fff; line-height:1.2; letter-spacing:-1px;">${opts.heading}</h1>
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:40px;">
                <tr>
                  <td align="center" style="font-size:16px; line-height:1.7; color:#94a3b8;">
                    ${opts.bodyHtml}
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${escape(opts.ctaHref)}" style="display:inline-block; padding:20px 48px; background-color:${theme.primary}; color:#fff; font-weight:800; font-size:16px; text-decoration:none; border-radius:100px; box-shadow:0 20px 40px ${theme.primary}33; transition:transform 0.2s ease;">
                      ${escape(opts.ctaLabel)}
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Extra Blocks -->
          ${opts.extraBlocksHtml ?? ""}

          <!-- Footer -->
          <tr>
            <td style="padding-top:48px; text-align:center;">
              <p style="font-size:14px; color:#475569; line-height:1.6; margin:0 0 24px 0;">
                Mokinių savanorystės ateitis Lietuvoje.<br/>
                Klausimai? Rašyk mums <a href="mailto:${SUPPORT_EMAIL}" style="color:${theme.primary}; text-decoration:none;">${SUPPORT_EMAIL}</a>
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
                <tr>
                  <td align="center" style="height:1px; background:linear-gradient(90deg, transparent, #1e293b, transparent);"></td>
                </tr>
              </table>
              <p style="font-size:12px; color:#334155; margin:0;">
                &copy; ${new Date().getFullYear()} Socialinės Valandos &bull; <a href="${APP_URL}" style="color:#475569; text-decoration:none;">socialinesvalandos.dev</a>
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
              <div style="background-color:#0f172a; border:1px solid #1e293b; border-radius:20px; padding:16px; text-align:center;">
                <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">${escape(it.label)}</div>
                <div style="font-size:16px; font-weight:700; color:#fff;">${escape(it.value)}</div>
              </div>
            </td>
          `).join("")}
        </tr>
      </table>
    </td>
  </tr>`;
}
