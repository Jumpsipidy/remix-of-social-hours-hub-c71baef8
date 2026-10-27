import { describe, expect, it } from "vitest";
import {
  classLabel,
  classOptions,
  progressPct,
  sortStudents,
  studentSummary,
  type StudentLike,
} from "../src/lib/teacher-students";

const s = (over: Partial<StudentLike>): StudentLike => ({
  id: over.id ?? Math.random().toString(36).slice(2),
  full_name: over.full_name ?? "Vardas Pavardė",
  class_year: "class_year" in over ? (over.class_year ?? null) : "7",
  class_letter: "class_letter" in over ? (over.class_letter ?? null) : "A",
  hours_earned: over.hours_earned ?? 0,
  hours_needed: over.hours_needed ?? 20,
  login_streak: over.login_streak ?? 0,
});

describe("progressPct", () => {
  it("skaičiuoja procentus ir riboja iki 100", () => {
    expect(progressPct(s({ hours_earned: 10, hours_needed: 20 }))).toBe(50);
    expect(progressPct(s({ hours_earned: 30, hours_needed: 20 }))).toBe(100);
  });
  it("grąžina 0, kai norma nenustatyta", () => {
    expect(progressPct(s({ hours_needed: 0 }))).toBe(0);
  });
});

describe("classLabel / classOptions", () => {
  it("jungia metus ir raidę", () => {
    expect(classLabel(s({ class_year: "7", class_letter: "B" }))).toBe("7B");
    expect(classLabel(s({ class_year: null, class_letter: null }))).toBe("—");
  });
  it("grąžina unikalias rūšiuotas klases", () => {
    const list = [
      s({ class_year: "8", class_letter: "A" }),
      s({ class_year: "7", class_letter: "B" }),
      s({ class_year: "7", class_letter: "A" }),
      s({ class_year: "7", class_letter: "A" }),
    ];
    expect(classOptions(list)).toEqual(["7A", "7B", "8A"]);
  });
});

describe("sortStudents", () => {
  const list = [
    s({ full_name: "Živilė", hours_earned: 18, login_streak: 2 }),
    s({ full_name: "Antanas", hours_earned: 4, login_streak: 9 }),
    s({ full_name: "Marta", hours_earned: 10, login_streak: 5 }),
  ];
  it("rūšiuoja pagal progresą didėjančiai ir mažėjančiai", () => {
    expect(sortStudents(list, "progress-asc").map((x) => x.hours_earned)).toEqual([4, 10, 18]);
    expect(sortStudents(list, "progress-desc").map((x) => x.hours_earned)).toEqual([18, 10, 4]);
  });
  it("rūšiuoja pagal vardą lietuviškai ir pagal streak", () => {
    expect(sortStudents(list, "name").map((x) => x.full_name)).toEqual(["Antanas", "Marta", "Živilė"]);
    expect(sortStudents(list, "streak").map((x) => x.login_streak)).toEqual([9, 5, 2]);
  });
  it("nemutuoja pradinio masyvo", () => {
    const before = list.map((x) => x.full_name);
    sortStudents(list, "name");
    expect(list.map((x) => x.full_name)).toEqual(before);
  });
});

describe("studentSummary", () => {
  it("skaičiuoja suvestinę", () => {
    const list = [
      s({ hours_earned: 20 }), // 100 %
      s({ hours_earned: 10 }), // 50 %
      s({ hours_earned: 2 }),  // 10 % -> reikia dėmesio
    ];
    const sum = studentSummary(list);
    expect(sum.total).toBe(3);
    expect(sum.totalHours).toBe(32);
    expect(sum.avgPct).toBe(53);
    expect(sum.attention).toBe(1);
  });
  it("tuščias sąrašas — nuliai", () => {
    expect(studentSummary([])).toEqual({ total: 0, avgPct: 0, totalHours: 0, attention: 0 });
  });
});
