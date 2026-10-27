import { renderShell, metaGrid, APP_URL, escape } from "./_shell";

type Props = {
  studentName: string;
  orgName: string;
  hours: number;
  date: string;
  totalHours: number;
  neededHours: number;
  location?: string;
  avatarUrl?: string | null;
  initial?: string;
};

export function renderHoursConfirmedEmail(p: Props): string {
  const progress = p.neededHours > 0 ? Math.min(100, Math.round((p.totalHours / p.neededHours) * 100)) : 0;
  const remaining = Math.max(0, p.neededHours - p.totalHours);
  const done = remaining === 0 && p.neededHours > 0;

  return renderShell({
    title: "Valandos patvirtintos",
    preview: `${p.orgName} patvirtino tavo darbą — +${p.hours} val.`,
    accent: "emerald",
    eyebrow: "Patvirtinta",
    medallionEmoji: "✓",
    userAvatar: p.avatarUrl,
    userInitial: p.initial,
    heading: `Sveikas, ${escape(p.studentName)} 🎉`,
    bodyHtml: `
      <b style="color:#334155;">${escape(p.orgName)}</b> ką tik teisiškai patvirtino tavo atliktą darbą.
      Valandos automatiškai įskaitytos į tavo profilį ir persiųstos mokyklos administracijai.
      
      <div style="margin:28px auto 0;display:inline-block;padding:2px;border-radius:22px;background:linear-gradient(135deg,#0ea5e9,#22d3ee,#10b981);">
        <div style="padding:18px 34px;border-radius:20px;background:#ffffff;">
          <div style="font-size:11px;font-weight:700;letter-spacing:.18em;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Įskaityta</div>
          <div style="font-size:44px;font-weight:900;line-height:1;color:#10b981;">+${p.hours} val.</div>
        </div>
      </div>
    `,
    ctaLabel: "Peržiūrėti profilyje",
    ctaHref: `${APP_URL}/student`,
    extraBlocksHtml: `
      <!-- Progress card -->
      <tr><td style="padding-top:24px;">
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:22px; padding:24px 26px;">
          <table width="100%" style="margin-bottom:14px;">
            <tr>
              <td style="font-size:13px;font-weight:700;color:#334155;letter-spacing:.02em;">Tavo pažanga</td>
              <td align="right" style="font-size:13px;font-weight:800;color:#a5b4fc;">${p.totalHours} / ${p.neededHours} val.</td>
            </tr>
          </table>
          <div style="height:14px;border-radius:999px;background:#e2e8f0;border:1px solid rgba(148,163,184,.12);overflow:hidden;">
            <div style="height:100%;width:${progress}%;border-radius:999px;background:linear-gradient(90deg,#0ea5e9 0%,#22d3ee 55%,#10b981 100%);"></div>
          </div>
          <p style="margin:14px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
            ${done
              ? `🏆 <b style="color:#6ee7b7;">Puiku! Įvykdei visą reikalavimą.</b> Gali generuoti PDF sertifikatą savo profilyje.`
              : `Liko dar <b style="color:#f8fafc;">${remaining} val.</b> iki tikslo. Nebijok — jau esi ${progress}% kelio.`}
          </p>
        </div>
      </td></tr>
      ${metaGrid([
        { label: "Data", value: p.date },
        { label: "Vieta", value: p.location ?? "—" }
      ])}
    `
  });
}
