import { createFileRoute } from "@tanstack/react-router";
import { openCookieSettings } from "@/components/cookie-consent";

export const Route = createFileRoute("/privatumas")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privatumo ir slapukų politika | Socialinės Valandos" },
      {
        name: "description",
        content:
          "Kaip Socialinės Valandos tvarko asmens duomenis ir naudoja slapukus. GDPR ir ePrivacy atitikimas.",
      },
      { property: "og:title", content: "Privatumo ir slapukų politika" },
      {
        property: "og:description",
        content: "Kaip Socialinės Valandos tvarko asmens duomenis ir naudoja slapukus.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-16 text-neutral-200">
      <article className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Privatumo ir slapukų politika
          </h1>
          <p className="text-sm text-neutral-400">
            Atnaujinta: 2026-07-24 · Atitinka BDAR (GDPR) ir ePrivacy direktyvą
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">1. Kas mes esame</h2>
          <p>
            „Socialinės Valandos" (<a className="underline" href="https://socialinesvalandos.dev">socialinesvalandos.dev</a>) — platforma,
            padedanti Lietuvos mokykloms valdyti moksleivių socialines-pilietines valandas.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">2. Kokius duomenis renkame</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>Registracijos duomenys: vardas, pavardė, el. paštas, mokykla, klasė, rolė</li>
            <li>Veiklos duomenys: rezervacijos, atliktos valandos, žinutės, QR įsiregistravimai</li>
            <li>Techniniai duomenys: naršyklės tipas, klaidų žurnalai (be asmens tapatybės)</li>
            <li>
              Klaidų ekrano nuotraukos: įvykus klaidai arba Naudotojui pateikiant pranešimą apie klaidą,
              automatiškai užfiksuojame tuo metu matomą ekrano vaizdą kartu su incidento kodu
            </li>
          </ul>
          <p className="text-sm text-neutral-400">
            Ekrano nuotraukos naudojamos tik gedimui atkurti, saugomos ribotą laiką, prieinamos tik
            administratoriams ir niekada neperduodamos trečiosioms šalims. Norėdami, kad nuotrauka būtų
            ištrinta, parašykite mums nurodę incidento kodą.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">3. Slapukų kategorijos</h2>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-white">
                <tr>
                  <th className="p-3">Kategorija</th>
                  <th className="p-3">Paskirtis</th>
                  <th className="p-3">Galiojimas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                <tr>
                  <td className="p-3 font-medium text-white">Būtini</td>
                  <td className="p-3">Sesija, prisijungimas, CSRF apsauga (Supabase auth token)</td>
                  <td className="p-3">Sesijos trukmė</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-white">Analitika</td>
                  <td className="p-3">Anoniminė lankomumo statistika (savas serveris, be trečių šalių)</td>
                  <td className="p-3">Iki 12 mėn.</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-white">Rinkodara</td>
                  <td className="p-3">Šiuo metu nenaudojama</td>
                  <td className="p-3">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">4. Sutikimo valdymas</h2>
          <p>
            Sutikimas išsaugomas tavo naršyklėje (localStorage) su laiko žyma ir versijos numeriu.
            Galima bet kada atšaukti arba pakeisti:
          </p>
          <button
            type="button"
            onClick={() => openCookieSettings()}
            className="rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/20 hover:brightness-110"
          >
            Atidaryti slapukų nustatymus
          </button>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">4a. Naujos funkcijos (V2.5)</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li><b>Pokalbiai:</b> žinutės tarp mokinių, organizacijų ir mokyklos administracijos automatiškai ištrinamos po 12 dienų. Mokyklos administracija gali matyti savo mokyklos mokinių pokalbius su organizacijomis.</li>
            <li><b>Draugai:</b> draugai mato vienas kito vardą ir bendras rezervacijas; asmeninės žinutės ištrinamos po 2 dienų.</li>
            <li><b>Žemėlapis ir vieta:</b> tavo buvimo vieta naudojama tik naršyklėje žemėlapiui centruoti ir nesaugoma.</li>
            <li><b>Robotų patikra:</b> trumpam tikriname naršyklės požymius ir judesius, kad atskirtume robotus; prireikus naudojama Google reCAPTCHA.</li>
            <li><b>Klaidų sekimas:</b> naudojame Sentry klaidoms aptikti; esant klaidai gali būti įrašomas anonimizuotas ekrano veiksmų įrašas (tekstas ir įvestys paslepiami).</li>
            <li><b>Pažymėjimai ir QR kodai:</b> pažymėjimuose yra vardas, klasė, mokykla ir valandos; juos patikrinti gali bet kas, turintis kodą.</li>
            <li><b>Laiškai:</b> pranešimus siunčiame per Resend; juos galima išjungti nustatymuose.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">5. Tavo teisės (BDAR)</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>Susipažinti su savo duomenimis</li>
            <li>Ištaisyti netikslius duomenis</li>
            <li>Ištrinti paskyrą (Nustatymai → Ištrinti paskyrą)</li>
            <li>Atšaukti sutikimą bet kuriuo metu</li>
            <li>
              Pateikti skundą Valstybinei duomenų apsaugos inspekcijai (<a className="underline" href="https://vdai.lrv.lt">vdai.lrv.lt</a>)
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">6. Kontaktai</h2>
          <p>
            Duomenų valdytojas — platformos administratorius (fizinis asmuo, LR). Klausimai dėl privatumo, prieigos, ištrynimo ar duomenų kopijos:{" "}
            <a className="underline" href="mailto:pagalba@socialinesvalandos.dev">pagalba@socialinesvalandos.dev</a>
          </p>
          <p className="text-sm text-neutral-400">
            Pilna politika (BDAR 13–14 str.): <a className="underline" href="/privacy">/privacy</a> · Naudojimosi taisyklės: <a className="underline" href="/terms">/terms</a>
          </p>
        </section>
      </article>
    </div>
  );
}
