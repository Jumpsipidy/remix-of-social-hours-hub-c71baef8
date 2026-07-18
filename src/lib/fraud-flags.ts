// Heuristikos, žymėti įtartinas rezervacijas mokyklos administratoriui.
// Grynas TypeScript — jokių DB, jokios sesijos. Skaičiuojama kliento pusėje iš jau paimtų duomenų.

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
};

export type FraudFlag = {
  code: "long_session" | "duplicate_day" | "overlap" | "future_date" | "midnight" | "instant_complete" | "big_claim" | "weekend_school_hours";
  severity: "low" | "medium" | "high";
  label: string;
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function detectFlags(r: ReservationLike, allForStudent: ReservationLike[]): FraudFlag[] {
  const flags: FraudFlag[] = [];
  const h = Number(r.hours_to_earn) || 0;
  const start = toMinutes(r.start_time || "00:00");
  const end = toMinutes(r.end_time || "00:00");

  if (h >= 10) flags.push({ code: "big_claim", severity: "high", label: `Labai daug valandų (${h})` });
  else if (h >= 8) flags.push({ code: "long_session", severity: "medium", label: `Ilga sesija (${h} val.)` });

  if (end <= start) flags.push({ code: "overlap", severity: "high", label: "Neteisingas laiko intervalas" });

  // Naktinės valandos — 22:00–06:00
  if (start < 6 * 60 || end > 22 * 60) {
    flags.push({ code: "midnight", severity: "medium", label: "Naktinės valandos" });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (r.reservation_date > today && (r.status === "completed" || r.status === "confirmed")) {
    flags.push({ code: "future_date", severity: "high", label: "Ateities data, bet jau užbaigta" });
  }

  // Persidengimas / dublikatas tą pačią dieną tam pačiam mokiniui
  const sameDay = allForStudent.filter((x) => x.id !== r.id && x.reservation_date === r.reservation_date);
  if (sameDay.length > 0) {
    let overlaps = 0;
    for (const x of sameDay) {
      const xs = toMinutes(x.start_time);
      const xe = toMinutes(x.end_time);
      if (xs < end && start < xe) overlaps++;
    }
    if (overlaps > 0) flags.push({ code: "overlap", severity: "high", label: `Persidengia su ${overlaps} kita rezervacija` });
    else flags.push({ code: "duplicate_day", severity: "low", label: `${sameDay.length + 1} rezervacijos tą pačią dieną` });
  }

  // Momentinis užbaigimas — sukurta ir užbaigta per < 10 min.
  if (r.created_at && (r.status === "completed" || r.status === "confirmed")) {
    const createdMs = new Date(r.created_at).getTime();
    const resMs = new Date(r.reservation_date + "T" + r.end_time).getTime();
    if (Math.abs(resMs - createdMs) < 10 * 60 * 1000) {
      flags.push({ code: "instant_complete", severity: "medium", label: "Sukurta ir užbaigta beveik akimirksniu" });
    }
  }

  // Savaitgalis mokyklos valandomis? — informacinis
  const dow = new Date(r.reservation_date + "T00:00").getDay();
  if (dow >= 1 && dow <= 5 && start >= 8 * 60 && end <= 15 * 60) {
    flags.push({ code: "weekend_school_hours", severity: "low", label: "Vyko darbo dieną pamokų metu" });
  }

  return flags;
}

export function highestSeverity(flags: FraudFlag[]): "none" | "low" | "medium" | "high" {
  if (flags.some((f) => f.severity === "high")) return "high";
  if (flags.some((f) => f.severity === "medium")) return "medium";
  if (flags.some((f) => f.severity === "low")) return "low";
  return "none";
}
