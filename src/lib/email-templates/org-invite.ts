import { renderShell, APP_URL, escape } from "./_shell";

type Props = {
  orgName: string;
  senderName?: string;
  variant?: 1 | 2 | 3 | 4 | 5;
};

export function renderOrgInviteEmail(p: Props): string {
  const variant = p.variant || 1;
  const orgName = escape(p.orgName);
  const supportEmail = "pagalba@socialinesvalandos.dev";

  let body = "";
  let eyebrow = "Kvietimas";
  let heading = `Sveiki, ${orgName}!`;
  let medallion = "🤝";

  if (variant === 1) {
    // Professional / Standard
    body = `
      Kviečiame prisijungti prie <b style="color:#e2e8f0;">Socialinės Valandos</b> platformos — vieningos sistemos moksleivių savanorystei Lietuvoje.<br/><br/>
      
      <b>Kodėl verta prisijungti?</b><br/>
      • <b>Paprastas valdymas:</b> Skaitmenizuota socialinių valandų apskaita.<br/>
      • <b>Didesnis matomumas:</b> Raskite motyvuotus savanorius savo iniciatyvoms.<br/>
      • <b>Saugumas:</b> QR kodu grįsta verifikacija ir oficialūs sertifikatai.<br/><br/>
      
      Prisijunkite prie Šeduvos gimnazijos ir kitų bendruomenių jau šiandien!
    `;
  } else if (variant === 2) {
    // Modern / Impact-focused
    eyebrow = "Bendradarbiavimas";
    heading = "Kurkime pokytį kartu";
    medallion = "✨";
    body = `
      Gerbiama <b>${orgName}</b> komanda,<br/><br/>
      Matome Jūsų indėlį į visuomeninę veiklą ir norime pasiūlyti įrankį, kuris padės Jums augti. 
      <b style="color:#e2e8f0;">Socialinės Valandos</b> sujungia aktyvias organizacijas su moksleiviais, ieškančiais prasmingos veiklos.<br/><br/>
      Mūsų platformoje moksleiviai jau atliko tūkstančius valandų savanorystės. Kviečiame tapti šio tinklo dalimi ir suteikti jauniems žmonėms galimybę mokytis iš Jūsų.
    `;
  } else if (variant === 3) {
    // Efficiency / Digital focus
    eyebrow = "Inovacija";
    heading = "Atsisveikinkite su popieriais";
    medallion = "📱";
    body = `
      Sveiki,<br/><br/>
      Ar vis dar pildote popierinius socialinės veiklos lapus? <b style="color:#e2e8f0;">Socialinės Valandos</b> siūlo pilnai skaitmenizuotą sprendimą.<br/><br/>
      <b>Jūsų organizacijai tai reiškia:</b><br/>
      • Jokio rankinio pildymo — viskas patvirtinama vienu paspaudimu.<br/>
      • Saugūs QR kodai — būkite tikri dėl savanorio lankomumo.<br/>
      • Automatinis ataskaitų generavimas moksleiviams.<br/><br/>
      Leiskite technologijoms dirbti Jums, o Jūs skirkite laiką savo pagrindinei misijai.
    `;
  } else if (variant === 4) {
    // Community / Seduva focused
    eyebrow = "Mūsų Bendruomenė";
    heading = "Savanorystė Šeduvos krašte";
    medallion = "🏘️";
    body = `
      Sveiki, <b>${orgName}</b>!<br/><br/>
      Šeduvos gimnazija ir vietos moksleiviai aktyviai ieško galimybių prisidėti prie Jūsų organizacijos veiklos. 
      Sukūrėme <b style="color:#e2e8f0;">Socialines Valandas</b>, kad šis procesas būtų sklandus ir skaidrus visoms pusėms.<br/><br/>
      Kviečiame užregistruoti savo organizaciją, kad moksleiviai galėtų rasti Jūsų skelbiamas užduotis ir rezervuoti laiką savanorystei oficialiai.
    `;
  } else {
    // Trust / Verification focus
    eyebrow = "Skaidrumas";
    heading = "Patikima savanorystės sistema";
    medallion = "🛡️";
    body = `
      Gerbiamieji,<br/><br/>
      Socialinių valandų sistema Lietuvoje keičiasi. <b style="color:#e2e8f0;">Socialinės Valandos</b> užtikrina, kad kiekviena savanorystės akimirka būtų užfiksuota ir patvirtinta saugiai.<br/><br/>
      Prisijungę prie mūsų platformos, Jūs gaunate prieigą prie verificiuotos sistemos, kurioje moksleivio tapatybė ir atliktas darbas yra patvirtinami QR kodais ir kriptografiniais parašais.<br/><br/>
      Tai modernus standartas, kurį jau vertina pažangiausios mokyklos.
    `;
  }

  return renderShell({
    title: "Kvietimas prisijungti",
    preview: "Kviečiame prisijungti prie Socialinės Valandos platformos.",
    accent: "indigo",
    eyebrow,
    medallionEmoji: medallion,
    heading,
    bodyHtml: body,
    ctaLabel: "Sukurti paskyrą",
    ctaHref: `${APP_URL}/register?role=organization&invite=true`,
  });
}
