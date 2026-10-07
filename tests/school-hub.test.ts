import { describe, it, expect } from "vitest";
import { classLabel, KIND_LABEL } from "@/components/school/school-hub";

describe("school hub rules", () => {
  it("shows class number with letter", () => {
    expect(classLabel({ class_year: "5", class_letter: "B" })).toBe("5B");
    expect(classLabel({ class_year: "9 / I gimn.", class_letter: "A" })).toBe("9A (I gimn.)");
  });
  it("names activity kinds in Lithuanian", () => {
    expect(KIND_LABEL.volunteer).toBe("Dirbo");
    expect(KIND_LABEL.consultation).toBe("Pasitarimo valandos");
  });
});
