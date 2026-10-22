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
/** Storage-full errors happen after the password was accepted. */
export function isStorageQuotaError(error: unknown): boolean {
  const value = error as { name?: string; message?: string } | null;
  return value?.name === "QuotaExceededError" || /quota|exceeded the quota/i.test(value?.message ?? "");
}

/** Short, non-sensitive reason shown with a generic login failure for support. */
export function loginFailureReason(error: unknown): string {
  const value = error as { name?: string; code?: string; status?: number; message?: string } | null;
  const raw = value?.code || value?.name || (value?.status ? `HTTP ${value.status}` : "") || "unknown";
  return String(raw).replace(/[^\w .-]/g, "").slice(0, 40) || "unknown";
}

/**
 * The password request can succeed while a later local step fails (full browser
 * storage, a state listener error). Recover the stored session instead of
 * reporting a failed sign-in; never invents a session.
 */
export async function recoverPasswordSignIn(
  signIn: () => Promise<string | null>,
  currentUid: () => Promise<string | null>,
  freeStorage: () => void,
): Promise<string> {
  let first: unknown;
  try {
    const uid = await signIn();
    if (uid) return uid;
    first = new Error("Negautas prisijungimo patvirtinimas. Bandyk dar kartą.");
  } catch (error) {
    if (isCredentialRejection(error)) throw error;
    first = error;
  }
  const existing = await currentUid().catch(() => null);
  if (existing) return existing;
  if (isStorageQuotaError(first)) {
    freeStorage();
    const uid = await signIn();
    if (uid) return uid;
  }
  throw first;
}
