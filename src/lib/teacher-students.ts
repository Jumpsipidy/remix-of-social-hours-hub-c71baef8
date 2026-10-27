// Auklėtojo mokinių sąrašo gryniosios funkcijos (testuojamos be UI).

export interface StudentLike {
  id: string;
  full_name: string | null;
  class_year: string | null;
  class_letter: string | null;
  hours_earned: number;
  hours_needed: number;
  login_streak?: number | null;
}

export type StudentSort = "progress-asc" | "progress-desc" | "name" | "streak";

export const STUDENT_SORT_LABELS: Record<StudentSort, string> = {
  "progress-asc": "Progresas ↑",
  "progress-desc": "Progresas ↓",
  name: "Vardas A–Ž",
  streak: "Streak",
};

export function progressPct(s: Pick<StudentLike, "hours_earned" | "hours_needed">): number {
  return s.hours_needed ? Math.min(100, Math.round((s.hours_earned / s.hours_needed) * 100)) : 0;
}

/** Pilnas klasės pavadinimas, pvz. „7A“. */
export function classLabel(s: Pick<StudentLike, "class_year" | "class_letter">): string {
  return `${s.class_year ?? "—"}${s.class_letter ?? ""}`;
}

/** Unikalūs klasių filtrai (7A, 7B, 8A…), rūšiuoti pagal metus ir raidę. */
export function classOptions(students: StudentLike[]): string[] {
  const set = new Set(students.map(classLabel));
  return [...set].sort((a, b) => a.localeCompare(b, "lt", { numeric: true }));
}

export function sortStudents<T extends StudentLike>(list: T[], sort: StudentSort): T[] {
  const out = list.slice();
  switch (sort) {
    case "progress-asc":
      return out.sort((a, b) => progressPct(a) - progressPct(b));
    case "progress-desc":
      return out.sort((a, b) => progressPct(b) - progressPct(a));
    case "streak":
      return out.sort((a, b) => (b.login_streak ?? 0) - (a.login_streak ?? 0));
    case "name":
    default:
      return out.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? "", "lt"));
  }
}

export interface StudentSummary {
  total: number;
  avgPct: number;
  totalHours: number;
  attention: number;
}

export function studentSummary(students: StudentLike[]): StudentSummary {
  const total = students.length;
  const totalHours = students.reduce((a, s) => a + s.hours_earned, 0);
  const avgPct = total ? Math.round(students.reduce((a, s) => a + progressPct(s), 0) / total) : 0;
  const attention = students.filter((s) => progressPct(s) < 35).length;
  return { total, avgPct, totalHours, attention };
}
