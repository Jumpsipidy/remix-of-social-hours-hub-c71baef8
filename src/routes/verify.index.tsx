import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/verify/")({
  component: VerifyHome,
  head: () => ({
    meta: [
      { title: "Sertifikato patikra · Socialinės Valandos" },
      { name: "description", content: "Patikrink socialinių valandų PDF sertifikato autentiškumą — QR arba kodo įvedimu." },
    ],
  }),
});

function VerifyHome() {
  const [code, setCode] = useState("");
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <Link to="/" className="text-xs text-blue-300 hover:underline">← Į pradžią</Link>
          <h1 className="mt-2 text-4xl font-bold">Sertifikato patikra</h1>
          <p className="mt-2 text-blue-200/80">
            Kiekvienas PDF socialinių valandų sertifikatas turi unikalų kodą ir QR nuorodą. Įvesk kodą arba nuskaityk QR — pamatysi realaus laiko duomenis iš mūsų duomenų bazės.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const c = code.trim().toUpperCase();
            if (c) nav({ to: "/verify/$code", params: { code: c } });
          }}
          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur sm:flex-row"
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="SV-XXXX-XXXX-XXXX"
            className="flex-1 rounded-full border border-white/10 bg-white/10 px-5 py-3 font-mono text-sm placeholder:text-blue-200/40 focus:border-blue-400 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 text-sm font-semibold shadow-lg shadow-blue-500/30"
          >
            Tikrinti
          </button>
        </form>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h2 className="text-2xl font-bold">Kaip tai veikia?</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-blue-100/90">
            <li>Moksleivis paspaudžia „Atsisiųsti PDF sertifikatą" savo dashboarde.</li>
            <li>Serveris sugeneruoja unikalų kodą <code className="rounded bg-black/30 px-1">SV-XXXX-XXXX-XXXX</code>, SHA-256 turinio hash'ą ir HMAC-SHA256 parašą su slaptu raktu.</li>
            <li>Įrašas įrašomas į duomenų bazę su timestamp'u, IP ir moksleivio ID.</li>
            <li>PDF su QR kodu grąžinamas naršyklei atsisiuntimui.</li>
            <li>Mokykla nuskaito QR → atsidaro šis puslapis su realaus laiko duomenimis iš DB, ne iš PDF.</li>
          </ol>
        </section>

        <section className="space-y-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-6 backdrop-blur">
          <h2 className="text-2xl font-bold">Kodėl moksleiviai negali suklastoti?</h2>
          <ul className="space-y-3 text-sm text-emerald-50/90">
            <li>
              <b>1. Kodas nesukurpiamas ranka.</b> Kiekvienas <code>SV-XXXX-XXXX-XXXX</code> gimsta tik iš mūsų serverio, kai užklausą atlieka prisijungęs moksleivis. Bandant įrašyti savo pramanytą kodą — verifikacijos puslapis parodys „Nerasta".
            </li>
            <li>
              <b>2. Duomenys rodomi iš duomenų bazės, ne iš PDF.</b> Net jei kas nors atidarys PDF ir pakeis „5 val." į „50 val." grafiniame redaktoriuje, verifikacijos puslapis rodys tikrus DB duomenis. PDF yra tik popierinė kopija, tikras šaltinis — mūsų DB.
            </li>
            <li>
              <b>3. HMAC-SHA256 parašas.</b> Kodas ir turinio hash'as pasirašyti serverio slaptu raktu (64 baitų). Be rakto neįmanoma sugeneruoti tinkamos poros — o raktas niekada nepatenka į naršyklę ar kodo bazę.
            </li>
            <li>
              <b>4. SHA-256 turinio hash'as.</b> Jei PDF turinys keičiamas, hash'as PDF apačioje nebeatitiks DB įrašo — mokytojas iškart mato neatitikimą.
            </li>
            <li>
              <b>5. Timestamp + IP + user_id.</b> Kiekvienas sugeneravimas užloguojamas. Admin visada gali eksportuoti auditą.
            </li>
            <li>
              <b>6. Atšaukimas.</b> Jei paaiškėja, kad moksleivis suklastojo valandas platformoje (o paskui sugeneravo PDF) — admin gali atšaukti sertifikatą. Verifikacijos puslapis nedelsiant parodys „Atšauktas".
            </li>
            <li>
              <b>7. „Val. sistemoje dabar" laukas.</b> Puslapis rodo ne tik val. skaičių sertifikato generavimo metu, bet ir <b>dabartinę reikšmę</b>. Jei jos skiriasi — mokykla mato, kad valandos po to buvo pakeistos.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h2 className="mb-2 text-2xl font-bold">Teisinis pagrindas</h2>
          <p className="text-sm text-blue-100/80">
            Pagal <b>eIDAS reglamentą Nr. 910/2014</b>, elektroninis parašas turi tokią pačią teisinę galią kaip ranka rašytas.
            Kombinacija „HMAC parašas + realaus laiko DB verifikacija" yra <b>stipresnė nei paprastas popierinis parašas</b>,
            kurį galima suklastoti — mūsiškį suklastoti reikia turėti prieigą prie serverio slapto rakto.
          </p>
        </section>
      </div>
    </div>
  );
}
