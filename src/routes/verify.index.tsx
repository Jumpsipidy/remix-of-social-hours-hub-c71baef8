import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/verify/")({
  component: VerifyHome,
  head: () => ({
    meta: [
      { title: "Įvesk pažymėjimo kodą · Socialinės Valandos" },
      { name: "description", content: "Patikrink socialinių valandų PDF sertifikato autentiškumą — QR arba kodo įvedimu." },
      { property: "og:title", content: "Socialinių valandų pažymėjimo patikra" },
      { property: "og:description", content: "Patikrink pasirašytą valandų istoriją pagal pažymėjimo kodą." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function VerifyHome() {
  const [code, setCode] = useState("");
  const nav = useNavigate();

  return (
    <div className="certificate-page min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <Link to="/" className="text-sm text-primary hover:underline">← Į pradžią</Link>
          <h1 className="mt-2 text-4xl font-bold">Sertifikato patikra</h1>
          <p className="mt-2 text-muted-foreground">
            Kiekvienas PDF socialinių valandų sertifikatas turi unikalų kodą ir QR nuorodą. Įvesk kodą arba nuskaityk QR — pamatysi realaus laiko duomenis iš mūsų duomenų bazės.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const c = code.trim().toUpperCase();
            if (c) nav({ to: "/verify/$code", params: { code: c } });
          }}
          className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row"
        >
          <input
            aria-label="Pažymėjimo kodas"
            autoCapitalize="characters"
            autoCorrect="off"
            maxLength={64}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="SV-XXXX-XXXX-XXXX"
            className="min-w-0 flex-1 rounded-lg border border-input bg-background px-4 py-3 font-mono text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none"
          />
          <Button
            type="submit"
            disabled={!code.trim()}
            className="min-h-12"
          >
            Tikrinti
          </Button>
        </form>

        <section className="space-y-4 border-t border-border pt-6">
          <h2 className="text-xl font-semibold">Patvirtinta valandų istorija</h2>
          <p className="text-sm text-muted-foreground">Patikroje matysi pažymėjimo išdavimo metu patvirtintas valandas, veiklų datas, organizacijas ir užfiksuotą patvirtinusį asmenį. Dabartinis valandų skaičius rodomas atskirai.</p>
          <p className="text-sm text-muted-foreground">HMAC-SHA256 apsaugo sistemos įrašą. Nuskaitydamas QR arba atidarydamas nuorodą palygink PDF duomenis su šiuo puslapiu: vien nuorodos atidarymas netikrina pakeisto PDF failo.</p>
          <p className="text-sm text-muted-foreground">Tai sistemos autentiškumo patikra, ne kvalifikuotas elektroninis parašas. Bandomieji ir atšaukti pažymėjimai negalioja.</p>
        </section>
      </div>
    </div>
  );
}
