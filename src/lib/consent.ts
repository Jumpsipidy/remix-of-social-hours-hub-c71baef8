export type ConsentCategory = "necessary" | "analytics" | "marketing";
export interface ConsentRecord { version: number; timestamp: number; categories: Record<ConsentCategory, boolean> }
export const CONSENT_STORAGE_KEY = "sv_cookie_consent_v1";
export const CONSENT_CHANGED_EVENT = "sv:consent-changed";
export function parseConsent(raw: string | null, now = Date.now()): ConsentRecord | null {
  try {
    const record = JSON.parse(raw ?? "null");
    if (record?.version !== 1 || !Number.isFinite(record.timestamp) || record.timestamp > now || now - record.timestamp > 365 * 24 * 60 * 60 * 1000) return null;
    if (record.categories?.necessary !== true || typeof record.categories.analytics !== "boolean" || typeof record.categories.marketing !== "boolean") return null;
    return record;
  } catch { return null; }
}