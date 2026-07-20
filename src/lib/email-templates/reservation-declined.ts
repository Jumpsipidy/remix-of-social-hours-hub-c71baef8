import { renderShell, metaGrid, APP_URL, escape } from "./_shell";

type Props = {
  studentName: string;
  orgName: string;
  date: string;
  reason?: string;
};

export function renderReservationDeclinedEmail(p: Props): string {
  const body = `
    Deja, <b style="color:#e2e8f0;">${escape(p.orgName)}</b> atmetė tavo rezervacijos užklausą.<br/><br/>
    Nesijaudink — platformoje yra daug kitų organizacijų. Pabandyk kitą užduotį arba pasiūlyk savo laiką kitai organizacijai.
  `;
  const extra = p.reason
    ? `<tr><td style="padding-top:16px;">
        <div style="background:#111a35;border:1px solid rgba(244,63,94,.25);border-radius:16px;padding:16px 18px;">
          <div style="font-size:10px;font-weight:800;letter-spacing:.18em;color:#fda4af;text-transform:uppercase;">Priežastis</div>
          <div style="margin-top:6px;font-size:14px;color:#e2e8f0;line-height:1.5;">${escape(p.reason)}</div>
        </div>
      </td></tr>`
    : metaGrid([{ label: "Data", value: p.date }]);

  return renderShell({
    title: "Rezervacija atmesta",
    preview: `${p.orgName} atmetė tavo užklausą — bandyk kitą`,
    accent: "rose",
    eyebrow: "Atmesta",
    medallionEmoji: "✕",
    heading: "Rezervacija atmesta",
    bodyHtml: body,
    extraBlocksHtml: extra,
    ctaLabel: "Rasti kitą užduotį",
    ctaHref: `${APP_URL}/tasks`,
  });
}

export function reservationDeclinedText(p: Props): string {
  return `Rezervacija atmesta.\n\n${p.orgName} atmetė tavo užklausą (${p.date}).\n${p.reason ? `Priežastis: ${p.reason}\n` : ""}\nRask kitą užduotį: ${APP_URL}/tasks`;
}
