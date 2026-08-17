// Human-friendly incident codes: "SC-123456".
// Shown to the user on every error screen so they can send it to the admin,
// and stored on the activity_log row so the admin can look it up.

export const INCIDENT_CODE_RX = /^[A-Z0-9#]{4,10}$/i;

export function newIncidentCode(): string {
  // Generate a random 7-character alphanumeric code starting with #
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let res = "#";
  for (let i = 0; i < 6; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

/** Accepts "123456", "sc123456", "#A1B2C3D" → normalized code. */
export function normalizeIncidentCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // If it starts with # or SC-, keep it as is but uppercase
  let clean = raw.trim().toUpperCase();
  if (clean.startsWith("SC-")) return clean;
  if (clean.startsWith("#")) return clean;
  
  // Otherwise, if it's just numbers/letters
  const cleanBase = clean.replace(/[^A-Z0-9]/g, "");
  
  // If it's exactly 6 digits, it's a legacy SC code
  if (cleanBase.length === 6 && /^\d+$/.test(cleanBase)) {
    return `SC-${cleanBase}`;
  }
  
  // Otherwise, it's a new alphanumeric code (ensure it starts with #)
  return clean.startsWith("#") ? clean : `#${clean}`;
}
