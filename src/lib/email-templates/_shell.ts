// Shared shell + primitives for premium 3D-feeling emails.
// Inline-styles only. Layered gradients + soft shadow rings = depth on Apple Mail / Gmail Web.

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
  extraBlocksHtml?: string;
};

const ACCENTS: Record<ShellOptions["accent"], { chip: string; glow: string; med: string; text: string }> = {
  emerald: {
    chip: "linear-gradient(135deg,#6366f1,#22d3ee,#10b981)",
    glow: "rgba(16,185,129,.55)",
    med: "linear-gradient(135deg,#10b981 0%,#059669 45%,#047857 100%)",
    text: "#6ee7b7",
  },
  indigo: {
    chip: "linear-gradient(135deg,#8b5cf6,#6366f1,#22d3ee)",
    glow: "rgba(99,102,241,.55)",
    med: "linear-gradient(135deg,#818cf8 0%,#6366f1 45%,#4f46e5 100%)",
    text: "#a5b4fc",
  },
  rose: {
    chip: "linear-gradient(135deg,#f472b6,#f43f5e,#f97316)",
    glow: "rgba(244,63,94,.5)",
    med: "linear-gradient(135deg,#fb7185 0%,#f43f5e 45%,#e11d48 100%)",
    text: "#fda4af",
  },
  amber: {
    chip: "linear-gradient(135deg,#fbbf24,#f59e0b,#ef4444)",
    glow: "rgba(245,158,11,.5)",
    med: "linear-gradient(135deg,#fcd34d 0%,#f59e0b 45%,#d97706 100%)",
    text: "#fcd34d",
  },
};

export function renderShell(opts: ShellOptions): string {
  const a = ACCENTS[opts.accent];
  return `<!doctype html>
<html lang="lt"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escape(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#e6ecff;">
  <div style="display:none;visibility:hidden;opacity:0;overflow:hidden;mso-hide:all;height:0;width:0;font-size:1px;color:#0a0f1e;">${escape(opts.preview)}</div>
  <div style="background:radial-gradient(1200px 600px at 15% -10%,rgba(99,102,241,.35),transparent 60%),radial-gradient(900px 500px at 100% 0%,${a.glow.replace(".55",".28").replace(".5",".22")},transparent 55%),#0a0f1e;padding:40px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;">
      <tr><td style="padding:0 4px 20px;">
        <table width="100%"><tr>
          <td style="font-weight:800;font-size:14px;letter-spacing:.14em;color:#a5b4fc;text-transform:uppercase;">◆ Socialinės Valandos</td>
          <td align="right" style="font-size:12px;color:#64748b;">${new Date().toLocaleDateString("lt-LT")}</td>
        </tr></table>
      </td></tr>

      <tr><td style="
        background:linear-gradient(160deg,#111a35 0%,#0e1730 55%,#0b1226 100%);
        border:1px solid rgba(148,163,184,.15);
        border-radius:28px;
        padding:44px 32px 36px;
        box-shadow:0 30px 80px -20px ${a.glow},0 8px 24px -8px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06);
        text-align:center;
      ">
        <div style="
          width:96px;height:96px;margin:0 auto 24px;border-radius:50%;
          background:radial-gradient(circle at 30% 25%,rgba(255,255,255,.35),transparent 45%),${a.med};
          box-shadow:0 20px 40px -10px ${a.glow},inset 0 -6px 12px rgba(0,0,0,.25),inset 0 2px 4px rgba(255,255,255,.35);
          line-height:96px;font-size:42px;color:#fff;font-weight:900;
        ">${opts.medallionEmoji}</div>

        <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.2em;color:${a.text};text-transform:uppercase;">${escape(opts.eyebrow)}</p>
        <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;font-weight:800;color:#f8fafc;">${opts.heading}</h1>
        <div style="margin:0 auto;max-width:460px;font-size:15px;line-height:1.65;color:#94a3b8;">${opts.bodyHtml}</div>
      </td></tr>

      ${opts.extraBlocksHtml ?? ""}

      <tr><td align="center" style="padding:28px 0 8px;">
        <a href="${escape(opts.ctaHref)}" style="
          display:inline-block;padding:16px 36px;border-radius:16px;
          background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 55%,#22d3ee 100%);
          color:#fff;font-weight:800;font-size:15px;letter-spacing:.02em;text-decoration:none;
          box-shadow:0 20px 40px -12px rgba(99,102,241,.7),0 6px 12px -4px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.25);
        ">${escape(opts.ctaLabel)} →</a>
      </td></tr>

      <tr><td style="padding:28px 8px 0;text-align:center;font-size:12px;color:#64748b;line-height:1.7;">
        Automatinis pranešimas iš Socialinės Valandos platformos.<br/>
        Klausimai? <a href="mailto:${SUPPORT_EMAIL}" style="color:#a5b4fc;text-decoration:none;">${SUPPORT_EMAIL}</a>
        <div style="margin-top:14px;height:1px;background:linear-gradient(90deg,transparent,rgba(148,163,184,.25),transparent);"></div>
        <div style="margin-top:14px;color:#475569;">© ${new Date().getFullYear()} Socialinės Valandos · <a href="${APP_URL}" style="color:#64748b;text-decoration:none;">socialinesvalandos.dev</a></div>
      </td></tr>
    </table>
  </div>
</body></html>`;
}

export function metaGrid(items: Array<{ label: string; value: string }>): string {
  return `<tr><td style="padding-top:16px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      ${items
        .map(
          (it, i) => `<td width="${Math.floor(100 / items.length)}%" style="padding:0 ${i === 0 ? "8px 0 0" : i === items.length - 1 ? "0 0 0 8px" : "0 8px"};">
        <div style="background:#111a35;border:1px solid rgba(148,163,184,.15);border-radius:16px;padding:14px 16px;">
          <div style="font-size:10px;font-weight:800;letter-spacing:.18em;color:#64748b;text-transform:uppercase;">${escape(it.label)}</div>
          <div style="margin-top:4px;font-size:14px;font-weight:700;color:#e2e8f0;">${escape(it.value)}</div>
        </div>
      </td>`,
        )
        .join("")}
    </tr></table>
  </td></tr>`;
}
