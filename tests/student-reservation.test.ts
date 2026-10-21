import { describe, expect, it } from "vitest";
import { isActiveStudentReservation, studentReservationNeedsQr, studentReservationStatus } from "../src/lib/student-reservation";

describe("school reservations in the student dashboard", () => {
  const school = { source: "school", requires_checkin: false, status: "approved" };
  it("includes teacher-created reservations immediately as active", () => {
    expect(isActiveStudentReservation(school)).toBe(true);
    expect(isActiveStudentReservation({ ...school, status: "completed" })).toBe(false);
  });
  it("does not request student confirmation for school reservations", () => {
    expect(studentReservationStatus(school)).toBe("Suplanuota auklėtojo");
    expect(studentReservationStatus({ ...school, status: "pending" })).toBe("Suplanuota auklėtojo");
    expect(studentReservationStatus({ source: "student", status: "pending" })).toBe("Laukia patvirtinimo");
  });
  it("requires QR for approved organization visits only", () => {
    expect(studentReservationNeedsQr(school)).toBe(false);
    expect(studentReservationNeedsQr({ ...school, requires_checkin: true })).toBe(false);
    expect(studentReservationNeedsQr({ source: "student", requires_checkin: true, status: "approved" })).toBe(true);
    expect(studentReservationNeedsQr({ source: "student", requires_checkin: true, status: "pending" })).toBe(false);
  });
});