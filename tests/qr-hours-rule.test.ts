import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/20261114185432_ca5741bf-e177-42c1-9912-841fcc27421b.sql", "utf8");

describe("organization hours require each person's QR scan", () => {
  it("gives the owner 0 hours when the owner did not scan", () => {
    expect(sql).toMatch(/owner_award := CASE WHEN needs_qr AND r\.checked_in_at IS NULL THEN 0 ELSE award END/);
  });
  it("gives friends hours only when they scanned", () => {
    expect(sql).toMatch(/AND \(NOT needs_qr OR rp\.checked_in_at IS NOT NULL\)/);
  });
  it("refuses to close a visit nobody scanned", () => {
    expect(sql).toContain("Niekas dar nenuskenavo QR kodo");
  });
  it("blocks completing organization visits outside the hour approval", () => {
    expect(sql).toContain("Valandos skiriamos tik per patvirtinimą po QR nuskenavimo");
  });
});
