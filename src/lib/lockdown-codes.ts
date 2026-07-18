export type LockdownCode = {
  code: string;
  title: string;
  short: string;
  description: string;
  severity: "info" | "warn" | "critical";
  eta: string;
};

export const LOCKDOWN_CODES: LockdownCode[] = [
  {
    code: "E-1001",
    title: "Planinė techninė priežiūra",
    short: "Vykdomi planiniai atnaujinimai",
    description:
      "Šiuo metu vykdome planinius sistemos atnaujinimus. Nauji duomenys nebus prarasti — po darbų viskas veiks kaip įprasta.",
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
      "Aptikome netikėtą klaidą ir šiuo metu ją taisome. Bandyk vėliau — problema bus išspręsta artimiausiu metu.",
    severity: "warn",
    eta: "iki 1 val.",
  },
  {
    code: "E-2002",
    title: "Saugumo incidentas",
    short: "Ribojama prieiga dėl saugumo",
    description:
      "Sistemos administratoriai tikrina galimą saugumo incidentą. Prieiga laikinai apribota, kad būtų apsaugoti vartotojų duomenys.",
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
