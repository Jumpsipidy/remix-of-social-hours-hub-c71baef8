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
      <b>Kodėl verta prisijungti?</b><br/>
      • <b style="color:#fff;">Saugumas:</b> Kriptografiškai pasirašyti sertifikatai užkerta kelią klastojimui.<br/>
      • <b style="color:#fff;">Efektyvumas:</b> Patvirtinkite valandas vienu nuskaitymu (QR kodas).<br/>
      • <b style="color:#fff;">Matomumas:</b> Jūsų organizacija bus matoma šimtams aktyvių Šeduvos gimnazijos moksleivių.
    `;
  } else if (variant === 2) {
    accent = "emerald";
    eyebrow = "BENDRADARBIAVIMAS";
    heading = "Kurkime ateitį kartu";
    medallion = "✨";
    body = `
      Gerbiama <b style="color:#fff;">${orgName}</b> komanda,<br/><br/>
      Jaunoji karta ieško prasmingos veiklos, o Jūs turite ką pasiūlyti. Mūsų platforma padeda sujungti socialiai atsakingas organizacijas su aktyviu jaunimu.<br/><br/>
      <b>Jūsų žingsniai:</b><br/>
      1. Užsiregistruokite per žemiau esantį mygtuką.<br/>
      2. Paskelbkite pirmąją savanorystės užduotį.<br/>
      3. Priimkite moksleivius ir patvirtinkite jų valandas programėlėje.
    `;
  } else if (variant === 3) {
    accent = "amber";
    eyebrow = "SKAITMENIZACIJA";
    heading = "Pamirškite popierius";
    medallion = "⚡";
    body = `
      Sveiki, ${orgName}!<br/><br/>
      Socialinių valandų lapų pildymas ranka yra praeitis. Prisijunkite prie <b style="color:#fff;">Socialinės Valandos</b> ir valdykite viską išmaniai.<br/><br/>
      Tai ne tik patogiau Jums, bet ir saugiau moksleiviams. Jokių pamestų lapų, jokių neįskaitomų parašų — tik gryna, skaitmenizuota savanorystė.
    `;
  } else if (variant === 4) {
    accent = "indigo";
    eyebrow = "BENDRUOMENĖ";
    heading = "Moksleiviai laukia Jūsų";
    medallion = "🏫";
    body = `
      Šeduvos gimnazijos moksleiviai aktyviai ieško galimybių prisidėti prie <b>${orgName}</b> veiklos.<br/><br/>
      Sukūrėme šią platformą, kad padėtume jaunimui lengviau rasti Jūsų iniciatyvas. Prisijunkite nemokamai ir padėkite mums auginti pilietišką bendruomenę kartu.
    `;
  } else {
    accent = "rose";
    eyebrow = "SKAIDRUMAS";
    heading = "Patikimas standartas";
    medallion = "🛡️";
    body = `
      Mokinių savanorystė tampa skaidresnė. <b style="color:#fff;">Socialinės Valandos</b> užtikrina, kad kiekviena valanda būtų teisingai įskaityta ir verifikuota.<br/><br/>
      Tapkite <b style="color:#fff;">${orgName}</b> sistemos dalimi ir užtikrinkite, kad Jūsų savanoriai gautų oficialų, saugų patvirtinimą už savo indėlį į visuomenę.
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
