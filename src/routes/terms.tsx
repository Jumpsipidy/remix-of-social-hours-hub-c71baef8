import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/layout";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Naudojimosi taisyklės — Socialinės Valandos" },
      { name: "description", content: "Socialinių Valandų platformos naudojimosi taisyklės, privatumo politika, duomenų tvarkymas ir naudotojų atsakomybės." },
      { property: "og:title", content: "Naudojimosi taisyklės — Socialinės Valandos" },
      { property: "og:description", content: "Perskaityk Socialinių Valandų platformos taisykles, privatumo politiką ir duomenų tvarkymo principus." },
      { property: "og:url", content: "https://socialinesvalandos.dev/terms" },
    ],
    links: [{ rel: "canonical", href: "https://socialinesvalandos.dev/terms" }],
  }),
  component: TermsPage,
});

const SECTIONS: { h: string; body: string[] }[] = [
  {
    h: "1. Bendrosios nuostatos",
    body: [
      "Šios naudojimosi taisyklės („Taisyklės“) reglamentuoja santykius tarp platformos „Socialinės Valandos“ (toliau — Platforma) valdytojo ir bet kurio asmens, besinaudojančio Platformos paslaugomis (toliau — Naudotojas).",
      "Platforma yra skirta Lietuvos Respublikos mokyklų moksleiviams, kurie pagal ugdymo programą privalo atlikti socialinę-pilietinę veiklą, bei organizacijoms, kurios yra pasirengusios priimti savanorius ir liudyti apie atliktą darbą.",
      "Naudodamasis Platforma, Naudotojas patvirtina, kad perskaitė, suprato ir sutinka su šiomis Taisyklėmis. Jei Naudotojas nesutinka su bet kuria Taisyklių nuostata, jis privalo nedelsdamas nutraukti naudojimąsi Platforma.",
      "Platforma pasilieka teisę bet kada vienašališkai keisti šias Taisykles. Pakeitimai įsigalioja nuo jų paskelbimo Platformoje momento. Aktualią Taisyklių redakciją Naudotojas visada gali rasti adresu /terms.",
    ],
  },
  {
    h: "2. Naudotojų tipai ir jų teisės",
    body: [
      "Moksleivis — pilnametis arba nepilnametis asmuo, besimokantis Lietuvos švietimo įstaigoje. Moksleivis turi teisę: susikurti paskyrą, naršyti prieinamas užduotis bei organizacijas, rezervuoti savanorystės valandas, bendrauti su organizacija ir mokyklos administracija Platformos pokalbių sistemoje, matyti savo sukauptų valandų istoriją.",
      "Organizacija — juridinis asmuo arba viešojo sektoriaus vienetas, kuriam Platformos administratorius yra suteikęs prieigą. Organizacija turi teisę: skelbti savanorystės užduotis, patvirtinti arba atmesti moksleivių rezervacijas, patvirtinti realiai atliktą darbą bei įskaityti valandas.",
      "Mokyklos administratorius — mokyklos paskirtas atsakingas asmuo, turintis teisę stebėti savo mokyklos moksleivių pažangą, dalyvauti pokalbiuose (audituoti), skelbti vienkartinius renginius bei tvirtinti mokyklos-lygio išimtis.",
      "Super administratorius — Platformos savininkas, atsakingas už paskyrų priežiūrą, saugumą, taisyklių priežiūrą ir techninę infrastruktūrą.",
      "Naudotojas privalo teikti tik teisingus duomenis. Bet koks bandymas apgaulingai gauti valandų kreditą, apsimetinėti kitu asmeniu arba pateikti fiktyvias organizacijas laikomas šiurkščiu Taisyklių pažeidimu.",
    ],
  },
  {
    h: "3. Paskyros registracija ir sauga",
    body: [
      "Moksleivis registruojasi savarankiškai, pasirinkdamas savo mokyklą, klasę ir nurodydamas privalomų socialinių valandų kiekį.",
      "Organizacijos paskyra kuriama tik po to, kai Platformos administratorius arba mokyklos administratorius patvirtina Naudotojo pateiktą prašymą, kuriame nurodyta teisinga organizacijos informacija (pavadinimas, juridinio asmens kodas, kontaktinis asmuo, veiklos aprašymas). Fiktyvūs prašymai atmetami.",
      "Naudotojas privalo saugoti savo paskyros prisijungimo duomenis. Bet kokie veiksmai, atlikti prisijungus su Naudotojo paskyra, laikomi paties Naudotojo veiksmais.",
      "Praradus prieigą prie paskyros, Naudotojas nedelsdamas informuoja Platformos administraciją per pranešimo apie klaidą formą arba el. paštu.",
    ],
  },
  {
    h: "4. Rezervacijos ir valandų pripažinimas",
    body: [
      "Rezervacija — Platformoje užfiksuotas moksleivio įsipareigojimas atvykti į konkrečią organizaciją nurodytu laiku ir atlikti nurodytą darbą.",
      "Rezervacijos etapai: „pending“ (laukiama organizacijos patvirtinimo) → „approved“ (patvirtinta, darbas vyksta) → „completed“ (organizacija patvirtino, kad darbas realiai atliktas).",
      "Valandos moksleivio balanse įskaitomos tik tuo metu, kai organizacija (arba mokyklos administratorius, jei tai vienkartinis renginys) patvirtina rezervacijos užbaigimą, pažymėdamas privalomą teisinį patvirtinimą, kad informacija teisinga.",
      "Rezervacijos atšaukimas iš moksleivio pusės galimas iki organizacijos patvirtinimo. Vėlesnis atšaukimas laikomas moksleivio įsipareigojimo pažeidimu ir gali būti fiksuojamas mokyklai.",
      "Fiktyvus valandų pripažinimas (organizacija tvirtina darbą, kuris realiai neatliktas) yra šiurkštus pažeidimas ir gali užtraukti tiek civilinę, tiek administracinę atsakomybę pagal Lietuvos Respublikos įstatymus.",
    ],
  },
  {
    h: "5. Pokalbių sistema ir 12 dienų taisyklė",
    body: [
      "Platformos pokalbiai yra trišaliai: moksleivis, organizacija ir (kai taikoma) mokyklos administratorius. Mokyklos administratorius turi teisę matyti visą pokalbį audito tikslais — Naudotojas su tuo aiškiai sutinka.",
      "Visos pokalbių žinutės automatiškai ištrinamos praėjus 12 kalendorinių dienų nuo jų sukūrimo. Ši politika įgyvendinama automatiniu duomenų bazės valymu kiekvieną parą.",
      "Naudotojas neturi lūkesčio, kad žinutės bus saugomos ilgiau nei 12 dienų. Jei reikia išsaugoti bendravimo įrodymus, Naudotojas privalo pasidaryti kopijas savo priemonėmis.",
      "Draudžiama pokalbiuose siųsti neapykantą kurstantį turinį, šmeižtą, komercinę reklamą, asmens duomenis, kurie nesusiję su savanoryste, arba bet kokį neteisėtą turinį.",
    ],
  },
  {
    h: "6. Asmens duomenų tvarkymas",
    body: [
      "Platforma tvarko Naudotojų asmens duomenis vadovaudamasi 2016 m. balandžio 27 d. Europos Parlamento ir Tarybos reglamentu (ES) 2016/679 (BDAR) ir Lietuvos Respublikos asmens duomenų teisinės apsaugos įstatymu.",
      "Tvarkomi duomenys: vardas, pavardė, el. pašto adresas, mokyklos pavadinimas, klasė, sukauptų valandų informacija, rezervacijų istorija, pokalbių žinutės (iki 12 dienų).",
      "Duomenys naudojami išimtinai Platformos paslaugų teikimui ir nėra perduodami trečiosioms šalims, išskyrus atvejus, kai to reikalauja įstatymai.",
      "Naudotojas turi teisę: prašyti pateikti visą apie jį tvarkomą informaciją, prašyti ištaisyti neteisingus duomenis, prašyti ištrinti paskyrą, apriboti duomenų tvarkymą, perkelti duomenis, pareikšti prieštaravimą.",
      "Prašymai teikiami el. paštu, nurodytu kontaktų skiltyje. Į prašymą atsakoma per 30 kalendorinių dienų.",
    ],
  },
  {
    h: "7. Draudžiamas elgesys",
    body: [
      "Draudžiama: naudoti Platformą neteisėtais tikslais; apsimetinėti kitu asmeniu ar organizacija; teikti melagingus duomenis registracijoje ar rezervacijoje; bandyti neteisėtai pasiekti kitų Naudotojų paskyras; naudoti automatizuotus skriptus (botus); pažeisti intelektinės nuosavybės teises; siųsti šlamštą (spam) ar reklamą.",
      "Nustačius pažeidimą, Platforma turi teisę: laikinai apriboti paskyros funkcijas; visam laikui uždaryti paskyrą; informuoti apie pažeidimą mokyklos administraciją; kraštutiniais atvejais — kreiptis į teisėsaugos institucijas.",
    ],
  },
  {
    h: "8. Atsakomybė",
    body: [
      "Platforma yra tarpininkas tarp moksleivių ir organizacijų. Platforma neprisiima atsakomybės už organizacijų veiksmus, jų teikiamo darbo turinį ar kokybę, taip pat už moksleivio elgesį atliekant savanorystę.",
      "Moksleivis, atlikdamas savanorystę, veikia savo rizika. Prieš pradedant realų darbą su padidintos rizikos veiklomis, moksleivis (arba nepilnamečio atveju — tėvai/globėjai) turi įsitikinti, kad turi atitinkamą draudimą.",
      "Platforma neatsako už bet kokį netiesioginį, atsitiktinį ar pasekminį nuostolį, kilusį dėl Platformos naudojimo ar negalėjimo naudotis.",
      "Naudotojo atsakomybė už melagingus duomenis, valandų klastojimą ar pokalbių turinį yra asmeninė ir Platforma perduoda atitinkamus duomenis kompetentingoms institucijoms pagal pareikalavimą.",
    ],
  },
  {
    h: "9. Prieinamumas ir techninės problemos",
    body: [
      "Platforma dedami pastangas užtikrinti nepertraukiamą veikimą, tačiau negarantuoja 100% prieinamumo. Techninės pertraukos gali įvykti dėl atnaujinimų, priežiūros, trečiųjų šalių infrastruktūros gedimų.",
      "Nustačius klaidą, Naudotojas gali ją pranešti per Platformos „Pranešti apie klaidą“ formą. Kritiniai gedimai sprendžiami prioritetine tvarka.",
      "KLAIDŲ EKRANO NUOTRAUKOS. Įvykus techninei klaidai arba Naudotojui pateikiant pranešimą apie klaidą, Platforma automatiškai užfiksuoja tuo metu matomo ekrano vaizdą (ekrano nuotrauką), naršyklės ir įrenginio techninius duomenis bei incidento kodą. Šie duomenys naudojami tik gedimui atkurti ir ištaisyti, prieinami tik Platformos administratoriams ir automatiškai pašalinami išsprendus incidentą. Naudodamasis Platforma Naudotojas su tokiu fiksavimu sutinka; jei ekrane tuo metu matomi jautrūs duomenys, Naudotojas gali prašyti nuotrauką ištrinti nurodydamas incidento kodą.",
      "Duomenų bazių atsarginės kopijos daromos reguliariai. Kritinio gedimo atveju bus stengiamasi atkurti iki paskutinio žinomo tinkamo taško, tačiau tam tikras trumpas duomenų praradimas gali įvykti.",
    ],
  },
  {
    h: "10. Intelektinė nuosavybė",
    body: [
      "Visos Platformos autorinės teisės, prekių ženklai, kodas, dizainas ir turinys priklauso Platformos savininkui. Kopijuoti, platinti ar išvestiniu būdu naudoti Platformos elementus be raštiško leidimo draudžiama.",
      "Naudotojo įkeltas turinys (pvz., organizacijos aprašymas, užduočių tekstas) lieka Naudotojo nuosavybe, tačiau Naudotojas suteikia Platformai neatlygintiną, neišimtinę licenciją talpinti ir rodyti šį turinį Platformos naudotojams.",
    ],
  },
  {
    h: "11. Taikoma teisė ir ginčų sprendimas",
    body: [
      "Šioms Taisyklėms ir bet kokiems iš jų kylantiems santykiams taikoma Lietuvos Respublikos teisė.",
      "Ginčai pirmiausia sprendžiami derybų būdu. Nepavykus susitarti, ginčas nagrinėjamas Lietuvos Respublikos bendrosios kompetencijos teisme pagal Platformos savininko buveinės vietą.",
      "Vartotojas taip pat gali kreiptis į Valstybinę vartotojų teisių apsaugos tarnybą arba pasinaudoti Europos Komisijos ODR platforma (https://ec.europa.eu/consumers/odr).",
    ],
  },
  {
    h: "12. Baigiamosios nuostatos",
    body: [
      "Jei kuri nors Taisyklių nuostata pripažįstama negaliojančia, likusios nuostatos lieka galioti.",
      "Platforma turi teisę bet kada nutraukti paslaugų teikimą, apie tai iš anksto informuodama Naudotojus prieinamais kanalais.",
      "Kontaktai bendravimui teisiniais ir techniniais klausimais nurodomi Platformos apačioje bei prieinami per „Pranešti apie klaidą“ formą.",
      "Šios Taisyklės paskutinį kartą atnaujintos: 2026 m. liepos 2 d.",
    ],
  },
];

function TermsPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="mb-10 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
            <FileText className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Teisiniai dokumentai</p>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">Naudojimosi taisyklės</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/70 p-4 text-sm text-muted-foreground backdrop-blur">
          Perskaitęs šias taisykles patvirtini, kad supranti Platformos veikimo principus, savo teises ir įsipareigojimus. Jei kyla klausimų — pranešk apačioje kairėje esančiu „Pranešti apie klaidą“ mygtuku.
        </div>

        <article className="prose prose-invert mt-8 max-w-none">
          {SECTIONS.map((sec) => (
            <section key={sec.h} className="mt-10 rounded-2xl border border-border bg-card/60 p-6 backdrop-blur">
              <h2 className="font-display text-xl font-bold text-foreground">{sec.h}</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
                {sec.body.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </section>
          ))}
        </article>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 p-5 text-sm">
          <span className="text-muted-foreground">© 2026 Socialinės Valandos.</span>
          <Link to="/" className="font-semibold text-primary hover:underline">Grįžti į pradžią →</Link>
        </div>
      </div>
    </PageShell>
  );
}
