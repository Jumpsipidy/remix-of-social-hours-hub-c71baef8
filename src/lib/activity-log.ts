import { supabase } from "@/integrations/supabase/client";

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
  | "page.view";

/** Fire-and-forget activity logger. Silently ignores errors. */
export async function logActivity(
  action: ActivityAction,
  opts?: { entityType?: string; entityId?: string | null; meta?: Record<string, unknown> },
) {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return;
    await supabase.from("activity_log").insert({
      user_id: uid,
      action,
      entity_type: opts?.entityType ?? null,
      entity_id: opts?.entityId ?? null,
      meta: (opts?.meta ?? {}) as any,
    } as any);
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
};
