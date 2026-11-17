import { progressPct } from "@/lib/teacher-students";

type CsvStudent = {
  full_name: string | null;
  email: string | null;
  class_year: string | null;
  class_letter: string | null;
  hours_earned: number;
  hours_needed: number;
};

const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

/** Excel-friendly CSV: UTF-8 BOM (keeps Lithuanian letters), semicolons, every cell quoted. */
export function buildStudentsCsv(students: readonly CsvStudent[]): string {
  const rows: unknown[][] = [
    ["Vardas ir pavardė", "Klasė", "Klasės raidė", "Surinkta valandų", "Reikia valandų", "Progresas (%)", "El. paštas"],
    ...students.map((s) => [s.full_name, s.class_year, s.class_letter, s.hours_earned, s.hours_needed, progressPct(s), s.email]),
  ];
  return "\uFEFF" + rows.map((row) => row.map(quote).join(";")).join("\r\n");
}

export function downloadStudentsCsv(students: readonly CsvStudent[], today = new Date()) {
  const url = URL.createObjectURL(new Blob([buildStudentsCsv(students)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `mokiniai-${today.toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
