/**
 * Grynos auklėtojo skydelio statistikos funkcijos – be React, kad būtų
 * lengvai testuojamos. Visos datos traktauojamos kaip ISO „YYYY-MM-DD“.
 */

export type HoursRow = {
  reservation_date: string;
  hours_to_earn: number;
  status: string;
};

export type StudentRow = {
  class_year: string | null;
  class_letter: string | null;
  hours_earned: number;
  hours_needed: number;
};

/** Pasisveikinimas pagal paros laiką (Vilniaus valanda). */
export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return "Labas rytas";
  if (hour >= 12 && hour < 18) return "Laba diena";
  return "Labas vakaras";
}

const LT_MONTHS = ["Sau", "Vas", "Kov", "Bal", "Geg", "Bir", "Lie", "Rgp", "Rgs", "Spa", "Lap", "Grd"];

/** Užbaigtų valandų suvestinė pagal mėnesius (paskutiniai `months` mėn.). */
export function hoursByMonth(rows: HoursRow[], months = 12, now = new Date()): { label: string; hrs: number }[] {
  const done = rows.filter((r) => r.status === "completed" || r.status === "confirmed");
  const out: { label: string; hrs: number }[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const hrs = done
      .filter((r) => r.reservation_date.slice(0, 7) === key)
      .reduce((a, r) => a + Number(r.hours_to_earn), 0);
    out.push({ label: LT_MONTHS[d.getMonth()], hrs });
  }
  return out;
}

/** Sulygiuota klasės žymė: „7 A“, „10 B“ arba „—“, kai klasė nežinoma. */
export function classKeyOf(s: Pick<StudentRow, "class_year" | "class_letter">): string {
  return `${s.class_year ?? "—"}${s.class_letter ? ` ${s.class_letter}` : ""}`;
}

/** Valandos pagal klases (stulpelinei diagramai). */
export function hoursByClass(students: StudentRow[]): { name: string; hrs: number }[] {
  const map = new Map<string, number>();
  for (const s of students) {
    const key = classKeyOf(s);
    map.set(key, (map.get(key) ?? 0) + Number(s.hours_earned));
  }
  return [...map.entries()]
    .map(([name, hrs]) => ({ name, hrs }))
    .sort((a, b) => a.name.localeCompare(b.name, "lt", { numeric: true }));
}

/** Klasių progreso suvestinė: mokinių skaičius ir vidutinis progresas. */
export function classBreakdown(students: StudentRow[]): { key: string; count: number; avg: number }[] {
  const map = new Map<string, { count: number; sum: number }>();
  for (const s of students) {
    const key = classKeyOf(s);
    const g = map.get(key) ?? { count: 0, sum: 0 };
    g.count += 1;
    g.sum += s.hours_needed ? Math.min(100, Math.round((s.hours_earned / s.hours_needed) * 100)) : 0;
    map.set(key, g);
  }
  return [...map.entries()]
    .map(([key, g]) => ({ key, count: g.count, avg: g.count ? Math.round(g.sum / g.count) : 0 }))
    .sort((a, b) => a.key.localeCompare(b.key, "lt", { numeric: true }));
}

/** Procentinis pokytis tarp dviejų paskutinių mėnesių (null, kai nėra ko lyginti). */
export function monthTrend(points: { hrs: number }[]): number | null {
  if (points.length < 2) return null;
  const prev = points[points.length - 2].hrs;
  const cur = points[points.length - 1].hrs;
  if (prev === 0) return cur > 0 ? 100 : null;
  return Math.round(((cur - prev) / prev) * 100);
}
