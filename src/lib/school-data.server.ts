/** Server-only helpers for school dashboard data (kept out of *.functions.ts). */

export const RES_COLUMNS =
  "id, student_id, organization_id, reservation_date, start_time, end_time, hours_to_earn, status, legal_disclosure, created_at, checked_in_at, checked_in_by";

export function isMissingAssignedClasses(message?: string | null): boolean {
  const m = (message ?? "").toLowerCase();
  return (
    m.includes("assigned_classes") &&
    (m.includes("does not exist") || m.includes("schema cache") || m.includes("column"))
  );
}
