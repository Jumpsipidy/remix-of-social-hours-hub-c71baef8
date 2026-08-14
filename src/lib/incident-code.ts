// Human-friendly incident codes: "SC-123456".
// Shown to the user on every error screen so they can send it to the admin,
// and stored on the activity_log row so the admin can look it up.

export const INCIDENT_CODE_RX = /^SC-\d{6}$/;

export function newIncidentCode(): string {
  const n = Math.floor(Math.random() * 900_000) + 100_000;
  return `SC-${n}`;
}

/** Accepts "123456", "sc123456", "SC-123456" → "SC-123456" (or null). */
export function normalizeIncidentCode(raw: string | null | undefined): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length !== 6) return null;
  return `SC-${digits}`;
}
