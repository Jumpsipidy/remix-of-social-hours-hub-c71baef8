// Anti-sukčiavimo taisyklių registras.
// Bazinės taisyklės visada įjungtos. „Eksperimentinės" – išjungtos pagal
// nutylėjimą ir įjungiamos super administratoriaus skydelyje (/admin/anticheat),
// nes jos gali duoti klaidingų pažymėjimų (false positives).

export type RuleId =
  // bazinės
  | "big_claim"
  | "long_session"
  | "bad_interval"
  | "midnight"
  | "future_date"
  | "overlap"
  | "duplicate_day"
  | "instant_complete"
  | "school_hours"
  // naujos (bazinės)
  | "no_qr_proof"
  | "over_daily_cap"
  | "exceeds_needed"
  | "backdated_entry"
  // eksperimentinės
  | "single_org_monoculture"
  | "round_hours_pattern"
  | "burst_accumulation"
  | "identical_timeslots"
  | "weekend_marathon"
  | "holiday_claim"
  | "late_bulk_before_deadline";

export type RuleMeta = {
  id: RuleId;
  label: string;
  description: string;
  experimental: boolean;
  defaultOn: boolean;
  risk: string;
};

export const ANTI_CHEAT_RULES: RuleMeta[] = [
  { id: "big_claim", label: "Labai daug valandų", description: "Viena rezervacija ≥ 10 val.", experimental: false, defaultOn: true, risk: "Žema" },
  { id: "long_session", label: "Ilga sesija", description: "Viena rezervacija 8–10 val.", experimental: false, defaultOn: true, risk: "Žema" },
  { id: "bad_interval", label: "Blogas laiko intervalas", description: "Pabaiga anksčiau arba lygi pradžiai.", experimental: false, defaultOn: true, risk: "Žema" },
  { id: "midnight", label: "Naktinės valandos", description: "Veikla prieš 06:00 arba po 22:00.", experimental: false, defaultOn: true, risk: "Žema" },
  { id: "future_date", label: "Ateities data", description: "Užbaigta veikla, kurios data dar neatėjo.", experimental: false, defaultOn: true, risk: "Žema" },
  { id: "overlap", label: "Persidengiančios rezervacijos", description: "Dvi veiklos tuo pačiu metu.", experimental: false, defaultOn: true, risk: "Žema" },
  { id: "duplicate_day", label: "Kelios veiklos per dieną", description: "Tą pačią dieną kelios rezervacijos.", experimental: false, defaultOn: true, risk: "Žema" },
  { id: "instant_complete", label: "Momentinis užbaigimas", description: "Sukurta ir uždaryta beveik akimirksniu.", experimental: false, defaultOn: true, risk: "Žema" },
  { id: "school_hours", label: "Pamokų metu", description: "Darbo diena 08:00–15:00.", experimental: false, defaultOn: true, risk: "Žema" },
  { id: "no_qr_proof", label: "Be QR įrodymo", description: "Valandos užskaitytos be organizacijos QR patvirtinimo vietoje.", experimental: false, defaultOn: true, risk: "Žema" },
  { id: "over_daily_cap", label: "Viršyta dienos riba", description: "Daugiau nei 8 val. per vieną dieną (sumuojant).", experimental: false, defaultOn: true, risk: "Žema" },
  { id: "exceeds_needed", label: "Daugiau nei reikia", description: "Vienas įrašas padengia >50% viso reikalavimo.", experimental: false, defaultOn: true, risk: "Žema" },
  { id: "backdated_entry", label: "Atgaline data", description: "Įrašas sukurtas praėjus >30 d. po veiklos datos.", experimental: false, defaultOn: true, risk: "Žema" },

  { id: "single_org_monoculture", label: "Viskas iš vienos organizacijos", description: "≥90% valandų iš to paties partnerio ir ≥3 įrašai — dažnai „draugiškas“ pasirašymas.", experimental: true, defaultOn: false, risk: "Vidutinė — teisėti nuolatiniai savanoriai bus pažymėti" },
  { id: "round_hours_pattern", label: "Vien apvalios valandos", description: "Visi įrašai lygiai 2/4/8 val. — požymis, kad laikas ne fiksuojamas, o „pasirenkamas“.", experimental: true, defaultOn: false, risk: "Aukšta — daug klaidingų pažymėjimų" },
  { id: "burst_accumulation", label: "Staigus valandų šuolis", description: "≥12 val. surinkta per 7 dienas.", experimental: true, defaultOn: false, risk: "Vidutinė — stovyklos/talkos duoda tikrą šuolį" },
  { id: "identical_timeslots", label: "Identiški laikai", description: "≥3 įrašai su tuo pačiu pradžios ir pabaigos laiku.", experimental: true, defaultOn: false, risk: "Vidutinė" },
  { id: "weekend_marathon", label: "Savaitgalio maratonas", description: ">8 val. per vieną savaitgalį.", experimental: true, defaultOn: false, risk: "Vidutinė" },
  { id: "holiday_claim", label: "Per šventes", description: "Veikla valstybinės šventės dieną.", experimental: true, defaultOn: false, risk: "Žema, bet triukšminga" },
  { id: "late_bulk_before_deadline", label: "Viskas paskutinę minutę", description: "≥70% valandų surinkta per paskutines 14 dienų.", experimental: true, defaultOn: false, risk: "Aukšta — daugelis mokinių taip daro teisėtai" },
];

export const ANTI_CHEAT_STORAGE_KEY = "sv_anticheat_rules_v1";

function defaults(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const r of ANTI_CHEAT_RULES) out[r.id] = r.defaultOn;
  return out;
}

export function loadAntiCheatConfig(): Record<string, boolean> {
  const base = defaults();
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem(ANTI_CHEAT_STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    for (const k of Object.keys(base)) {
      if (typeof parsed[k] === "boolean") base[k] = parsed[k];
    }
  } catch {
    /* sugadinta konfigūracija — grįžtam prie numatytųjų */
  }
  return base;
}

export function saveAntiCheatConfig(cfg: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ANTI_CHEAT_STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    /* privatus režimas – ignoruojam */
  }
}

export function isRuleEnabled(cfg: Record<string, boolean> | undefined, id: RuleId): boolean {
  if (!cfg) {
    const meta = ANTI_CHEAT_RULES.find((r) => r.id === id);
    return meta ? meta.defaultOn : true;
  }
  return cfg[id] !== false;
}
