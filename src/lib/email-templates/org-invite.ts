import { renderShell, APP_URL, escape } from "./_shell";

type Props = {
  orgName: string;
};

export function renderOrgInviteEmail(p: Props): string {
  const body = `
    Kviečiame prisijungti prie <b style="color:#e2e8f0;">Socialinės Valandos</b> platformos — vieningos sistemos moksleivių savanorystei Lietuvoje.<br/><br/>
    
    <b>Kodėl verta prisijungti?</b><br/>
    • <b>Paprastas valdymas:</b> Skaitmenizuota socialinių valandų apskaita.<br/>
    • <b>Didesnis matomumas:</b> Raskite motyvuotus savanorius savo iniciatyvoms.<br/>
    • <b>Saugumas:</b> QR kodu grįsta verifikacija ir oficialūs sertifikatai.<br/><br/>
    
    Prisijunkite prie Šeduvos gimnazijos ir kitų bendruomenių jau šiandien!
  `;

  return renderShell({
    title: "Kvietimas prisijungti",
    preview: "Kviečiame prisijungti prie Socialinės Valandos platformos.",
    accent: "indigo",
    eyebrow: "Kvietimas",
    medallionEmoji: "🤝",
    heading: `Sveiki, ${escape(p.orgName)}!`,
    bodyHtml: body,
    ctaLabel: "Prisijungti dabar",
    ctaHref: `${APP_URL}/register`,
  });
}
