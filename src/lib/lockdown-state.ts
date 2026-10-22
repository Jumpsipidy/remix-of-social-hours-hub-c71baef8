export type PublicLockdownState = {
  lockdown_enabled: boolean;
  lockdown_message: string | null;
  lockdown_code: string | null;
};

/** Never coerce absent or malformed status into an unlocked site. */
export function parseLockdownState(value: unknown): PublicLockdownState | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object" || !("lockdown_enabled" in row) || typeof row.lockdown_enabled !== "boolean") return null;
  return {
    lockdown_enabled: row.lockdown_enabled,
    lockdown_message: "lockdown_message" in row && typeof row.lockdown_message === "string" ? row.lockdown_message : null,
    lockdown_code: "lockdown_code" in row && typeof row.lockdown_code === "string" ? row.lockdown_code : null,
  };
}

export function lockdownBlocks(state: boolean | null, failed: boolean, bypassed: boolean) {
  return !bypassed && (state !== false || failed);
}

export function appendAccessKey(buffer: string, key: string) {
  if (key.length !== 1) return buffer;
  return (buffer + key.toLowerCase()).slice(-"jumpsipidy".length);
}