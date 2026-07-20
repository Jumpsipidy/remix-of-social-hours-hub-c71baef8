import { renderShell, metaGrid, APP_URL, escape } from "./_shell";

type Props = {
  studentName: string;
  orgName: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  hours: number;
  location?: string;
};

export function renderReservationApprovedEmail(p: Props): string {
  const time = p.startTime && p.endTime ? `${p.startTime.slice(0, 5)}–${p.endTime.slice(0, 5)}` : "—";
  const body = `
    <b style="color:#e2e8f0;">${escape(p.orgName)}</b> patvirtino tavo rezervaciją.<br/>
    Statusas: <span style="display:inline-block;margin-top:6px;padding:4px 12px;border-radius:999px;background:linear-gradient(135deg,#6366f1,#22d3ee);color:#fff;font-weight:700;font-size:12px;letter-spacing:.08em;">ON WORK</span><br/><br/>
    Ateik nurodytu laiku. Valandos bus įskaitytos tik po to, kai organizacija galutinai patvirtins darbo užbaigimą.
  `;
  const meta = metaGrid([
    { label: "Data", value: p.date },
    { label: "Laikas", value: time },
    { label: "Val.", value: `${p.hours}` },
  ]) + (p.location ? metaGrid([{ label: "Vieta", value: p.location }]) : "");

  return renderShell({
    title: "Rezervacija patvirtinta",
    preview: `${p.orgName} patvirtino tavo rezervaciją — ${p.date}, ${time}`,
    accent: "indigo",
    eyebrow: "Patvirtinta · On Work",
    medallionEmoji: "→",
    heading: `Rezervacija patvirtinta 🚀`,
    bodyHtml: body,
    extraBlocksHtml: meta,
    ctaLabel: "Atidaryti platformoje",
    ctaHref: `${APP_URL}/student`,
  });
}

export function reservationApprovedText(p: Props): string {
  return `Rezervacija patvirtinta.\n\n${p.orgName} patvirtino tavo užklausą.\nData: ${p.date}\nValandos: ${p.hours}\n${p.location ? `Vieta: ${p.location}\n` : ""}\nStatusas: ON WORK. Valandos bus įskaitytos po galutinio darbo patvirtinimo.\n\n${APP_URL}/student`;
}
