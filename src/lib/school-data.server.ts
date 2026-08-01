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

export type AdminProfileRow = {
  id?: string | null;
  role?: string | null;
  school_id?: string | null;
  associated_school_id?: string | null;
  assigned_classes?: string[] | null;
};

/**
 * Skaito administratoriaus profilį atsparia schemai forma: senesnėse DB gali
 * nebūti `assigned_classes` ar `associated_school_id` stulpelių.
 */
export async function fetchAdminProfile(
  db: { from: (t: string) => any },
  userId: string,
): Promise<AdminProfileRow | null> {
  const variants = [
    "id, role, school_id, associated_school_id, assigned_classes",
    "id, role, school_id, assigned_classes",
    "id, role, school_id, associated_school_id",
    "id, role, school_id",
  ];
  for (const cols of variants) {
    const res = await db.from("profiles").select(cols).eq("id", userId).maybeSingle();
    if (!res.error) return (res.data as AdminProfileRow) ?? null;
    const msg = (res.error.message ?? "").toLowerCase();
    const recoverable =
      msg.includes("does not exist") || msg.includes("schema cache") || msg.includes("column");
    if (!recoverable) throw new Error(res.error.message);
  }
  return null;
}

/** Mokyklos ID, kuris realiai priskirtas paskyrai. */
export function effectiveSchoolId(row: AdminProfileRow | null): string | null {
  return row?.school_id ?? row?.associated_school_id ?? null;
}
