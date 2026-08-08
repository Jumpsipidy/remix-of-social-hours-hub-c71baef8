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
  let eyebrow = "OFICIALUS KVIETIMAS";
  let heading = "";
  let medallion = "🏛️";
  let accent: "indigo" | "emerald" | "rose" | "amber" = "indigo";

  if (variant === 1) {
    heading = `Gerbiama ${orgName} komanda`;
    body = `
      Oficialiai kviečiame Jūsų organizaciją prisijungti prie <b style="color:#ffffff;">Socialinės Valandos</b> tinklo. Tai valstybinį standartą atitinkanti skaitmeninė platforma moksleivių savanorystės apskaitai.<br/><br/>
      <b>Jūsų laukiantys privalumai:</b><br/>
      • <b style="color:#ffffff;">Teisinis skaidrumas:</b> Visi įrašai yra verifikuoti ir neklastojami.<br/>
      • <b style="color:#ffffff;">Laiko taupymas:</b> Pamirškite popierinius žurnalus — viskas valdoma vienu paspaudimu.<br/>
      • <b style="color:#ffffff;">Bendruomenės augimas:</b> Tiesioginis ryšys su Šeduvos gimnazijos ir regiono moksleiviais.<br/><br/>
      
      <div style="background-color:#111122; border:1px solid rgba(255,255,255,0.1); border-radius:24px; padding:24px; margin-top:32px; text-align:left;">
        <h4 style="margin:0 0 12px 0; color:#ffffff; font-size:16px;">Svarbu žinoti:</h4>
        <p style="margin:0 0 16px 0; color:#94a3b8; font-size:14px; line-height:1.5;">
          Oficialus platformos startas — <b>netrukus</b>. Šiuo metu atliekame paruošiamuosius darbus, kad Jūsų patirtis būtų nepriekaištinga. Aktyvavę paskyrą dabar, Jūs būsite pirmieji, kurie galės skelbti užduotis.
        </p>
        <h4 style="margin:0 0 12px 0; color:#ffffff; font-size:16px;">Tolesni žingsniai:</h4>
        <ol style="margin:0; padding-left:20px; color:#94a3b8; font-size:15px; line-height:1.6;">
          <li><b style="color:#ffffff;">Paskyros aktyvavimas:</b> Spauskite mygtuką žemiau.</li>
          <li><b style="color:#ffffff;">Profilio užpildymas:</b> Nurodykite savo veiklos sritis ir gaukite „Verified“ ženklelį.</li>
          <li><b style="color:#ffffff;">Pasiruošimas:</b> Kai startuosime, moksleiviai Jus matys sąrašo viršuje.</li>
        </ol>
        <div style="margin-top:20px; padding:16px; background-color:rgba(16,185,129,0.1); border-radius:16px; border:1px solid rgba(16,185,129,0.2);">
          <p style="margin:0; font-size:13px; color:#10b981; font-weight:600;">
            💡 Norite sužinoti daugiau? <a href="${APP_URL}/about-orgs" style="color:#34d399; text-decoration:underline;">Spauskite čia</a> ir sužinokite, kaip platforma padeda organizacijoms.
          </p>
        </div>
      </div>
      <br/>
      <i style="color:#94a3b8; font-size:14px;">Turite klausimų? Spauskite mygtuką ir atsakykite į šį laišką – mūsų komanda pasirengusi padėti tiesiogiai.</i>
    `;
  } else if (variant === 2) {
    accent = "emerald";
    eyebrow = "STRATEGINĖ PARTNERYSTĖ";
    heading = "Kurkime vertę kartu";
    medallion = "🤝";
    body = `
      Gerbiama <b style="color:#ffffff;">${orgName}</b> vadovybė,<br/><br/>
      Kviečiame tapti inovatyvios savanorystės ekosistemos dalimi. Mūsų tikslas — užtikrinti, kad kiekviena jauno žmogaus pastanga būtų tinkamai įvertinta ir saugiai dokumentuota.<br/><br/>
      <b>Prisijungimo procesas:</b><br/>
      1. Aktyvuokite savo paskyrą paspaudę žemiau esantį mygtuką.<br/>
      2. Užpildykite organizacijos profilį.<br/>
      3. Pradėkite skelbti savanorystės užduotis.
    `;
  } else if (variant === 3) {
    accent = "amber";
    eyebrow = "SKAITMENINIS STANDARTAS";
    heading = "Ateities dokumentacija";
    medallion = "📜";
    body = `
      Sveiki, ${orgName}!<br/><br/>
      Lietuva žengia į pilną skaitmenizaciją, ir socialinės valandos nėra išimtis. <b style="color:#ffffff;">Socialinės Valandos</b> pakeičia nepatikimą popierinę apskaitą saugiu, skaitmeniniu formatu.<br/><br/>
      Prisijungdami Jūs ne tik palengvinate savo darbą, bet ir prisidedate prie skaidrios savanorystės kultūros kūrimo Lietuvoje.
    `;
  } else if (variant === 4) {
    accent = "indigo";
    eyebrow = "REGIONO PLĖTRA";
    heading = "Jūsų indėlis svarbus";
    medallion = "📍";
    body = `
      Mūsų regiono moksleiviai aktyviai ieško būdų prisidėti prie <b>${orgName}</b> veiklos. Mes suteikiame įrankius, kurie padaro šį procesą sklandų ir saugų abiems pusėms.<br/><br/>
      Šeduvos gimnazija jau naudoja šią sistemą. Prisijunkite prie mūsų ir tapkite matomiems aktyviausiam vietos jaunimui.
    `;
  } else {
    accent = "rose";
    eyebrow = "SAUGUMAS IR PATIKRA";
    heading = "Garantuotas patikimumas";
    medallion = "🛡️";
    body = `
      Saugumas yra mūsų prioritetas. <b style="color:#ffffff;">Socialinės Valandos</b> naudoja QR verifikaciją ir 60-ties sekundžių kintamus kodus, kad užkirstų kelią bet kokiam piktnaudžiavimui.<br/><br/>
      Suteikite savo savanoriams patikimiausią įrankį rinkoje. Prisijunkite prie oficialaus partnerių tinklo šiandien.
    `;
  }

  return renderShell({
    title: "Oficialus Kvietimas",
    preview: "Oficialus kvietimas prisijungti prie Socialinės Valandos partnerių tinklo.",
    accent,
    eyebrow,
    medallionEmoji: medallion,
    heading,
    bodyHtml: body,
    ctaLabel: "Aktyvuoti paskyrą",
    ctaHref: `${APP_URL}/register?role=organization&invite=true`,
  });
}
