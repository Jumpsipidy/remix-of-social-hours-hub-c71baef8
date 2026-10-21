import { describe, expect, it } from "vitest";
import { matchesChatFilter, messageIsRetained } from "../src/lib/chat-list";
describe("chat rules", () => {
  const student = { student_id: "student", unread: 2, last_at: "2026-10-21T18:40:00Z" };
  it("filters unread chats", () => {
    expect(matchesChatFilter(student, "unread")).toBe(true);
    expect(matchesChatFilter({ ...student, unread: 0 }, "unread")).toBe(false);
  });
  it("separates students and school chats", () => {
    expect(matchesChatFilter(student, "students")).toBe(true);
    expect(matchesChatFilter(student, "school")).toBe(false);
    expect(matchesChatFilter({ ...student, student_id: null }, "school")).toBe(true);
  });
  it("filters last activity by inclusive Vilnius dates", () => {
    expect(matchesChatFilter(student, "all", "2026-10-21", "2026-10-21")).toBe(true);
    expect(matchesChatFilter(student, "all", "2026-10-22")).toBe(false);
    expect(matchesChatFilter(student, "all", "", "2026-10-20")).toBe(false);
  });
  it("retains messages for twelve days, not two", () => {
    const now = Date.parse("2026-10-21T18:40:00Z");
    expect(messageIsRetained("2026-10-09T18:40:00Z", now)).toBe(true);
    expect(messageIsRetained("2026-10-09T18:39:59Z", now)).toBe(false);
    expect(messageIsRetained("2026-10-18T18:40:00Z", now)).toBe(true);
  });
});