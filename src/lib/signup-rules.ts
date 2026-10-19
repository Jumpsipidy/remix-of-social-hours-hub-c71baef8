import { CLASS_YEARS } from "@/lib/class-years";

export function classAssignment(row: { school_id: string; class_year: string; class_letter: string; is_active: boolean } | null, schoolId: string) {
  if (!row?.is_active || row.school_id !== schoolId || !CLASS_YEARS.some((year) => year === row.class_year) || !["A", "B"].includes(row.class_letter)) return null;
  return { schoolId: row.school_id, classYear: row.class_year, classLetter: row.class_letter as "A" | "B" };
}

export function signupHours(year: string, requested: number) {
  return ["5", "6", "7"].includes(year) ? 20 : Math.min(500, Math.max(8, Math.round(requested)));
}

export function registrationComplete(profile: { school_id?: string | null; class_year?: string | null; class_letter?: string | null } | null) {
  return Boolean(profile?.school_id && profile.class_year && profile.class_letter);
}