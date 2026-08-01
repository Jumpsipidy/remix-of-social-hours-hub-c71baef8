// Heuristikos, žymėti įtartinas rezervacijas mokyklos administratoriui.
// Grynas TypeScript — jokių DB, jokios sesijos. Skaičiuojama kliento pusėje iš jau paimtų duomenų.

import { isRuleEnabled, type RuleId } from "./anti-cheat-config";

export type ReservationLike = {
  id: string;
  student_id: string;
  organization_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  hours_to_earn: number;
  status: string;
  created_at?: string;
  /** Užpildyta, kai organizacija vietoje nuskenavo mokinio QR. */
  checked_in_at?: string | null;
};

export type FraudFlag = {
  code: RuleId;
  severity: "low" | "medium" | "high";
  label: string;
};

export type FlagContext = {
  /** Taisyklių jungikliai iš /admin/anticheat (localStorage). */
  config?: Record<string, boolean>;
  /** Kiek valandų mokiniui iš viso reikia. */
  hoursNeeded?: number;
  /** Dienos riba valandomis. */
  dailyCap?: number;
};

const DAY_MS = 86_400_000;
/** Lietuvos valstybinės / mokyklinės šventės (MM-DD). */
const HOLIDAYS = new Set([
  "01-01", "02-16", "03-11", "05-01", "06-24", "07-06", "08-15", "11-01", "11-02", "12-24", "12-25", "12-26",
]);

function toMinutes(hhmm: string): number {
  const [h, m] = String(hhmm ?? "00:00").split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function isCounted(status: string): boolean {
  return status === "completed" || status === "confirmed";
}

export function detectFlags(
  r: ReservationLike,
  allForStudent: ReservationLike[],
  ctx: FlagContext = {},
): FraudFlag[] {
  const flags: FraudFlag[] = [];
  const on = (id: RuleId) => isRuleEnabled(ctx.config, id);
  const push = (code: RuleId, severity: FraudFlag["severity"], label: string) => {
    if (on(code)) flags.push({ code, severity, label });
  };

  const h = Number(r.hours_to_earn) || 0;
  const start = toMinutes(r.start_time || "00:00");
  const end = toMinutes(r.end_time || "00:00");
  const counted = allForStudent.filter((x) => isCounted(x.status));
  const totalHours = counted.reduce((s, x) => s + (Number(x.hours_to_earn) || 0), 0);

  if (h >= 10) push("big_claim", "high", `Labai daug valandų (${h})`);
  else if (h >= 8) push("long_session", "medium", `Ilga sesija (${h} val.)`);

  if (end <= start) push("bad_interval", "high", "Neteisingas laiko intervalas");

  // Naktinės valandos — 22:00–06:00
  if (start < 6 * 60 || end > 22 * 60) push("midnight", "medium", "Naktinės valandos");

  const today = new Date().toISOString().slice(0, 10);
  if (r.reservation_date > today && isCounted(r.status)) {
    push("future_date", "high", "Ateities data, bet jau užbaigta");
  }

  // Persidengimas / dublikatas tą pačią dieną tam pačiam mokiniui
  const sameDay = allForStudent.filter(
    (x) => x.id !== r.id && x.reservation_date === r.reservation_date,
  );
  if (sameDay.length > 0) {
    let overlaps = 0;
    for (const x of sameDay) {
      if (toMinutes(x.start_time) < end && start < toMinutes(x.end_time)) overlaps++;
    }
    if (overlaps > 0) push("overlap", "high", `Persidengia su ${overlaps} kita rezervacija`);
    else push("duplicate_day", "low", `${sameDay.length + 1} rezervacijos tą pačią dieną`);
  }

  // Momentinis užbaigimas — sukurta ir užbaigta per < 10 min.
  if (r.created_at && isCounted(r.status)) {
    const createdMs = new Date(r.created_at).getTime();
    const resMs = new Date(`${r.reservation_date}T${r.end_time || "00:00"}`).getTime();
    if (Math.abs(resMs - createdMs) < 10 * 60 * 1000) {
      push("instant_complete", "medium", "Sukurta ir užbaigta beveik akimirksniu");
    }
  }

  const dow = new Date(`${r.reservation_date}T00:00`).getDay();
  if (dow >= 1 && dow <= 5 && start >= 8 * 60 && end <= 15 * 60) {
    push("school_hours", "low", "Vyko darbo dieną pamokų metu");
  }

  // ---- Naujos bazinės taisyklės -------------------------------------------

  // 1) Užskaitytos valandos be QR patvirtinimo vietoje.
  if (isCounted(r.status) && !r.checked_in_at) {
    push("no_qr_proof", "medium", "Užskaityta be QR patvirtinimo vietoje");
  }

  // 2) Dienos riba (numatyta 8 val./d.).
  const cap = ctx.dailyCap ?? 8;
  const dayTotal =
    h + sameDay.filter((x) => isCounted(x.status)).reduce((s, x) => s + (Number(x.hours_to_earn) || 0), 0);
  if (dayTotal > cap) {
    push("over_daily_cap", "high", `Per dieną ${dayTotal} val. (riba ${cap})`);
  }

  // 3) Vienas įrašas padengia daugiau nei pusę viso reikalavimo.
  if (ctx.hoursNeeded && ctx.hoursNeeded > 0 && h > ctx.hoursNeeded * 0.5) {
    push("exceeds_needed", "high", `Vienas įrašas = ${Math.round((h / ctx.hoursNeeded) * 100)}% viso reikalavimo`);
  }

  // 4) Įrašas sukurtas gerokai po veiklos datos.
  if (r.created_at) {
    const diff = new Date(r.created_at).getTime() - new Date(`${r.reservation_date}T23:59`).getTime();
    if (diff > 30 * DAY_MS) {
      push("backdated_entry", "medium", `Įvesta ${Math.round(diff / DAY_MS)} d. po veiklos`);
    }
  }

  // ---- Eksperimentinės taisyklės ------------------------------------------

  if (on("single_org_monoculture") && counted.length >= 3 && totalHours > 0) {
    const byOrg = new Map<string, number>();
    for (const x of counted) {
      byOrg.set(x.organization_id, (byOrg.get(x.organization_id) ?? 0) + (Number(x.hours_to_earn) || 0));
    }
    const top = Math.max(...byOrg.values());
    if (top / totalHours >= 0.9) {
      push("single_org_monoculture", "medium", "Beveik visos valandos iš vienos organizacijos");
    }
  }

  if (on("round_hours_pattern") && counted.length >= 3) {
    const allRound = counted.every((x) => [2, 4, 6, 8].includes(Number(x.hours_to_earn)));
    if (allRound) push("round_hours_pattern", "low", "Visi įrašai — apvalios valandos");
  }

  if (on("burst_accumulation")) {
    const anchor = new Date(`${r.reservation_date}T00:00`).getTime();
    const window7 = counted
      .filter((x) => Math.abs(new Date(`${x.reservation_date}T00:00`).getTime() - anchor) <= 7 * DAY_MS)
      .reduce((s, x) => s + (Number(x.hours_to_earn) || 0), 0);
    if (window7 >= 12) push("burst_accumulation", "medium", `${window7} val. per 7 dienas`);
  }

  if (on("identical_timeslots")) {
    const same = counted.filter((x) => x.start_time === r.start_time && x.end_time === r.end_time);
    if (same.length >= 3) push("identical_timeslots", "low", `${same.length} įrašai su identišku laiku`);
  }

  if (on("weekend_marathon") && (dow === 0 || dow === 6)) {
    const anchor = new Date(`${r.reservation_date}T00:00`).getTime();
    const weekend = counted
      .filter((x) => {
        const d = new Date(`${x.reservation_date}T00:00`);
        const wd = d.getDay();
        return (wd === 0 || wd === 6) && Math.abs(d.getTime() - anchor) <= DAY_MS;
      })
      .reduce((s, x) => s + (Number(x.hours_to_earn) || 0), 0);
    if (weekend > 8) push("weekend_marathon", "medium", `${weekend} val. per vieną savaitgalį`);
  }

  if (on("holiday_claim") && HOLIDAYS.has(r.reservation_date.slice(5, 10))) {
    push("holiday_claim", "low", "Veikla valstybinės šventės dieną");
  }

  if (on("late_bulk_before_deadline") && totalHours > 0) {
    const nowMs = Date.now();
    const recent = counted
      .filter((x) => nowMs - new Date(`${x.reservation_date}T00:00`).getTime() <= 14 * DAY_MS)
      .reduce((s, x) => s + (Number(x.hours_to_earn) || 0), 0);
    if (recent / totalHours >= 0.7 && counted.length >= 3) {
      push("late_bulk_before_deadline", "low", "≥70% valandų per paskutines 2 savaites");
    }
  }

  return flags;
}

export function highestSeverity(flags: FraudFlag[]): "none" | "low" | "medium" | "high" {
  if (flags.some((f) => f.severity === "high")) return "high";
  if (flags.some((f) => f.severity === "medium")) return "medium";
  if (flags.some((f) => f.severity === "low")) return "low";
  return "none";
}

/** Bendras rizikos balas 0–100 (kuo didesnis, tuo įtartinesnis). */
export function riskScore(flags: FraudFlag[]): number {
  const weight = { low: 6, medium: 16, high: 30 } as const;
  return Math.min(100, flags.reduce((s, f) => s + weight[f.severity], 0));
}
