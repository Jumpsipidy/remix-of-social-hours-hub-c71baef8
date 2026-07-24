import { supabase } from "@/integrations/supabase/client";

/**
 * Detect Lovable preview / staging iframe so its traffic never pollutes
 * production analytics. Matches the preview host pattern and any embedded
 * iframe context (Lovable renders the app inside an iframe on lovable.dev).
 */
export const PREVIEW_COUNT_STORAGE_KEY = "analytics_count_preview";

/**
 * When true, preview/iframe traffic is counted in analytics (admin opt-in).
 * Default false — Lovable sandbox + localhost never pollute production stats.
 */
function shouldCountPreview(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PREVIEW_COUNT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isPreviewEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const host = window.location.hostname || "";
    if (
      host.includes("lovable.app") ||
      host.includes("lovableproject.com") ||
      host.includes("lovable.dev") ||
      host.includes("sandbox") ||
      host === "localhost" ||
      host === "127.0.0.1"
    ) {
      return true;
    }
    if (window.self !== window.top) return true;
  } catch {
    // cross-origin frame access throws → we are inside an iframe
    return true;
  }
  return false;
}

// Analytics-only actions we skip inside preview to keep prod stats clean.
const PREVIEW_BLOCKED_ACTIONS = new Set([
  "page.view",
  "auth.signed_in",
  "auth.signed_out",
  "route.404",
]);

export type ActivityAction =
  | "reservation.created"
  | "reservation.proposed"
  | "reservation.approved"
  | "reservation.declined"
  | "reservation.completed"
  | "reservation.confirmed"
  | "task.created"
  | "task.deleted"
  | "friend.request_sent"
  | "friend.request_accepted"
  | "friend.request_declined"
  | "friend.unfriended"
  | "group.invited"
  | "group.invite_accepted"
  | "group.invite_declined"
  | "profile.updated"
  | "certificate.generated"
  | "auth.signed_in"
  | "auth.signed_out"
  | "page.view"
  | "client.error"
  | "supabase.error";

export type ActivityLogRow = {
  user_id?: string | null;
  action: ActivityAction | string;
  entity_type?: string | null;
  entity_id?: string | null;
  meta?: Record<string, unknown>;
};

/**
 * Compatible activity insert for both the newest schema and older deployed DBs.
 * Keep the wire payload to the long-lived columns only; entity details live in meta.
 */
export async function insertActivityLogRow(row: ActivityLogRow) {
  // Never log preview / iframe / localhost traffic — it distorts analytics
  // (fake „30 unique devices", USA/Linux fingerprints from Lovable sandbox).
  if (isPreviewEnvironment() && PREVIEW_BLOCKED_ACTIONS.has(row.action)) {
    return;
  }
  const meta = {
    ...(row.meta ?? {}),
    ...(row.entity_type ? { entity_type: row.entity_type } : {}),
    ...(row.entity_id ? { entity_id: row.entity_id } : {}),
  };

  await supabase.from("activity_log").insert({
    user_id: row.user_id ?? null,
    action: row.action,
    meta: meta as any,
  } as any);
}

/** Fire-and-forget activity logger. Silently ignores errors. */
export async function logActivity(
  action: ActivityAction,
  opts?: { entityType?: string; entityId?: string | null; meta?: Record<string, unknown> },
) {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return;
    await insertActivityLogRow({
      user_id: uid,
      action,
      entity_type: opts?.entityType ?? null,
      entity_id: opts?.entityId ?? null,
      meta: opts?.meta ?? {},
    });
  } catch {
    // ignore
  }
}

export const ACTION_LABELS: Record<string, { label: string; tone: "info" | "ok" | "warn" | "bad" }> = {
  "reservation.created": { label: "Sukūrė rezervaciją", tone: "info" },
  "reservation.proposed": { label: "Pasiūlė rezervaciją", tone: "info" },
  "reservation.approved": { label: "Patvirtino rezervaciją", tone: "ok" },
  "reservation.declined": { label: "Atmetė rezervaciją", tone: "bad" },
  "reservation.completed": { label: "Užbaigė užduotį", tone: "ok" },
  "reservation.confirmed": { label: "Patvirtino užbaigimą", tone: "ok" },
  "task.created": { label: "Paskelbė užduotį", tone: "info" },
  "task.deleted": { label: "Ištrynė užduotį", tone: "bad" },
  "friend.request_sent": { label: "Išsiuntė draugo kvietimą", tone: "info" },
  "friend.request_accepted": { label: "Priėmė draugo kvietimą", tone: "ok" },
  "friend.request_declined": { label: "Atmetė draugo kvietimą", tone: "warn" },
  "friend.unfriended": { label: "Pašalino draugą", tone: "warn" },
  "group.invited": { label: "Pakvietė į grupinę rezervaciją", tone: "info" },
  "group.invite_accepted": { label: "Prisijungė prie grupinės rezervacijos", tone: "ok" },
  "group.invite_declined": { label: "Atmetė grupinį kvietimą", tone: "warn" },
  "profile.updated": { label: "Atnaujino profilį", tone: "info" },
  "certificate.generated": { label: "Sugeneravo sertifikatą", tone: "ok" },
  "auth.signed_in": { label: "Prisijungė", tone: "info" },
  "auth.signed_out": { label: "Atsijungė", tone: "info" },
  "page.view": { label: "Peržiūrėjo puslapį", tone: "info" },
};
