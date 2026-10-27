// Shared shell for every Socialinės Valandos email.
// Light, calm card layout: brand header, big bulletproof button,
// fallback link, optional code box and a friendly footer.

export const APP_URL = "https://socialinesvalandos.dev";
export const SUPPORT_EMAIL = "pagalba@socialinesvalandos.dev";

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
  secondaryLabel?: string;
  secondaryHref?: string;
  extraBlocksHtml?: string;
  userAvatar?: string | null;
  userInitial?: string;
};

const THEMES: Record<ShellOptions["accent"], { primary: string; dark: string; soft: string; ink: string }> = {
  emerald: { primary: "#10b981", dark: "#047857", soft: "#ecfdf5", ink: "#065f46" },
  indigo: { primary: "#0ea5e9", dark: "#0369a1", soft: "#f0f9ff", ink: "#075985" },
  rose: { primary: "#f43f5e", dark: "#be123c", soft: "#fff1f2", ink: "#9f1239" },
  amber: { primary: "#f59e0b", dark: "#b45309", soft: "#fffbeb", ink: "#92400e" },
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Big monospace code box for one-time codes. */
export function codeBox(code: string, label = "Tavo kodas"): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0 4px;">
    <tr><td align="center" style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:16px;padding:18px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#64748b;">${escape(label)}</div>
      <div style="margin-top:6px;font-family:'SFMono-Regular',Consolas,monospace;font-size:30px;font-weight:800;letter-spacing:8px;color:#0f172a;">${escape(code)}</div>
    </td></tr>
  </table>`;
}

function button(href: string, label: string, bg: string, color: string, border: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
    <tr><td align="center" bgcolor="${bg}" style="border-radius:14px;background:${bg};border:1px solid ${border};">
      <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${escape(href)}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="25%" fillcolor="${bg}" stroke="f"><center style="color:${color};font-family:sans-serif;font-size:16px;font-weight:bold;">${escape(label)}</center></v:roundrect><![endif]-->
      <!--[if !mso]><!--><a href="${escape(href)}" class="cta-button" style="display:inline-block;padding:16px 36px;font-family:${FONT};font-size:16px;font-weight:700;color:${color};text-decoration:none;border-radius:14px;">${escape(label)} &rarr;</a><!--<![endif]-->
    </td></tr>
  </table>`;
}

export function renderShell(opts: ShellOptions): string {
  const t = THEMES[opts.accent] ?? THEMES.indigo;
  const year = new Date().getFullYear();
  const avatar = opts.userAvatar
    ? `<img src="${escape(opts.userAvatar)}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;border-radius:20px;object-fit:cover;" />`
    : `<div style="width:64px;height:64px;border-radius:20px;background:${t.soft};border:1px solid ${t.primary}33;font-size:30px;line-height:64px;text-align:center;color:${t.ink};font-weight:800;">${opts.userInitial ? escape(opts.userInitial) : opts.medallionEmoji}</div>`;

  return `<!doctype html>
<html lang="lt" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escape(opts.title ?? opts.heading)}</title>
  <style>
    a { color: ${t.dark}; }
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; }
      .card { padding: 32px 22px !important; border-radius: 0 !important; }
      .heading { font-size: 26px !important; }
      .cta-button { display: block !important; padding: 16px 20px !important; }
      .meta-grid-cell { display: block !important; width: 100% !important; padding: 0 0 10px 0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:${FONT};color:#0f172a;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#eef2f7;">${escape(opts.preview ?? opts.heading)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#eef2f7;">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="width:600px;max-width:600px;">

        <!-- Brand -->
        <tr><td style="padding:0 8px 18px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
            <td valign="middle" width="44"><div style="width:40px;height:40px;border-radius:12px;background:${t.primary};color:#ffffff;font-size:20px;line-height:40px;text-align:center;">&#10084;</div></td>
            <td valign="middle" style="padding-left:10px;font-size:16px;font-weight:800;letter-spacing:-0.2px;color:#0f172a;">Socialinės <span style="color:${t.dark};font-style:italic;font-family:Georgia,serif;">Valandos</span></td>
            <td valign="middle" align="right" style="font-size:12px;color:#64748b;"><a href="${APP_URL}" style="color:#64748b;text-decoration:none;">socialinesvalandos.dev</a></td>
          </tr></table>
        </td></tr>

        <!-- Card -->
        <tr><td class="card" style="background:#ffffff;border-radius:24px;padding:40px 44px;border:1px solid #e2e8f0;box-shadow:0 12px 40px rgba(15,23,42,0.06);">
          <div style="height:4px;width:56px;border-radius:4px;background:${t.primary};margin-bottom:28px;"></div>
          ${avatar}
          <div style="margin-top:22px;display:inline-block;padding:5px 12px;border-radius:999px;background:${t.soft};color:${t.ink};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">${escape(opts.eyebrow)}</div>
          <h1 class="heading" style="margin:14px 0 0;font-size:30px;line-height:1.2;font-weight:800;letter-spacing:-0.6px;color:#0f172a;">${opts.heading}</h1>
          <div style="margin-top:14px;font-size:16px;line-height:1.65;color:#334155;">${opts.bodyHtml}</div>

          <div style="margin-top:30px;">${button(opts.ctaHref, opts.ctaLabel, t.primary, "#ffffff", t.primary)}</div>
          ${opts.secondaryHref && opts.secondaryLabel ? `<div style="margin-top:12px;">${button(opts.secondaryHref, opts.secondaryLabel, "#ffffff", "#0f172a", "#cbd5e1")}</div>` : ""}

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:30px;">
            <tr><td style="background:#f8fafc;border-radius:14px;padding:14px 16px;font-size:12px;line-height:1.55;color:#64748b;">
              Mygtukas neveikia? Nukopijuok šią nuorodą į naršyklę:<br/>
              <a href="${escape(opts.ctaHref)}" style="color:${t.dark};word-break:break-all;">${escape(opts.ctaHref)}</a>
            </td></tr>
          </table>
        </td></tr>

        ${opts.extraBlocksHtml ? `<tr><td style="padding-top:14px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${opts.extraBlocksHtml}</table></td></tr>` : ""}

        <!-- Footer -->
        <tr><td align="center" style="padding:26px 16px 8px;font-size:12px;line-height:1.7;color:#94a3b8;">
          Klausimai? Parašyk <a href="mailto:${SUPPORT_EMAIL}" style="color:${t.dark};text-decoration:none;font-weight:600;">${SUPPORT_EMAIL}</a><br/>
          Gavai per klaidą? Tiesiog ignoruok šį laišką.<br/>
          © ${year} Socialinės Valandos · Jumpsipidy studios
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function metaGrid(items: Array<{ label: string; value: string }>): string {
  return `<tr><td>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      ${items.map((it, i) => `<td class="meta-grid-cell" width="${Math.floor(100 / items.length)}%" style="padding-right:${i < items.length - 1 ? "10px" : "0"};">
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:14px;text-align:center;">
          <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">${escape(it.label)}</div>
          <div style="margin-top:4px;font-size:15px;font-weight:700;color:#0f172a;">${escape(it.value)}</div>
        </div>
      </td>`).join("")}
    </tr></table>
  </td></tr>`;
}
