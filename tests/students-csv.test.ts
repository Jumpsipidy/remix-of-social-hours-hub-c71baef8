import { describe, expect, it } from "vitest";
import { buildStudentsCsv } from "@/components/teacher/students-csv";

const base = { email: null, class_year: "10", class_letter: "A", hours_earned: 5, hours_needed: 10 };

describe("teacher student CSV export", () => {
  it("starts with a UTF-8 BOM so Excel keeps Lithuanian letters", () => {
    expect(buildStudentsCsv([]).charCodeAt(0)).toBe(0xfeff);
  });
  it("quotes names containing semicolons and quotes", () => {
    const csv = buildStudentsCsv([{ ...base, full_name: 'Jonas; "Ąžuolas"' }]);
    expect(csv).toContain('"Jonas; ""Ąžuolas"""');
  });
  it("writes one row per student with progress percent", () => {
    const lines = buildStudentsCsv([{ ...base, full_name: "Ona" }]).split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('"Ona";"10";"A";"5";"10";"50";""');
  });
});
