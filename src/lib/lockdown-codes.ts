export type LockdownCode = {
  code: string;
  title: string;
  short: string;
  description: string;
  severity: "info" | "warn" | "critical";
  eta: string;
};

export const LOCKDOWN_CODES: LockdownCode[] = [
  { code: "E-4002", title: "Sistemos patikra nepavyko", short: "Tikrinamas sutrikimas", description: "Sistemos patikra aptiko sutrikimą. Prieiga laikinai apribota, kol administratorius patvirtins, kad saugu tęsti.", severity: "critical", eta: "nežinoma" },
  { code: "E-5002", title: "Pasikartojantis sutrikimas", short: "Ribojama prieiga", description: "Aptikta pasikartojančių sistemos klaidų. Prieiga laikinai apribota.", severity: "warn", eta: "nežinoma" },
  { code: "E-5003", title: "Kritinių klaidų incidentas", short: "Vyksta incidento patikra", description: "Prieiga sustabdyta dėl kritinių klaidų. Administratorius tikrina sistemos būseną.", severity: "critical", eta: "nežinoma" },
  {
    code: "E-1001",
    title: "Planinė techninė priežiūra",
    short: "Vykdomi planiniai atnaujinimai",
    description:
      "Šiuo metu vyksta planinė techninė priežiūra. Platforma laikinai nepasiekiama — būseną gali patikrinti dar kartą.",
    severity: "info",
    eta: "5–30 min.",
  },
  {
    code: "E-1002",
    title: "Duomenų bazės atnaujinimas",
    short: "Migruojama duomenų bazė",
    description:
      "Vykdome duomenų bazės migraciją. Trumpam ribojame prieigą, kad būtų išvengta duomenų neatitikimų.",
    severity: "info",
    eta: "10–20 min.",
  },
  {
    code: "E-2001",
    title: "Netikėtas gedimas",
    short: "Aptiktas netikėtas gedimas",
    description:
      "Įvyko netikėtas sistemos sutrikimas. Platforma laikinai nepasiekiama. Pabandyk patikrinti būseną vėliau.",
    severity: "warn",
    eta: "iki 1 val.",
  },
  {
    code: "E-2002",
    title: "Saugumo incidentas",
    short: "Ribojama prieiga dėl saugumo",
    description:
      "Dėl galimo saugumo incidento platforma laikinai nepasiekiama. Prieiga apribota saugumo sumetimais.",
    severity: "critical",
    eta: "nežinoma",
  },
  {
    code: "E-3001",
    title: "Migracija į naują serverį",
    short: "Perkeliame į naują infrastruktūrą",
    description:
      "Perkeliame platformą į naują infrastruktūrą, kad ateityje veiktų greičiau ir patikimiau.",
    severity: "info",
    eta: "30–60 min.",
  },
  {
    code: "E-4001",
    title: "Trečios šalies paslauga nepasiekiama",
    short: "Autentifikacijos paslauga neveikia",
    description:
      "Trečios šalies paslauga (pvz. Google / Discord prisijungimas arba duomenų bazės tiekėjas) šiuo metu neveikia. Laukiame, kol paslauga atsistatys.",
    severity: "warn",
    eta: "priklauso nuo tiekėjo",
  },
  {
    code: "E-5001",
    title: "Diegiama nauja versija",
    short: "Į platformą diegiama nauja versija",
    description:
      "Diegiame naujausią platformos versiją su patobulinimais ir klaidų taisymais.",
    severity: "info",
    eta: "5–15 min.",
  },
  {
    code: "E-9000",
    title: "Nežinoma klaida",
    short: "Nepatikslinta priežastis",
    description:
      "Sistema laikinai neprieinama. Detalesnės informacijos šiuo metu nėra. Bandyk vėliau.",
    severity: "warn",
    eta: "nežinoma",
  },
];

export function getLockdownCode(code?: string | null): LockdownCode | null {
  if (!code) return null;
  return LOCKDOWN_CODES.find((c) => c.code === code) ?? null;
}
