import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  FileText,
  Plus,
  Trash2,
  Printer,
  Download,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { PageShell } from "@/components/layout";

const URL = "https://socialinesvalandos.dev/socialiniu-valandu-lapas";
const TITLE = "Socialinių valandų lapas — atsisiųsk arba pildyk internetu (2026)";
const DESC =
  "Nemokamas socialinių valandų lapas: pildyk internetu, atsispausdink arba atsisiųsk CSV. Paaiškiname, kaip teisingai užpildyti valandų apskaitos lapą mokyklai.";

type Row = { date: string; org: string; contact: string; activity: string; hours: string };

const EMPTY: Row = { date: "", org: "", contact: "", activity: "", hours: "" };

/** Vienai veiklai (vienam įrašui) — daugiausia 8 val., kaip ir platformoje. */
const MAX_PER_ENTRY = 8;
/** Vienai dienai — daugiausia 8 val. iš viso. */
const MAX_PER_DAY = 8;

function parseHours(v: string) {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

type RowCheck = { valid: boolean; hours: number; errors: string[] };

function checkRows(rows: Row[]): RowCheck[] {
  const today = new Date().toISOString().slice(0, 10);
  const perDay: Record<string, number> = {};
  const seen = new Set<string>();

  return rows.map((r) => {
    const filled = !!(r.date || r.org || r.activity || r.hours || r.contact);
    const hours = parseHours(r.hours);
    const errors: string[] = [];
    if (!filled) return { valid: false, hours: 0, errors };

    if (!r.date) errors.push("Trūksta datos.");
    else if (r.date > today) errors.push("Data negali būti ateityje.");
    if (!r.org.trim()) errors.push("Nurodyk organizaciją.");
    if (!r.contact.trim()) errors.push("Nurodyk atsakingą asmenį ir kontaktą (be jo mokykla neužskaitys).");
    if (r.activity.trim().length < 8) errors.push("Aprašyk veiklą konkrečiau (bent 8 simboliai).");
    if (hours <= 0) errors.push("Įrašyk realiai dirbtas valandas.");
    if (hours > MAX_PER_ENTRY) errors.push(`Vienai veiklai daugiausia ${MAX_PER_ENTRY} val.`);

    if (r.date) {
      const key = `${r.date}|${r.org.trim().toLowerCase()}`;
      if (seen.has(key)) errors.push("Tą pačią dieną toje pačioje organizacijoje jau yra įrašas — sujunk juos.");
      seen.add(key);

      const capped = Math.min(hours, MAX_PER_ENTRY);
      const dayTotal = (perDay[r.date] ?? 0) + capped;
      perDay[r.date] = dayTotal;
      if (dayTotal > MAX_PER_DAY) errors.push(`Tą dieną viršyta ${MAX_PER_DAY} val. riba.`);
    }

    return { valid: errors.length === 0, hours, errors };
  });
}


export const Route = createFileRoute("/socialiniu-valandu-lapas")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      {
        name: "keywords",
        content:
          "socialinių valandų lapas, socialinių valandų apskaita, valandų lapas mokyklai, socialinės valandos forma",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Kaip užpildyti socialinių valandų lapą",
          description: DESC,
          inLanguage: "lt-LT",
          step: [
            { "@type": "HowToStep", name: "Įrašyk datą", text: "Kiekvienai veiklai įrašyk tikslią dieną, kada savanoriavai." },
            { "@type": "HowToStep", name: "Nurodyk organizaciją", text: "Įrašyk organizacijos pavadinimą ir atsakingą asmenį, kuris gali patvirtinti valandas." },
            { "@type": "HowToStep", name: "Aprašyk veiklą", text: "Trumpai aprašyk, ką konkrečiai darei — pvz. „padėjau tvarkyti prieglaudos voljerus“." },
            { "@type": "HowToStep", name: "Įrašyk valandas", text: "Nurodyk realiai dirbtą laiką valandomis. Kelionės laikas neįskaičiuojamas." },
            { "@type": "HowToStep", name: "Atsispausdink ir pasirašyk", text: "Atsispausdink lapą, gauk organizacijos parašą ir atiduok klasės vadovui." },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Kas yra socialinių valandų lapas?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Tai apskaitos lapas, kuriame moksleivis surašo savanoriškos veiklos datas, organizacijas, atliktus darbus ir valandų skaičių. Lapą pasirašo organizacija ir jį priima mokykla.",
              },
            },
            {
              "@type": "Question",
              name: "Ar galima pildyti socialinių valandų lapą elektroniniu būdu?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Taip. Šiame puslapyje lapą gali užpildyti internetu, atsispausdinti arba atsisiųsti CSV failą. Susikūrus paskyrą Socialinės Valandos platformoje valandas patvirtina pati organizacija, tad popierinio lapo dažnai nebereikia.",
              },
            },
            {
              "@type": "Question",
              name: "Kas patvirtina įrašytas valandas?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Organizacijos atstovas, pas kurį savanoriavai, parašu arba antspaudu. Platformoje tai atliekama skaitmeniniu būdu, o mokyklos administratorius valandas užskaito.",
              },
            },
            {
              "@type": "Question",
              name: "Ar lapas yra nemokamas?",
              acceptedAnswer: { "@type": "Answer", text: "Taip, lapas ir jo atsisiuntimas yra visiškai nemokami." },
            },
          ],
        }),
      },
    ],
  }),
  component: Page,
});

function Page() {
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY }, { ...EMPTY }, { ...EMPTY }]);

  const checks = useMemo(() => checkRows(rows), [rows]);
  const total = checks.reduce((s, c) => (c.valid ? s + c.hours : s), 0);
  const rejected = checks.reduce((s, c) => (!c.valid && c.hours > 0 ? s + c.hours : s), 0);
  const problems = checks.filter((c) => c.errors.length > 0).length;


  function update(i: number, key: keyof Row, value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }

  function downloadCsv() {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [
      ["Mokinys", name].map(esc).join(","),
      ["Mokykla", school].map(esc).join(","),
      ["Klasė", grade].map(esc).join(","),
      "",
      ["Data", "Organizacija", "Veikla", "Valandos"].map(esc).join(","),
      ...rows.filter((r) => r.date || r.org || r.activity || r.hours).map((r) => [r.date, r.org, r.activity, r.hours].map(esc).join(",")),
      ["", "", "Iš viso", String(total)].map(esc).join(","),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "socialiniu-valandu-lapas.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 py-14">
        <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
            <FileText className="h-3.5 w-3.5 text-primary" /> Nemokamas įrankis
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Socialinių valandų lapas</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Užpildyk savo socialinių-pilietinių valandų apskaitos lapą tiesiai naršyklėje, atsispausdink jį mokyklai
            arba atsisiųsk CSV. Duomenys lieka tik tavo įrenginyje.
          </p>
        </motion.header>

        <section className="mt-8 rounded-2xl border border-border bg-card/60 p-5 print:border-0 print:bg-transparent">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Vardas, pavardė" value={name} onChange={setName} placeholder="Vardenis Pavardenis" />
            <Field label="Mokykla" value={school} onChange={setSchool} placeholder="Šeduvos gimnazija" />
            <Field label="Klasė" value={grade} onChange={setGrade} placeholder="9a" />
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 pr-2 font-semibold">Data</th>
                  <th className="pb-2 pr-2 font-semibold">Organizacija</th>
                  <th className="pb-2 pr-2 font-semibold">Veikla</th>
                  <th className="pb-2 pr-2 font-semibold">Val.</th>
                  <th className="pb-2 print:hidden" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="py-1.5 pr-2">
                      <input type="date" value={r.date} onChange={(e) => update(i, "date", e.target.value)}
                        className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-primary" />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input value={r.org} onChange={(e) => update(i, "org", e.target.value)} placeholder="Maisto bankas"
                        className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-primary" />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input value={r.activity} onChange={(e) => update(i, "activity", e.target.value)} placeholder="Rūšiavau paramos siuntas"
                        className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-primary" />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input inputMode="decimal" value={r.hours} onChange={(e) => update(i, "hours", e.target.value)} placeholder="2"
                        className="h-9 w-20 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-primary" />
                    </td>
                    <td className="py-1.5 print:hidden">
                      <button type="button" onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive"
                        aria-label="Šalinti eilutę">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setRows((p) => [...p, { ...EMPTY }])}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-accent print:hidden">
              <Plus className="h-3.5 w-3.5" /> Pridėti eilutę
            </button>
            <span className="ml-auto rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary">
              Iš viso: {total.toFixed(1)} val.
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 print:hidden">
            <button type="button" onClick={() => window.print()}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow">
              <Printer className="h-4 w-4" /> Spausdinti / išsaugoti PDF
            </button>
            <button type="button" onClick={downloadCsv}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-accent">
              <Download className="h-4 w-4" /> Atsisiųsti CSV
            </button>
          </div>

          <div className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
            Organizacijos atstovo parašas: ____________________ · Data: ____________
          </div>
        </section>

        <section className="mt-12 print:hidden">
          <h2 className="font-display text-2xl font-bold">Kaip teisingai užpildyti lapą</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {[
              "Data — tiksli diena, kada savanoriavai. Kiekvienai veiklai atskira eilutė.",
              "Organizacija — pilnas pavadinimas ir atsakingas asmuo, kuris gali patvirtinti valandas.",
              "Veikla — konkretus darbas, ne bendri žodžiai („padėjau“ nepakanka).",
              "Valandos — tik realiai dirbtas laikas; kelionė ir pertraukos neįskaičiuojamos.",
              "Parašas — organizacijos atstovo parašas arba antspaudas, kitaip mokykla valandų neužskaitys.",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <span>{t}</span>
              </li>
            ))}
          </ul>

          <h2 className="mt-12 font-display text-2xl font-bold">Dažniausi klausimai</h2>
          <div className="mt-4 space-y-4">
            {[
              ["Ar popierinis lapas dar reikalingas?", "Jei tavo mokykla naudoja Socialinės Valandos platformą — ne. Organizacija valandas patvirtina skaitmeniniu būdu, o mokyklos administratorius jas užskaito su patikrinimo kodu."],
              ["Kur dingsta mano duomenys šiame puslapyje?", "Niekur nesiunčiami — lapas pildomas tik tavo naršyklėje."],
              ["Kiek valandų reikia?", "Priklauso nuo klasės ir mokyklos, dažniausiai 8–20 valandų per mokslo metus."],
            ].map(([q, a]) => (
              <div key={q} className="rounded-xl border border-border bg-card/50 p-4">
                <h3 className="text-sm font-semibold">{q}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6">
            <h2 className="font-display text-xl font-bold">Nori, kad valandos skaičiuotųsi automatiškai?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Platformoje rezervuoji veiklą, organizacija patvirtina, o valandos į mokyklos apskaitą patenka pačios.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/register" className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow">
                Susikurti paskyrą <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/blog/kaip-surinkti-socialines-valandas" className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-accent">
                Kaip surinkti valandas
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
    </label>
  );
}
