/** Keep provider diagnostics out of visitor-facing messages. */
export function userError(error: unknown, fallback = "Nepavyko atlikti veiksmo. Bandyk dar kartą."): string {
  const value = error instanceof Error ? error.message : String((error as { message?: unknown } | null)?.message ?? "");
  if (/fetch|network|load failed|failed to send/i.test(value)) return "Nepavyko susisiekti su paslauga. Patikrink interneto ryšį ir bandyk dar kartą.";
  if (/expired|invalid.*token|token.*invalid|otp/i.test(value)) return "Kodas arba nuoroda negalioja. Paprašyk naujo laiško ir naudok naujausią kodą.";
  if (/rate.limit|too many|security purposes/i.test(value)) return "Per daug bandymų. Palauk kelias minutes ir bandyk dar kartą.";
  if (/already.*registered|already.*exists/i.test(value)) return "Šiuo el. paštu jau registruotasi. Prisijunk arba atkurk slaptažodį.";
  if (/email.*not.*confirmed/i.test(value)) return "Pirmiausia patvirtink el. paštą naudodamas nuorodą laiške.";
  if (/invalid.*credentials/i.test(value)) return "Neteisingas el. paštas arba slaptažodis.";
  return /[ąčęėįšųūž]/i.test(value) && !/https?:|PGRST|SQL|schema|column/i.test(value) ? value : fallback;
}

export function networkDiagnosis(message: string) {
  if (!/NetworkError|Failed to fetch|\[fetch:network\]|Load failed/i.test(message)) return null;
  return {
    suspected_cause: "Užklausa nepasiekė paslaugos arba atsakymas nepasiekė naršyklės. Galimos priežastys: nutrūkęs ryšys, DNS, naršyklės plėtinys, CORS arba paslaugos sutrikimas; iš šio įrašo vienos priežasties nustatyti negalima.",
    suggested_file: "unknown",
    suggested_fix: "1. Patikrink ryšį ir paslaugos būseną. 2. Tinklo žurnale patikrink, ar yra HTTP atsakymas ir CORS klaida. 3. Pakartok užklausą be blokuojančių plėtinių. Vien tinklo klaida neįrodo neteisingų select, where ar created_at reikšmių — nekeisk jų be HTTP klaidos įrodymo.",
    severity_estimate: "low",
    confidence: 0.5,
    prompt_for_agent: "Patikrink tinklo pasiekiamumą ir HTTP atsakymą. Nepriskirk klaidos SQL parametrams ar datai, jei serverio atsakymo nėra. Atskirai tikrink DNS, CORS, plėtinius ir paslaugos sutrikimą.",
  };
}