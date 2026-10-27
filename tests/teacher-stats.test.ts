import { describe, expect, it } from "vitest";
import { classBreakdown, classKeyOf, greetingForHour, hoursByClass, hoursByMonth, monthTrend } from "@/lib/teacher-stats";

describe("greetingForHour", () => {
  it("rytas, diena, vakaras", () => {
    expect(greetingForHour(7)).toBe("Labas rytas");
    expect(greetingForHour(13)).toBe("Laba diena");
    expect(greetingForHour(20)).toBe("Labas vakaras");
  });
});

describe("hoursByMonth", () => {
  const now = new Date(2026, 9, 15); // 2026-10
  it("skaiciuoja tik uzbaigtas valandas pagal menesi", () => {
    const rows = [
      { reservation_date: "2026-10-03", hours_to_earn: 2, status: "completed" },
      { reservation_date: "2026-10-10", hours_to_earn: 3, status: "confirmed" },
      { reservation_date: "2026-10-11", hours_to_earn: 5, status: "pending" },
      { reservation_date: "2026-09-01", hours_to_earn: 4, status: "completed" },
    ];
    const out = hoursByMonth(rows, 2, now);
    expect(out).toEqual([
      { label: "Rgs", hrs: 4 },
      { label: "Spa", hrs: 5 },
    ]);
  });
  it("tuščias sarasas – nuliai", () => {
    expect(hoursByMonth([], 3, now).every((p) => p.hrs === 0)).toBe(true);
  });
});

describe("hoursByClass / classBreakdown", () => {
  const students = [
    { class_year: "7", class_letter: "A", hours_earned: 10, hours_needed: 20 },
    { class_year: "7", class_letter: "A", hours_earned: 20, hours_needed: 20 },
    { class_year: "7", class_letter: "B", hours_earned: 5, hours_needed: 20 },
  ];
  it("grupuoja valandas pagal klase", () => {
    expect(hoursByClass(students)).toEqual([
      { name: "7 A", hrs: 30 },
      { name: "7 B", hrs: 5 },
    ]);
  });
  it("vidutinis progresas suapvalintas", () => {
    expect(classBreakdown(students)).toEqual([
      { key: "7 A", count: 2, avg: 75 },
      { key: "7 B", count: 1, avg: 25 },
    ]);
  });
  it("klase be raides ir be metu", () => {
    expect(classKeyOf({ class_year: "8", class_letter: null })).toBe("8");
    expect(classKeyOf({ class_year: null, class_letter: null })).toBe("—");
  });
});

describe("monthTrend", () => {
  it("skaiciuoja pokyti tarp paskutiniu dvieju menesiu", () => {
    expect(monthTrend([{ hrs: 10 }, { hrs: 15 }])).toBe(50);
    expect(monthTrend([{ hrs: 10 }, { hrs: 5 }])).toBe(-50);
  });
  it("null kai nera ko lyginti", () => {
    expect(monthTrend([{ hrs: 0 }, { hrs: 0 }])).toBeNull();
    expect(monthTrend([{ hrs: 1 }])).toBeNull();
  });
  it("100 kai prieš tai buvo 0", () => {
    expect(monthTrend([{ hrs: 0 }, { hrs: 4 }])).toBe(100);
  });
});
