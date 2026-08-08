import { renderShell, APP_URL, escape } from "./_shell";

type Props = {
  orgName: string;
  senderName?: string;
  variant?: 1 | 2 | 3 | 4 | 5;
};

export function renderOrgInviteEmail(p: Props): string {
  const variant = p.variant || 1;
  const orgName = escape(p.orgName);
  
  let body = "";
  let eyebrow = "KVIETIMAS";
  let heading = "";
  let medallion = "🤝";
  let accent: "indigo" | "emerald" | "rose" | "amber" = "indigo";

  if (variant === 1) {
    heading = `Sveiki, ${orgName}`;
    body = `
      Kviečiame tapti <b style="color:#fff;">Socialinės Valandos</b> partneriu. Mes kuriame skaidrią, saugią ir modernią ekosistemą moksleivių savanorystei Lietuvoje.<br/><br/>
      Jūsų organizacija galės lengvai rasti motyvuotus savanorius, patvirtinti valandas vienu paspaudimu ir matyti realią įtaką bendruomenei.
    `;
  } else if (variant === 2) {
    accent = "emerald";
    eyebrow = "BENDRADARBIAVIMAS";
    heading = "Kurkime ateitį";
    medallion = "✨";
    body = `
      Gerbiama <b style="color:#fff;">${orgName}</b> komanda,<br/><br/>
      Jaunoji karta ieško prasmingos veiklos, o Jūs turite ką pasiūlyti. Sujunkime jėgas! <br/><br/>
      Mūsų platforma padės moksleiviams rasti Jūsų iniciatyvas, o Jums — be vargo valdyti visus savanorystės procesus skaitmeninėje erdvėje.
    `;
  } else if (variant === 3) {
    accent = "amber";
    eyebrow = "INOVACIJA";
    heading = "Pamirškite popierius";
    medallion = "⚡";
    body = `
      Sveiki, ${orgName}!<br/><br/>
      Socialinių valandų lapų pildymas ranka yra praeitis. Prisijunkite prie <b style="color:#fff;">Socialinės Valandos</b> ir valdykite viską išmaniai.<br/><br/>
      • QR kodų verifikacija<br/>
      • Automatinės ataskaitos<br/>
      • Jokių klaidų ir padirbinėjimo
    `;
  } else if (variant === 4) {
    accent = "indigo";
    eyebrow = "BENDRUOMENĖ";
    heading = "Moksleiviai laukia Jūsų";
    medallion = "🏫";
    body = `
      Šeduvos gimnazijos moksleiviai aktyviai ieško galimybių prisidėti prie <b>${orgName}</b> veiklos.<br/><br/>
      Sukūrėme šią platformą, kad padėtume jiems lengviau Jus rasti. Prisijunkite, paskelbkite užduotį ir pamatykite, kaip greitai atsiras norinčių padėti!
    `;
  } else {
    accent = "rose";
    eyebrow = "SKAIDRUMAS";
    heading = "Patikimas standartas";
    medallion = "🛡️";
    body = `
      Mokinių savanorystė tampa skaidresnė. <b style="color:#fff;">Socialinės Valandos</b> užtikrina, kad kiekviena valanda būtų teisingai įskaityta.<br/><br/>
      Tapkite <b style="color:#fff;">${orgName}</b> sistemos dalimi ir užtikrinkite, kad Jūsų savanoriai gautų oficialų, kriptografiškai saugų patvirtinimą už savo gerus darbus.
    `;
  }

  return renderShell({
    title: "Kvietimas prisijungti",
    preview: "Kviečiame prisijungti prie Socialinės Valandos platformos.",
    accent,
    eyebrow,
    medallionEmoji: medallion,
    heading,
    bodyHtml: body,
    ctaLabel: "Pradėti dabar",
    ctaHref: `${APP_URL}/register?role=organization&invite=true`,
  });
}
