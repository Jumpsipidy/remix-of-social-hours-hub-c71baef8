export type LoginProfile = { role: string };
const ROLES = new Set(["student", "school_admin", "organization", "admin"]);

/** Never invent a student role when a profile request fails after authentication. */
export async function resolveLoginProfile(
  read: () => Promise<LoginProfile | null>,
  repair: () => Promise<LoginProfile | null>,
): Promise<LoginProfile> {
  let profile: LoginProfile | null = null;
  try { profile = await read(); } catch { /* try the authenticated server path */ }
  if (!profile) profile = await repair();
  if (!profile || !ROLES.has(profile.role)) {
    throw new Error("Prisijungimas patvirtintas, bet nepavyko gauti paskyros duomenų. Bandyk tęsti dar kartą.");
  }
  return profile;
}

/** Only an actual rejected password increments the credential challenge counter. */
export function isCredentialRejection(error: unknown): boolean {
  const value = error as { code?: string; message?: string } | null;
  return value?.code === "invalid_credentials" || /invalid.*credentials/i.test(value?.message ?? "");
}

/** TanStack encodes function metadata in development; production IDs may be opaque. */
export function isPublicStatsFunction(id: string): boolean {
  try {
    const metadata = JSON.parse(atob(id));
    return metadata.file?.includes("/public-stats.functions.ts") === true
      && metadata.export?.startsWith("getPublicStats_") === true;
  } catch { return false; }
}